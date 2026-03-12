import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { assertNoProfanity } from "@/server/security/profanity";
import { assertKzCity, normalizeKzPhone } from "@/shared/kz/kz";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import { validateKzAddress } from "@/server/address/validate";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const COOLDOWN_SEC = 60;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function isP2002(e: any) {
  return e?.code === "P2002";
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
    ? Math.ceil((COOLDOWN_SEC * 1000 - (Date.now() - verification.createdAt.getTime())) / 1000)
    : 0;

  return {
    expired: ageMs >= PENDING_TTL_MS,
    cooldownLeftSec: Math.max(0, cooldownLeftSec),
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

  const pendingMeta = await getPendingMeta(candidate.id, candidate.createdAt);
  if (!pendingMeta.expired) return false;

  await cleanupPendingUser(candidate.id);
  return true;
}

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const email = input.email.trim().toLowerCase();

    assertNoProfanity(input.companyName, "Название компании");
    assertNoProfanity(input.address, "Адрес компании");

    const city = assertKzCity(input.city, "Город");
    const phone = normalizeKzPhone(input.phone, "Телефон");

    const { normalizedAddress } = await validateKzAddress({
      city,
      address: input.address,
    });

    let existsEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, role: true, createdAt: true },
    });

    if (await cleanupIfExpiredPendingUser(existsEmail)) {
      existsEmail = null;
    }

    if (existsEmail?.emailVerifiedAt) {
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }

    if (existsEmail && !existsEmail.emailVerifiedAt) {
      if (existsEmail.role !== "COMPANY") {
        return NextResponse.json(
          { error: "Этот email уже используется как пользовательский аккаунт" },
          { status: 409 },
        );
      }

      const phoneOwner = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: existsEmail.id },
        },
        select: { id: true, emailVerifiedAt: true, createdAt: true },
      });

      if (await cleanupIfExpiredPendingUser(phoneOwner)) {
        // очищён старый конфликт
      } else if (phoneOwner) {
        return NextResponse.json(
          { error: "Телефон уже занят" },
          { status: 409 },
        );
      }

      const binOwner = await prisma.company.findUnique({
        where: { bin: input.bin },
        select: {
          ownerId: true,
          owner: {
            select: {
              id: true,
              emailVerifiedAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (binOwner && binOwner.ownerId !== existsEmail.id) {
        if (await cleanupIfExpiredPendingUser(binOwner.owner)) {
          // очищён старый конфликт
        } else {
          return NextResponse.json(
            { error: "Компания с таким БИН уже зарегистрирована" },
            { status: 409 },
          );
        }
      }

      const pendingMeta = await getPendingMeta(existsEmail.id, existsEmail.createdAt);
      const passwordHash = await bcrypt.hash(input.password, 10);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existsEmail!.id },
          data: {
            email,
            phone,
            passwordHash,
          },
        });

        await tx.company.upsert({
          where: { ownerId: existsEmail!.id },
          update: {
            name: input.companyName,
            bin: input.bin,
            address: normalizedAddress,
          },
          create: {
            name: input.companyName,
            bin: input.bin,
            address: normalizedAddress,
            ownerId: existsEmail!.id,
          },
        });
      });

      if (pendingMeta.cooldownLeftSec > 0) {
        return NextResponse.json({
          ok: true,
          needsEmailVerification: true,
          email,
          cooldownSec: pendingMeta.cooldownLeftSec,
          notice: "Данные обновлены. Код уже отправлен ранее — проверьте почту или дождитесь окончания таймера.",
        });
      }

      const code = generate6DigitCode();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + codeTtlMs());

      await prisma.emailVerification.upsert({
        where: { userId_email: { userId: existsEmail.id, email } },
        update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
        create: { userId: existsEmail.id, email, codeHash, expiresAt },
      });

      await sendEmailVerificationCode(email, code);

      return NextResponse.json({
        ok: true,
        needsEmailVerification: true,
        email,
        cooldownSec: COOLDOWN_SEC,
      });
    }

    const phoneOwner = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, emailVerifiedAt: true, createdAt: true },
    });

    if (await cleanupIfExpiredPendingUser(phoneOwner)) {
      // очищён старый конфликт
    } else if (phoneOwner) {
      return NextResponse.json(
        { error: "Телефон уже занят" },
        { status: 409 },
      );
    }

    const binOwner = await prisma.company.findUnique({
      where: { bin: input.bin },
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

    if (binOwner?.owner) {
      if (await cleanupIfExpiredPendingUser(binOwner.owner)) {
        // очищён старый конфликт
      } else {
        return NextResponse.json(
          { error: "Компания с таким БИН уже зарегистрирована" },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const code = generate6DigitCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + codeTtlMs());

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: "COMPANY",
          emailVerifiedAt: null,
        },
        select: { id: true, email: true },
      });

      await tx.company.create({
        data: {
          name: input.companyName,
          bin: input.bin,
          address: normalizedAddress,
          ownerId: user.id,
        },
      });

      await tx.emailVerification.create({
        data: { userId: user.id, email: user.email, codeHash, expiresAt },
      });

      return user;
    });

    await sendEmailVerificationCode(created.email, code);

    return NextResponse.json({
      ok: true,
      needsEmailVerification: true,
      email: created.email,
      cooldownSec: COOLDOWN_SEC,
    });
  } catch (err: any) {
    if (isP2002(err)) {
      const target = Array.isArray(err?.meta?.target)
        ? err.meta.target.join(",")
        : String(err?.meta?.target ?? "");

      if (target.includes("email")) {
        return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
      }

      if (target.includes("phone")) {
        return NextResponse.json(
          { error: "Телефон уже занят" },
          { status: 409 },
        );
      }

      if (target.includes("bin")) {
        return NextResponse.json(
          { error: "Компания с таким БИН уже зарегистрирована" },
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

    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("COMPANY SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при регистрации компании" },
      { status: 500 },
    );
  }
}