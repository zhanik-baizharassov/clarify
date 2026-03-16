import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import {
  buildSessionToken,
  setSessionCookie,
} from "@/server/auth/session-token";
import {
  cleanupExpiredPendingSignups,
  maybeRunMaintenanceCleanup,
} from "@/server/maintenance/cleanup";
import { isCodeHashMatch } from "@/server/email/verification";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Код должен быть из 6 цифр"),
});

const GENERIC_VERIFY_ERROR =
  "Не удалось подтвердить email. Запросите новый код и попробуйте снова.";

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

    await maybeRunMaintenanceCleanup(now);
    await cleanupExpiredPendingSignups(now);

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
      if (pendingCompany.expiresAt < now || pendingCompany.attempts >= 5) {
        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const ok = isCodeHashMatch(code, pendingCompany.codeHash);

      if (!ok) {
        await prisma.pendingCompanySignup.update({
          where: { id: pendingCompany.id },
          data: { attempts: { increment: 1 } },
        });

        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const [existingEmailUser, phoneOwner, binOwner] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { phone: pendingCompany.phone },
          select: { id: true },
        }),
        prisma.company.findUnique({
          where: { bin: pendingCompany.bin },
          select: { id: true },
        }),
      ]);

      if (existingEmailUser || phoneOwner || binOwner) {
        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const sessionToken = buildSessionToken(now);

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
          data: {
            userId: user.id,
            tokenHash: sessionToken.tokenHash,
            expiresAt: sessionToken.expiresAt,
          },
        });
      });

      const res = NextResponse.json({ ok: true });
      setSessionCookie(res, sessionToken.rawToken, sessionToken.expiresAt);
      return res;
    }

    const pendingUser = await prisma.pendingUserSignup.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        email: true,
        passwordHash: true,
        codeHash: true,
        expiresAt: true,
        attempts: true,
      },
    });

    if (pendingUser) {
      if (pendingUser.expiresAt < now || pendingUser.attempts >= 5) {
        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const ok = isCodeHashMatch(code, pendingUser.codeHash);

      if (!ok) {
        await prisma.pendingUserSignup.update({
          where: { id: pendingUser.id },
          data: { attempts: { increment: 1 } },
        });

        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const [existingEmailUser, existingPhoneUser, existingNicknameUser] =
        await Promise.all([
          prisma.user.findUnique({
            where: { email },
            select: { id: true },
          }),
          prisma.user.findUnique({
            where: { phone: pendingUser.phone },
            select: { id: true },
          }),
          prisma.user.findUnique({
            where: { nickname: pendingUser.nickname },
            select: { id: true },
          }),
        ]);

      if (existingEmailUser || existingPhoneUser || existingNicknameUser) {
        return NextResponse.json(
          { error: GENERIC_VERIFY_ERROR },
          { status: 400 },
        );
      }

      const sessionToken = buildSessionToken(now);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName: pendingUser.firstName,
            lastName: pendingUser.lastName,
            nickname: pendingUser.nickname,
            phone: pendingUser.phone,
            email: pendingUser.email,
            passwordHash: pendingUser.passwordHash,
            role: "USER",
            emailVerifiedAt: now,
          },
          select: { id: true },
        });

        await tx.pendingUserSignup.delete({
          where: { id: pendingUser.id },
        });

        await tx.session.create({
          data: {
            userId: user.id,
            tokenHash: sessionToken.tokenHash,
            expiresAt: sessionToken.expiresAt,
          },
        });
      });

      const res = NextResponse.json({ ok: true });
      setSessionCookie(res, sessionToken.rawToken, sessionToken.expiresAt);
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
        { error: GENERIC_VERIFY_ERROR },
        { status: 400 },
      );
    }

    if (user.blockedUntil && user.blockedUntil > now) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json(
        { error: GENERIC_VERIFY_ERROR },
        { status: 400 },
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { error: GENERIC_VERIFY_ERROR },
        { status: 400 },
      );
    }

    const rec = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email } },
      select: { codeHash: true, expiresAt: true, attempts: true },
    });

    if (!rec || rec.expiresAt < now || rec.attempts >= 5) {
      return NextResponse.json(
        { error: GENERIC_VERIFY_ERROR },
        { status: 400 },
      );
    }

    const ok = isCodeHashMatch(code, rec.codeHash);

    if (!ok) {
      await prisma.emailVerification.update({
        where: { userId_email: { userId: user.id, email } },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json(
        { error: GENERIC_VERIFY_ERROR },
        { status: 400 },
      );
    }

    const sessionToken = buildSessionToken(now);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });

      await tx.emailVerification.delete({
        where: { userId_email: { userId: user.id, email } },
      });

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: sessionToken.tokenHash,
          expiresAt: sessionToken.expiresAt,
        },
      });
    });

    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, sessionToken.rawToken, sessionToken.expiresAt);
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