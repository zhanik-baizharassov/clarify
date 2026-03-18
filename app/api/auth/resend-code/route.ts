import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { enforceRateLimits, getRequestIp } from "@/server/security/rate-limit";
import {
  cleanupExpiredPendingSignups,
  maybeRunMaintenanceCleanup,
} from "@/server/maintenance/cleanup";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";
import { enforceSameOrigin } from "@/server/security/csrf";
import {
  COMPANY_PENDING_SIGNUP_COOKIE_NAME,
  USER_PENDING_SIGNUP_COOKIE_NAME,
  isPendingSignupTokenMatch,
} from "@/server/auth/pending-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().min(3).max(320).email(),
});

const COOLDOWN_SEC = 60;
const USER_PENDING_TTL_MS = 30 * 60 * 1000;
const USER_PENDING_TTL_MIN = 30;
const COMPANY_PENDING_TTL_MS = 30 * 60 * 1000;
const COMPANY_PENDING_TTL_MIN = 30;

const GENERIC_RESEND_MESSAGE =
  "Если для этого email доступно подтверждение, новый код будет отправлен, когда это разрешено.";

function getCooldownLeftSec(lastSentAt: Date) {
  return Math.max(
    0,
    Math.ceil(
      (COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt.getTime())) / 1000,
    ),
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

type PendingSnapshot = {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
};

async function rollbackPendingUser(id: string, snapshot: PendingSnapshot) {
  try {
    await prisma.pendingUserSignup.update({
      where: { id },
      data: {
        codeHash: snapshot.codeHash,
        expiresAt: snapshot.expiresAt,
        attempts: snapshot.attempts,
        lastSentAt: snapshot.lastSentAt,
      },
    });
  } catch (err) {
    console.error("ROLLBACK PENDING USER ERROR:", err);
  }
}

async function rollbackPendingCompany(id: string, snapshot: PendingSnapshot) {
  try {
    await prisma.pendingCompanySignup.update({
      where: { id },
      data: {
        codeHash: snapshot.codeHash,
        expiresAt: snapshot.expiresAt,
        attempts: snapshot.attempts,
        lastSentAt: snapshot.lastSentAt,
      },
    });
  } catch (err) {
    console.error("ROLLBACK PENDING COMPANY ERROR:", err);
  }
}

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
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

    await maybeRunMaintenanceCleanup(now);
    await cleanupExpiredPendingSignups(now);

    const store = await cookies();
    const companyPendingToken =
      store.get(COMPANY_PENDING_SIGNUP_COOKIE_NAME)?.value ?? "";
    const userPendingToken =
      store.get(USER_PENDING_SIGNUP_COOKIE_NAME)?.value ?? "";

    const [pendingCompany, pendingUser] = await Promise.all([
      prisma.pendingCompanySignup.findUnique({
        where: { email },
        select: {
          id: true,
          codeHash: true,
          expiresAt: true,
          attempts: true,
          lastSentAt: true,
          pendingTokenHash: true,
        },
      }),
      prisma.pendingUserSignup.findUnique({
        where: { email },
        select: {
          id: true,
          codeHash: true,
          expiresAt: true,
          attempts: true,
          lastSentAt: true,
          pendingTokenHash: true,
        },
      }),
    ]);

    if (
      pendingCompany &&
      (!pendingCompany.pendingTokenHash ||
        isPendingSignupTokenMatch(
          companyPendingToken,
          pendingCompany.pendingTokenHash,
        ))
    ) {
      const cooldownLeftSec = getCooldownLeftSec(pendingCompany.lastSentAt);

      if (cooldownLeftSec > 0) {
        return genericResendResponse(cooldownLeftSec, COMPANY_PENDING_TTL_MIN);
      }

      const code = generate6DigitCode();
      const snapshot: PendingSnapshot = {
        codeHash: pendingCompany.codeHash,
        expiresAt: pendingCompany.expiresAt,
        attempts: pendingCompany.attempts,
        lastSentAt: pendingCompany.lastSentAt,
      };

      await prisma.pendingCompanySignup.update({
        where: { id: pendingCompany.id },
        data: {
          codeHash: hashCode(code),
          expiresAt: new Date(now.getTime() + COMPANY_PENDING_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
      });

      try {
        await sendEmailVerificationCode(email, code, {
          ttlMinutes: COMPANY_PENDING_TTL_MIN,
        });
      } catch (err) {
        await rollbackPendingCompany(pendingCompany.id, snapshot);
        throw err;
      }

      return genericResendResponse(COOLDOWN_SEC, COMPANY_PENDING_TTL_MIN);
    }

    if (
      pendingUser &&
      (!pendingUser.pendingTokenHash ||
        isPendingSignupTokenMatch(
          userPendingToken,
          pendingUser.pendingTokenHash,
        ))
    ) {
      const cooldownLeftSec = getCooldownLeftSec(pendingUser.lastSentAt);

      if (cooldownLeftSec > 0) {
        return genericResendResponse(cooldownLeftSec, USER_PENDING_TTL_MIN);
      }

      const code = generate6DigitCode();
      const snapshot: PendingSnapshot = {
        codeHash: pendingUser.codeHash,
        expiresAt: pendingUser.expiresAt,
        attempts: pendingUser.attempts,
        lastSentAt: pendingUser.lastSentAt,
      };

      await prisma.pendingUserSignup.update({
        where: { id: pendingUser.id },
        data: {
          codeHash: hashCode(code),
          expiresAt: new Date(now.getTime() + USER_PENDING_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
      });

      try {
        await sendEmailVerificationCode(email, code, {
          ttlMinutes: USER_PENDING_TTL_MIN,
        });
      } catch (err) {
        await rollbackPendingUser(pendingUser.id, snapshot);
        throw err;
      }

      return genericResendResponse(COOLDOWN_SEC, USER_PENDING_TTL_MIN);
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
      return genericResendResponse();
    }

    if (user.blockedUntil && user.blockedUntil > now) {
      return genericResendResponse();
    }

    if (user.emailVerifiedAt) {
      return genericResendResponse();
    }

    const existingVerification = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email } },
      select: {
        codeHash: true,
        expiresAt: true,
        attempts: true,
        createdAt: true,
      },
    });

    if (existingVerification) {
      const cooldownLeftSec = getCooldownLeftSec(
        existingVerification.createdAt,
      );

      if (cooldownLeftSec > 0) {
        return genericResendResponse(cooldownLeftSec);
      }
    }

    const code = generate6DigitCode();
    const ttlMs = codeTtlMs();
    const ttlMinutes = Math.max(1, Math.round(ttlMs / 60_000));
    const nextData = {
      codeHash: hashCode(code),
      expiresAt: new Date(now.getTime() + ttlMs),
      attempts: 0,
      createdAt: now,
    };

    await prisma.emailVerification.upsert({
      where: { userId_email: { userId: user.id, email } },
      create: {
        userId: user.id,
        email,
        ...nextData,
      },
      update: nextData,
    });

    try {
      await sendEmailVerificationCode(email, code, { ttlMinutes });
    } catch (err) {
      try {
        if (existingVerification) {
          await prisma.emailVerification.update({
            where: { userId_email: { userId: user.id, email } },
            data: {
              codeHash: existingVerification.codeHash,
              expiresAt: existingVerification.expiresAt,
              attempts: existingVerification.attempts,
              createdAt: existingVerification.createdAt,
            },
          });
        } else {
          await prisma.emailVerification.delete({
            where: { userId_email: { userId: user.id, email } },
          });
        }
      } catch (rollbackErr) {
        console.error("ROLLBACK EMAIL VERIFICATION ERROR:", rollbackErr);
      }

      throw err;
    }

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