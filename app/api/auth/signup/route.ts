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

    // 1) если email уже есть
    const existsEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, role: true },
    });

    // если email уже подтверждён — обычный конфликт
    if (existsEmail?.emailVerifiedAt) {
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }

    // если email есть, но НЕ подтверждён
    if (existsEmail && !existsEmail.emailVerifiedAt) {
      // ✅ важная защита: не даём дергать коды, если это НЕ USER
      if (existsEmail.role !== "USER") {
        return NextResponse.json(
          { error: "Этот email уже используется для другого типа аккаунта" },
          { status: 409 },
        );
      }

      // анти-спам: если код отправляли недавно — просим подождать
      const last = await prisma.emailVerification.findUnique({
        where: { userId_email: { userId: existsEmail.id, email } },
        select: { createdAt: true },
      });

      if (last && Date.now() - new Date(last.createdAt).getTime() < 60_000) {
        return NextResponse.json(
          { error: "Код уже отправлен. Попробуйте через минуту." },
          { status: 429 },
        );
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
      });
    }

    // 2) новый пользователь — создаём
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
      });
    } catch (e: any) {
      // ✅ финальная защита от гонок по уникальным индексам
      if (isP2002(e)) {
        const target = Array.isArray(e?.meta?.target)
          ? e.meta.target.join(",")
          : String(e?.meta?.target ?? "");

        if (target.includes("email"))
          return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
        if (target.includes("phone"))
          return NextResponse.json({ error: "Телефон уже занят" }, { status: 409 });
        if (target.includes("nickname"))
          return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });

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