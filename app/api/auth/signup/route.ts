import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { enforceRateLimits, getRequestIp } from "@/server/security/rate-limit";
import {
  cleanupExpiredPendingSignups,
  maybeRunMaintenanceCleanup,
} from "@/server/maintenance/cleanup";
import { assertNoProfanity } from "@/server/security/profanity";
import { normalizeKzPhone } from "@/shared/kz/kz";
import { generate6DigitCode, hashCode } from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import { enforceSameOrigin } from "@/server/security/csrf";
import {
  buildPendingSignupToken,
  setPendingSignupCookie,
} from "@/server/auth/pending-signup";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const COOLDOWN_SEC = 60;
const USER_PENDING_TTL_MS = 30 * 60 * 1000;
const USER_PENDING_TTL_MIN = 30;
const GENERIC_SIGNUP_CONFLICT_ERROR =
  "Не удалось завершить регистрацию с указанными данными.";

const Schema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  nickname: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Ник: только латиница/цифры/._-"),
  phone: z.string().trim().min(5).max(30),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .refine(
      (v) => {
        const m = v.toLowerCase().match(/\.([a-z]{2,})$/);
        if (!m) return false;
        return allowedTlds.includes(m[1]);
      },
      `Email должен заканчиваться на: ${allowedTlds.map((t) => "." + t).join(", ")}`,
    ),
  password: z
    .string()
    .min(8)
    .max(200)
    .refine((v) => /[A-Z]/.test(v), "Пароль: нужна хотя бы 1 заглавная буква")
    .refine((v) => /[a-z]/.test(v), "Пароль: нужна хотя бы 1 строчная буква")
    .refine((v) => /\d/.test(v), "Пароль: нужна хотя бы 1 цифра"),
});

function isP2002(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

function getPrismaTarget(err: unknown) {
  if (typeof err !== "object" || err === null) return "";

  const meta = "meta" in err ? (err as { meta?: unknown }).meta : undefined;
  if (typeof meta !== "object" || meta === null) return "";

  const target =
    "target" in meta ? (meta as { target?: unknown }).target : undefined;

  if (Array.isArray(target)) {
    return target.map((item) => String(item)).join(",");
  }

  return typeof target === "string" ? target : "";
}

function getCooldownLeftSec(lastSentAt: Date) {
  return Math.max(
    0,
    Math.ceil(
      (COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt.getTime())) / 1000,
    ),
  );
}

