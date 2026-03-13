import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import { hashCode } from "@/server/email/verification";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Код должен быть из 6 цифр"),
});

const LEGACY_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function getLegacyPendingMeta(userId: string, fallbackCreatedAt: Date) {
  const verification = await prisma.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const activityAt = verification?.createdAt ?? fallbackCreatedAt;
  const ageMs = Date.now() - activityAt.getTime();

  return {
    expired: ageMs >= LEGACY_PENDING_TTL_MS,
  };
}

async function cleanupPendingUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}

async function cleanupIfExpiredPendingUser(candidate: {
  id: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
} | null) {
  if (!candidate || candidate.emailVerifiedAt) return false;

  const pendingMeta = await getLegacyPendingMeta(candidate.id, candidate.createdAt);
  if (!pendingMeta.expired) return false;

  await cleanupPendingUser(candidate.id);
  return true;
}

export async function POST(req: Request) {
  try {
    const parsed = Schema.parse(await req.json());
    const email = parsed.email.trim().toLowerCase();
    const code = parsed.code;
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

      let existingEmailUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      if (await cleanupIfExpiredPendingUser(existingEmailUser)) {
        existingEmailUser = null;
      }

      if (existingEmailUser) {
        return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
      }

      let phoneOwner = await prisma.user.findUnique({
        where: { phone: pendingCompany.phone },
        select: {
          id: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      if (await cleanupIfExpiredPendingUser(phoneOwner)) {
        phoneOwner = null;
      }

      if (phoneOwner) {
        return NextResponse.json(
          { error: "Телефон уже занят" },
          { status: 409 },
        );
      }

      let binOwner = await prisma.company.findUnique({
        where: { bin: pendingCompany.bin },
        select: {
          owner: {
            select: {
              id: true,
              emailVerifiedAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (binOwner?.owner && (await cleanupIfExpiredPendingUser(binOwner.owner))) {
        binOwner = null;
      }

      if (binOwner?.owner) {
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
        role: true,
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

    if (user.role === "COMPANY") {
      const company = await prisma.company.findUnique({
        where: { ownerId: user.id },
        select: { blockedUntil: true },
      });

      if (company?.blockedUntil && company.blockedUntil > now) {
        return NextResponse.json(
          {
            error: "Компания заблокирована модерацией Clarify",
            code: "COMPANY_BLOCKED",
          },
          { status: 423 },
        );
      }
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
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("VERIFY EMAIL ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}