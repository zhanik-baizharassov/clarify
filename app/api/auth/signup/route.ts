import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { assertNoProfanity } from "@/server/security/profanity";
import { normalizeKzPhone } from "@/shared/kz/kz";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const COOLDOWN_SEC = 60;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function isP2002(e: any) {
  return e?.code === "P2002";
}

async function cleanupExpiredPendingCompanySignups() {
  await prisma.pendingCompanySignup.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
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
    const raw = Schema.parse(await req.json());

    const email = raw.email.trim().toLowerCase();
    const nickname = raw.nickname.trim();
    const phone = normalizeKzPhone(raw.phone, "Телефон");

    assertNoProfanity(raw.firstName, "Имя");
    assertNoProfanity(raw.lastName, "Фамилия");
    assertNoProfanity(nickname, "Никнейм");
    assertNoProfanity(email, "Email");

    await cleanupExpiredPendingCompanySignups();

    const pendingCompanyByEmail = await prisma.pendingCompanySignup.findUnique({
      where: { email },
      select: { id: true },
    });

    if (pendingCompanyByEmail) {
      return NextResponse.json(
        { error: "Этот email уже используется для бизнес-регистрации" },
        { status: 409 },
      );
    }

    const pendingCompanyByPhone = await prisma.pendingCompanySignup.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (pendingCompanyByPhone) {
      return NextResponse.json(
        { error: "Телефон уже занят" },
        { status: 409 },
      );
    }

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
      if (existsEmail.role !== "USER") {
        return NextResponse.json(
          { error: "Этот email уже используется для другого типа аккаунта" },
          { status: 409 },
        );
      }

      const nicknameOwner = await prisma.user.findFirst({
        where: {
          nickname,
          NOT: { id: existsEmail.id },
        },
        select: { id: true, emailVerifiedAt: true, createdAt: true },
      });

      if (await cleanupIfExpiredPendingUser(nicknameOwner)) {
        // очищён старый конфликт, идём дальше
      } else if (nicknameOwner) {
        return NextResponse.json(
          { error: "Никнейм уже занят" },
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
        // очищён старый конфликт, идём дальше
      } else if (phoneOwner) {
        return NextResponse.json(
          { error: "Телефон уже занят" },
          { status: 409 },
        );
      }

      const pendingMeta = await getPendingMeta(existsEmail.id, existsEmail.createdAt);
      const passwordHash = await bcrypt.hash(raw.password, 10);

      await prisma.user.update({
        where: { id: existsEmail.id },
        data: {
          firstName: raw.firstName,
          lastName: raw.lastName,
          nickname,
          phone,
          passwordHash,
        },
      });

      if (pendingMeta.cooldownLeftSec > 0) {
        return NextResponse.json({
          ok: true,
          needsEmailVerification: true,
          email,
          cooldownSec: pendingMeta.cooldownLeftSec,
          notice:
            "Данные обновлены. Код уже отправлен ранее — проверьте почту или дождитесь окончания таймера.",
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

    const nicknameOwner = await prisma.user.findUnique({
      where: { nickname },
      select: { id: true, emailVerifiedAt: true, createdAt: true },
    });

    if (await cleanupIfExpiredPendingUser(nicknameOwner)) {
      // очищён старый конфликт
    } else if (nicknameOwner) {
      return NextResponse.json(
        { error: "Никнейм уже занят" },
        { status: 409 },
      );
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

    const passwordHash = await bcrypt.hash(raw.password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          firstName: raw.firstName,
          lastName: raw.lastName,
          nickname,
          phone,
          email,
          passwordHash,
          role: "USER",
          emailVerifiedAt: null,
        },
        select: { id: true, email: true },
      });

      const code = generate6DigitCode();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + codeTtlMs());

      await prisma.emailVerification.create({
        data: { userId: user.id, email: user.email, codeHash, expiresAt },
      });

      await sendEmailVerificationCode(user.email, code);

      return NextResponse.json({
        ok: true,
        needsEmailVerification: true,
        email: user.email,
        cooldownSec: COOLDOWN_SEC,
      });
    } catch (e: any) {
      if (isP2002(e)) {
        const target = Array.isArray(e?.meta?.target)
          ? e.meta.target.join(",")
          : String(e?.meta?.target ?? "");

        if (target.includes("email")) {
          return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
        }
        if (target.includes("phone")) {
          return NextResponse.json({ error: "Телефон уже занят" }, { status: 409 });
        }
        if (target.includes("nickname")) {
          return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });
        }

        return NextResponse.json(
          { error: "Уникальное значение уже занято" },
          { status: 409 },
        );
      }

      throw e;
    }
  } catch (err: any) {
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

    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные формы";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при регистрации" },
      { status: 500 },
    );
  }
}