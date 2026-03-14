import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import { assertNoProfanity } from "@/server/security/profanity";
import { assertKzCity, normalizeKzPhone } from "@/shared/kz/kz";
import { generate6DigitCode, hashCode } from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import { validateKzAddress } from "@/server/address/validate";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const COOLDOWN_SEC = 60;
const USER_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMPANY_PENDING_TTL_MS = 30 * 60 * 1000;
const COMPANY_PENDING_TTL_MIN = 30;
const GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR =
  "Не удалось завершить бизнес-регистрацию с указанными данными.";

const Schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  bin: z.string().trim().regex(/^\d{12}$/, "БИН должен состоять из 12 цифр"),
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
    Math.ceil((COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt.getTime())) / 1000),
  );
}

async function cleanupExpiredPendingCompanySignups() {
  await prisma.pendingCompanySignup.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

async function getUserPendingMeta(userId: string, fallbackCreatedAt: Date) {
  const verification = await prisma.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const activityAt = verification?.createdAt ?? fallbackCreatedAt;
  const ageMs = Date.now() - activityAt.getTime();

  return {
    expired: ageMs >= USER_PENDING_TTL_MS,
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

  const pendingMeta = await getUserPendingMeta(candidate.id, candidate.createdAt);
  if (!pendingMeta.expired) return false;

  await cleanupPendingUser(candidate.id);
  return true;
}

export async function POST(req: Request) {
  try {
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

    const { normalizedAddress } = await validateKzAddress({
      city,
      address: input.address,
    });

    await cleanupExpiredPendingCompanySignups();

    let existsEmail = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerifiedAt: true,
        role: true,
        createdAt: true,
      },
    });

    if (await cleanupIfExpiredPendingUser(existsEmail)) {
      existsEmail = null;
    }

    if (existsEmail?.emailVerifiedAt) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    if (existsEmail && !existsEmail.emailVerifiedAt) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    let phoneOwner = await prisma.user.findUnique({
      where: { phone },
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
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const binOwner = await prisma.company.findUnique({
      where: { bin: input.bin },
      select: { id: true },
    });

    if (binOwner) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const pendingPhoneOwner = await prisma.pendingCompanySignup.findUnique({
      where: { phone },
      select: { email: true },
    });

    if (pendingPhoneOwner && pendingPhoneOwner.email !== email) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const pendingBinOwner = await prisma.pendingCompanySignup.findUnique({
      where: { bin: input.bin },
      select: { email: true },
    });

    if (pendingBinOwner && pendingBinOwner.email !== email) {
      return NextResponse.json(
        { error: GENERIC_COMPANY_SIGNUP_CONFLICT_ERROR },
        { status: 409 },
      );
    }

    const existingPending = await prisma.pendingCompanySignup.findUnique({
      where: { email },
      select: { id: true, lastSentAt: true },
    });

    const passwordHash = await bcrypt.hash(input.password, 10);

    if (existingPending) {
      const cooldownLeftSec = getCooldownLeftSec(existingPending.lastSentAt);

      await prisma.pendingCompanySignup.update({
        where: { email },
        data: {
          companyName: input.companyName,
          bin: input.bin,
          city,
          phone,
          address: normalizedAddress,
          passwordHash,
        },
      });

      if (cooldownLeftSec > 0) {
        return NextResponse.json({
          ok: true,
          needsEmailVerification: true,
          email,
          cooldownSec: cooldownLeftSec,
          notice:
            "Данные обновлены. Если подтверждение доступно, используйте уже отправленный код или дождитесь окончания таймера.",
        });
      }
    }

    const code = generate6DigitCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + COMPANY_PENDING_TTL_MS);
    const now = new Date();

    await prisma.pendingCompanySignup.upsert({
      where: { email },
      update: {
        companyName: input.companyName,
        bin: input.bin,
        city,
        phone,
        address: normalizedAddress,
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
      },
      create: {
        companyName: input.companyName,
        bin: input.bin,
        city,
        phone,
        email,
        address: normalizedAddress,
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
      },
    });

    await sendEmailVerificationCode(email, code, {
      ttlMinutes: COMPANY_PENDING_TTL_MIN,
    });

    return NextResponse.json({
      ok: true,
      needsEmailVerification: true,
      email,
      cooldownSec: COOLDOWN_SEC,
    });
  } catch (err: unknown) {
    if (isP2002(err)) {
      const target = getPrismaTarget(err);

      if (
        target.includes("email") ||
        target.includes("phone") ||
        target.includes("bin")
      ) {
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