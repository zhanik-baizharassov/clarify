import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import { hashCode } from "@/server/email/verification";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Код должен быть из 6 цифр"),
});

function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:verify-email:ip",
        key: ip,
        limit: 20,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много попыток подтверждения email. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const parsed = Schema.parse(await req.json());
    const email = parsed.email.trim().toLowerCase();
    const code = parsed.code;

    const identityRateLimit = await enforceRateLimits([
      {
        scope: "auth:verify-email:email",
        key: email,
        limit: 10,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много попыток подтверждения для этого email. Попробуйте позже.",
      },
    ]);

    if (identityRateLimit) {
      return identityRateLimit;
    }

    const now = new Date();

    const pendingCompany = await prisma.pendingCompanySignup.findUnique({
      where: { email },
      select: {
        id: true,
        companyName: true,
        bin: true,
        city: true,
        phone: true,
        email: true,
        address: true,
        passwordHash: true,
        codeHash: true,
        expiresAt: true,
        attempts: true,
      },
    });

    if (pendingCompany) {
      if (pendingCompany.expiresAt < now) {
        await prisma.pendingCompanySignup.delete({
          where: { id: pendingCompany.id },
        });

        return NextResponse.json(
          {
            error: "Срок подтверждения бизнес-регистрации истёк. Заполните форму заново.",
            code: "PENDING_REGISTRATION_EXPIRED",
          },
          { status: 410 },
        );
      }

      if (pendingCompany.attempts >= 5) {
        return NextResponse.json(
          { error: "Слишком много попыток. Отправьте новый код." },
          { status: 400 },
        );
      }

      const ok = hashCode(code) === pendingCompany.codeHash;

      if (!ok) {
        await prisma.pendingCompanySignup.update({
          where: { id: pendingCompany.id },
          data: { attempts: { increment: 1 } },
        });

        return NextResponse.json({ error: "Неверный код" }, { status: 400 });
      }

      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingEmailUser) {
        return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
      }

      const phoneOwner = await prisma.user.findUnique({
        where: { phone: pendingCompany.phone },
        select: { id: true },
      });

      if (phoneOwner) {
        return NextResponse.json(
          { error: "Телефон уже занят" },
          { status: 409 },
        );
      }

      const binOwner = await prisma.company.findUnique({
        where: { bin: pendingCompany.bin },
        select: { id: true },
      });

      if (binOwner) {
        return NextResponse.json(
          { error: "Компания с таким БИН уже зарегистрирована" },
          { status: 409 },
        );
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: pendingCompany.email,
            phone: pendingCompany.phone,
            passwordHash: pendingCompany.passwordHash,
            role: "COMPANY",
            emailVerifiedAt: now,
          },
          select: { id: true },
        });

        await tx.company.create({
          data: {
            name: pendingCompany.companyName,
            bin: pendingCompany.bin,
            address: pendingCompany.address,
            ownerId: user.id,
          },
        });

        await tx.pendingCompanySignup.delete({
          where: { id: pendingCompany.id },
        });

        await tx.session.create({
          data: { userId: user.id, token, expiresAt },
        });
      });

      const res = NextResponse.json({ ok: true });
      setSessionCookie(res, token, expiresAt);
      return res;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerifiedAt: true,
        blockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный email или код" },
        { status: 400 },
      );
    }

    if (user.blockedUntil && user.blockedUntil > now) {
      return NextResponse.json(
        {
          error: "Аккаунт заблокирован модерацией Clarify",
          code: "ACCOUNT_BLOCKED",
        },
        { status: 423 },
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        {
          error: "Email уже подтверждён. Войдите по паролю.",
          code: "ALREADY_VERIFIED",
        },
        { status: 409 },
      );
    }

    const rec = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email } },
      select: { codeHash: true, expiresAt: true, attempts: true },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Неверный email или код" },
        { status: 400 },
      );
    }

    if (rec.expiresAt < now) {
      return NextResponse.json(
        { error: "Код истёк. Нажмите «Отправить заново»." },
        { status: 400 },
      );
    }

    if (rec.attempts >= 5) {
      return NextResponse.json(
        { error: "Слишком много попыток. Отправьте новый код." },
        { status: 400 },
      );
    }

    const ok = hashCode(code) === rec.codeHash;

    if (!ok) {
      await prisma.emailVerification.update({
        where: { userId_email: { userId: user.id, email } },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });

      await tx.emailVerification.delete({
        where: { userId_email: { userId: user.id, email } },
      });

      await tx.session.create({
        data: { userId: user.id, token, expiresAt: sessionExpiresAt },
      });
    });

    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token, sessionExpiresAt);
    return res;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("VERIFY EMAIL ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}