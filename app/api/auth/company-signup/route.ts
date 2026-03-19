import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { enforceRateLimits, getRequestIp } from "@/server/security/rate-limit";
import { cleanupExpiredPendingSignups } from "@/server/maintenance/cleanup";
import { assertNoProfanity } from "@/server/security/profanity";
import { assertKzCity, normalizeKzPhone } from "@/shared/kz/kz";
import { generate6DigitCode, hashCode } from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import { validateKzAddress } from "@/server/address/validate";
import { enforceSameOrigin } from "@/server/security/csrf";
import {
  buildPendingSignupToken,
  setPendingSignupCookie,
} from "@/server/auth/pending-signup";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const COOLDOWN_SEC = 60;
const COMPANY_PENDING_TTL_MS = 30 * 60 * 1000;
const COMPANY_PENDING_TTL_MIN = 30;
const GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR =
  "Не удалось завершить бизнес-регистрацию с указанными данными.";

const Schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  bin: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "БИН должен состоять из 12 цифр"),
  city: z.string().trim().min(2).max(60),
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
  address: z.string().trim().min(5).max(200),
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

function buildPendingCompanyLockedResponse(email: string, lastSentAt: Date) {
  const cooldownSec = getCooldownLeftSec(lastSentAt);

  return NextResponse.json({
    ok: true,
    needsEmailVerification: true,
    email,
    cooldownSec,
    ttlMinutes: COMPANY_PENDING_TTL_MIN,
    notice:
      cooldownSec > 0
        ? "Бизнес-регистрация уже ожидает подтверждения. Данные зафиксированы до подтверждения email. Чтобы изменить email или другие данные, начните регистрацию заново."
        : "Бизнес-регистрация уже ожидает подтверждения. Данные зафиксированы до подтверждения email. Можно подтвердить email текущим кодом или запросить новый. Чтобы изменить email или другие данные, начните регистрацию заново.",
  });
}

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:company-signup:ip",
        key: ip,
        limit: 5,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много попыток бизнес-регистрации. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const input = Schema.parse(await req.json());

    const email = input.email.trim().toLowerCase();

    assertNoProfanity(input.companyName, "Название компании");
    assertNoProfanity(input.address, "Адрес компании");

    const city = assertKzCity(input.city, "Город");
    const phone = normalizeKzPhone(input.phone, "Телефон");

    const identityRateLimit = await enforceRateLimits([
      {
        scope: "auth:company-signup:email",
        key: email,
        limit: 3,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток бизнес-регистрации для этого email. Попробуйте позже.",
      },
      {
        scope: "auth:company-signup:phone",
        key: phone,
        limit: 3,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток бизнес-регистрации для этого телефона. Попробуйте позже.",
      },
      {
        scope: "auth:company-signup:bin",
        key: input.bin,
        limit: 3,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток бизнес-регистрации для этого БИН. Попробуйте позже.",
      },
    ]);

    if (identityRateLimit) {
      return identityRateLimit;
    }

    const now = new Date();

    await cleanupExpiredPendingSignups(now);

    const [
      pendingUserByEmail,
      pendingUserByPhone,
      existsEmail,
      phoneOwner,
      binOwner,
      pendingPhoneOwner,
      pendingBinOwner,
      existingPending,
    ] = await Promise.all([
      prisma.pendingUserSignup.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.pendingUserSignup.findUnique({
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
      prisma.company.findUnique({
        where: { bin: input.bin },
        select: { id: true },
      }),
      prisma.pendingCompanySignup.findUnique({
        where: { phone },
        select: { email: true },
      }),
      prisma.pendingCompanySignup.findUnique({
        where: { bin: input.bin },
        select: { email: true },
      }),
      prisma.pendingCompanySignup.findUnique({
        where: { email },
        select: { id: true, lastSentAt: true },
      }),
    ]);

    if (existingPending) {
      return buildPendingCompanyLockedResponse(email, existingPending.lastSentAt);
    }

    if (pendingUserByEmail || pendingUserByPhone) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (existsEmail || phoneOwner || binOwner) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (pendingPhoneOwner && pendingPhoneOwner.email !== email) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (pendingBinOwner && pendingBinOwner.email !== email) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const { normalizedAddress } = await validateKzAddress({
      city,
      address: input.address,
    });

    const passwordHash = await bcrypt.hash(input.password, 10);

    const code = generate6DigitCode();
    const expiresAt = new Date(now.getTime() + COMPANY_PENDING_TTL_MS);
    const pendingToken = buildPendingSignupToken();

    try {
      await prisma.pendingCompanySignup.create({
        data: {
          companyName: input.companyName,
          bin: input.bin,
          city,
          phone,
          email,
          address: normalizedAddress,
          passwordHash,
          codeHash: hashCode(code),
          pendingTokenHash: pendingToken.tokenHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
        },
      });
    } catch (err: unknown) {
      if (isP2002(err)) {
        const target = getPrismaTarget(err);

        if (target.includes("email")) {
          const pending = await prisma.pendingCompanySignup.findUnique({
            where: { email },
            select: { lastSentAt: true },
          });

          if (pending) {
            return buildPendingCompanyLockedResponse(email, pending.lastSentAt);
          }

          return NextResponse.json(
            { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
            { status: 409 },
          );
        }

        if (target.includes("phone") || target.includes("bin")) {
          return NextResponse.json(
            { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
            { status: 409 },
          );
        }

        return NextResponse.json(
          { error: "Уникальное значение уже занято" },
          { status: 409 },
        );
      }

      throw err;
    }

    try {
      await sendEmailVerificationCode(email, code, {
        ttlMinutes: COMPANY_PENDING_TTL_MIN,
      });
    } catch (e) {
      await prisma.pendingCompanySignup
        .deleteMany({
          where: { email },
        })
        .catch((cleanupErr) => {
          console.error(
            "COMPANY SIGNUP PENDING CLEANUP ERROR:",
            cleanupErr,
          );
        });

      throw e;
    }

    const res = NextResponse.json({
      ok: true,
      needsEmailVerification: true,
      email,
      cooldownSec: COOLDOWN_SEC,
      ttlMinutes: COMPANY_PENDING_TTL_MIN,
    });

    setPendingSignupCookie(res, "company", pendingToken.rawToken, expiresAt);

    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.message) {
      if (
        err.message.includes("номер") ||
        err.message.includes("Телефон") ||
        err.message.includes("Город") ||
        err.message.includes("Адрес") ||
        err.message.includes("2GIS")
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      if (
        err.message.includes("SMTP_") ||
        err.message.includes("MAIL_") ||
        err.message.includes("env")
      ) {
        return NextResponse.json(
          { error: "Почта не настроена (SMTP env)" },
          { status: 500 },
        );
      }
    }

    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && err.message.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("COMPANY SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при регистрации компании" },
      { status: 500 },
    );
  }
}