function buildPendingUserLockedResponse(email: string, lastSentAt: Date) {
  const cooldownSec = getCooldownLeftSec(lastSentAt);

  return NextResponse.json({
    ok: true,
    needsEmailVerification: true,
    email,
    cooldownSec,
    ttlMinutes: USER_PENDING_TTL_MIN,
    notice:
      cooldownSec > 0
        ? "Регистрация уже ожидает подтверждения. Данные зафиксированы до подтверждения email. Чтобы изменить email или другие данные, начните регистрацию заново."
        : "Регистрация уже ожидает подтверждения. Данные зафиксированы до подтверждения email. Можно подтвердить email текущим кодом или запросить новый. Чтобы изменить email или другие данные, начните регистрацию заново.",
  });
}

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:signup:ip",
        key: ip,
        limit: 5,
        windowSec: 10 * 60,
        errorMessage: "Слишком много попыток регистрации. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const raw = Schema.parse(await req.json());

    const email = raw.email.trim().toLowerCase();
    const nickname = raw.nickname.trim();
    const phone = normalizeKzPhone(raw.phone, "Телефон");

    const identityRateLimit = await enforceRateLimits([
      {
        scope: "auth:signup:email",
        key: email,
        limit: 3,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток регистрации для этого email. Попробуйте позже.",
      },
      {
        scope: "auth:signup:phone",
        key: phone,
        limit: 3,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток регистрации для этого телефона. Попробуйте позже.",
      },
    ]);

    if (identityRateLimit) {
      return identityRateLimit;
    }

    const now = new Date();

    await maybeRunMaintenanceCleanup(now);
    await cleanupExpiredPendingSignups(now);

    assertNoProfanity(raw.firstName, "Имя");
    assertNoProfanity(raw.lastName, "Фамилия");
    assertNoProfanity(nickname, "Никнейм");
    assertNoProfanity(email, "Email");

    const [
      pendingCompanyByEmail,
      pendingCompanyByPhone,
      existingUserByEmail,
      existingUserByPhone,
      existingUserByNickname,
      existingPendingByEmail,
      pendingNicknameOwner,
      pendingPhoneOwner,
    ] = await Promise.all([
      prisma.pendingCompanySignup.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.pendingCompanySignup.findUnique({
        where: { phone },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { nickname },
        select: { id: true },
      }),
      prisma.pendingUserSignup.findUnique({
        where: { email },
        select: { id: true, lastSentAt: true },
      }),
      prisma.pendingUserSignup.findUnique({
        where: { nickname },
        select: { id: true, email: true },
      }),
      prisma.pendingUserSignup.findUnique({
        where: { phone },
        select: { id: true, email: true },
      }),
    ]);

    if (existingPendingByEmail) {
      return buildPendingUserLockedResponse(
        email,
        existingPendingByEmail.lastSentAt,
      );
    }

    if (pendingCompanyByEmail || pendingCompanyByPhone) {
      return NextResponse.json(
        { error: GENERIC_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (existingUserByEmail || existingUserByPhone) {
      return NextResponse.json(
        { error: GENERIC_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (existingUserByNickname) {
      return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });
    }

    if (
      pendingNicknameOwner &&
      pendingNicknameOwner.email.toLowerCase() !== email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });
    }

    if (
      pendingPhoneOwner &&
      pendingPhoneOwner.email.toLowerCase() !== email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: GENERIC_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(raw.password, 10);

    const code = generate6DigitCode();
    const expiresAt = new Date(now.getTime() + USER_PENDING_TTL_MS);
    const pendingToken = buildPendingSignupToken();

    try {
      await prisma.pendingUserSignup.create({
        data: {
          firstName: raw.firstName,
          lastName: raw.lastName,
          nickname,
          phone,
          email,
          passwordHash,
          codeHash: hashCode(code),
          pendingTokenHash: pendingToken.tokenHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
        },
      });
    } catch (e: unknown) {
      if (isP2002(e)) {
        const target = getPrismaTarget(e);

        if (target.includes("nickname")) {
          return NextResponse.json(
            { error: "Никнейм уже занят" },
            { status: 409 },
          );
        }

        if (target.includes("email")) {
          const pending = await prisma.pendingUserSignup.findUnique({
            where: { email },
            select: { lastSentAt: true },
          });

          if (pending) {
            return buildPendingUserLockedResponse(email, pending.lastSentAt);
          }

          return NextResponse.json(
            { error: GENERIC_SIGNUP_CONFLICT_ERROR },
            { status: 409 },
          );
        }

        if (target.includes("phone")) {
          return NextResponse.json(
            { error: GENERIC_SIGNUP_CONFLICT_ERROR },
            { status: 409 },
          );
        }

        return NextResponse.json(
          { error: "Уникальное значение уже занято" },
          { status: 409 },
        );
      }

      throw e;
    }

    try {
      await sendEmailVerificationCode(email, code, {
        ttlMinutes: USER_PENDING_TTL_MIN,
      });
    } catch (e) {
      await prisma.pendingUserSignup
        .deleteMany({
          where: { email },
        })
        .catch((cleanupErr) => {
          console.error("SIGNUP PENDING CLEANUP ERROR:", cleanupErr);
        });

      throw e;
    }

    const res = NextResponse.json({
      ok: true,
      needsEmailVerification: true,
      email,
      cooldownSec: COOLDOWN_SEC,
      ttlMinutes: USER_PENDING_TTL_MIN,
    });

    setPendingSignupCookie(res, "user", pendingToken.rawToken, expiresAt);

    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("номер") || err.message.includes("Телефон")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message.startsWith("Mail: env")) {
        return NextResponse.json(
          { error: "Почта не настроена (SMTP env)" },
          { status: 500 },
        );
      }
    }

    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные формы";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && err.message.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при регистрации" },
      { status: 500 },
    );
  }
}