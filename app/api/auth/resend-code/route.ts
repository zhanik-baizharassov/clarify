import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().min(3).max(320).email(),
});

const COOLDOWN_SEC = 60;
const USER_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMPANY_PENDING_TTL_MS = 30 * 60 * 1000;
const COMPANY_PENDING_TTL_MIN = 30;

const GENERIC_RESEND_MESSAGE =
  "Если для этого email доступно подтверждение, новый код будет отправлен, когда это разрешено.";

function getCooldownLeftSec(lastSentAt: Date) {
  return Math.max(
    0,
    Math.ceil((COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt.getTime())) / 1000),
  );
}

function genericResendResponse(
  cooldownSec = COOLDOWN_SEC,
  ttlMinutes?: number,
) {
  return NextResponse.json({
    ok: true,
    cooldownSec,
    ...(typeof ttlMinutes === "number" ? { ttlMinutes } : {}),
    message: GENERIC_RESEND_MESSAGE,
  });
}

async function getPendingMeta(userId: string, fallbackCreatedAt: Date) {
  const verification = await prisma.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const activityAt = verification?.createdAt ?? fallbackCreatedAt;
  const ageMs = Date.now() - activityAt.getTime();
  const cooldownLeftSec = verification
    ? Math.ceil(
        (COOLDOWN_SEC * 1000 - (Date.now() - verification.createdAt.getTime())) /
          1000,
      )
    : 0;

  return {
    expired: ageMs >= USER_PENDING_TTL_MS,
    cooldownLeftSec: Math.max(0, cooldownLeftSec),
  };
}

async function cleanupPendingUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:resend-code:ip",
        key: ip,
        limit: 10,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много запросов на повторную отправку кода. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const email = body.email.trim().toLowerCase();

    const identityRateLimit = await enforceRateLimits([
      {
        scope: "auth:resend-code:email",
        key: email,
        limit: 4,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много запросов на повторную отправку для этого email. Попробуйте позже.",
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
        expiresAt: true,
        lastSentAt: true,
      },
    });

    if (pendingCompany) {
      if (pendingCompany.expiresAt < now) {
        await prisma.pendingCompanySignup.delete({
          where: { id: pendingCompany.id },
        });

        return genericResendResponse();
      }

      const cooldownLeftSec = getCooldownLeftSec(pendingCompany.lastSentAt);

      if (cooldownLeftSec > 0) {
        return genericResendResponse(cooldownLeftSec, COMPANY_PENDING_TTL_MIN);
      }

      const code = generate6DigitCode();

      await prisma.pendingCompanySignup.update({
        where: { id: pendingCompany.id },
        data: {
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + COMPANY_PENDING_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
      });

      await sendEmailVerificationCode(email, code, {
        ttlMinutes: COMPANY_PENDING_TTL_MIN,
      });

      return genericResendResponse(COOLDOWN_SEC, COMPANY_PENDING_TTL_MIN);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        createdAt: true,
        emailVerifiedAt: true,
        blockedUntil: true,
      },
    });

    if (!user) {
      return genericResendResponse();
    }

    if (user.blockedUntil && user.blockedUntil > now) {
      return genericResendResponse();
    }

    if (user.emailVerifiedAt) {
      return genericResendResponse();
    }

    const pendingMeta = await getPendingMeta(user.id, user.createdAt);

    if (pendingMeta.expired) {
      await cleanupPendingUser(user.id);
      return genericResendResponse();
    }

    if (pendingMeta.cooldownLeftSec > 0) {
      return genericResendResponse(pendingMeta.cooldownLeftSec);
    }

    const code = generate6DigitCode();
    const ttlMs = codeTtlMs();
    const ttlMinutes = Math.max(1, Math.round(ttlMs / 60_000));

    await prisma.emailVerification.upsert({
      where: { userId_email: { userId: user.id, email } },
      create: {
        userId: user.id,
        email,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + ttlMs),
        attempts: 0,
      },
      update: {
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + ttlMs),
        attempts: 0,
        createdAt: new Date(),
      },
    });

    await sendEmailVerificationCode(email, code, { ttlMinutes });

    return genericResendResponse(COOLDOWN_SEC, ttlMinutes);
  } catch (err: unknown) {
    console.error("POST /api/auth/resend-code failed:", err);

    const isZod = err instanceof z.ZodError;
    return NextResponse.json(
      { error: isZod ? "Некорректный email" : "Internal Server Error" },
      { status: isZod ? 400 : 500 },
    );
  }
}