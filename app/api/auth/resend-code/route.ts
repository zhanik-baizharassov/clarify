import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
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
const LEGACY_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMPANY_PENDING_TTL_MS = 30 * 60 * 1000;
const COMPANY_PENDING_TTL_MIN = 30;

function getCooldownLeftSec(lastSentAt: Date) {
  return Math.max(
    0,
    Math.ceil((COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt.getTime())) / 1000),
  );
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
    expired: ageMs >= LEGACY_PENDING_TTL_MS,
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
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const email = body.email.trim().toLowerCase();
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

        return NextResponse.json(
          {
            error: "Срок подтверждения бизнес-регистрации истёк. Заполните форму заново.",
            code: "PENDING_REGISTRATION_EXPIRED",
          },
          { status: 410 },
        );
      }

      const cooldownLeftSec = getCooldownLeftSec(pendingCompany.lastSentAt);

      if (cooldownLeftSec > 0) {
        return NextResponse.json(
          {
            error: `Подождите ${cooldownLeftSec}с и попробуйте снова`,
            retryAfterSec: cooldownLeftSec,
          },
          { status: 429 },
        );
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

      return NextResponse.json({
        ok: true,
        cooldownSec: COOLDOWN_SEC,
        ttlMinutes: COMPANY_PENDING_TTL_MIN,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        createdAt: true,
        emailVerifiedAt: true,
        blockedUntil: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Аккаунт с таким email не найден" },
        { status: 404 },
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

    const pendingMeta = await getPendingMeta(user.id, user.createdAt);

    if (pendingMeta.expired) {
      await cleanupPendingUser(user.id);

      return NextResponse.json(
        {
          error: "Срок подтверждения аккаунта истёк. Заполните форму заново.",
          code: "PENDING_REGISTRATION_EXPIRED",
        },
        { status: 410 },
      );
    }

    if (pendingMeta.cooldownLeftSec > 0) {
      return NextResponse.json(
        {
          error: `Подождите ${pendingMeta.cooldownLeftSec}с и попробуйте снова`,
          retryAfterSec: pendingMeta.cooldownLeftSec,
        },
        { status: 429 },
      );
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

    return NextResponse.json({
      ok: true,
      cooldownSec: COOLDOWN_SEC,
      ttlMinutes,
    });
  } catch (err: any) {
    console.error("POST /api/auth/resend-code failed:", err);

    const isZod = err?.name === "ZodError";
    return NextResponse.json(
      { error: isZod ? "Некорректный email" : "Internal Server Error" },
      { status: isZod ? 400 : 500 },
    );
  }
}