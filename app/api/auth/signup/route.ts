import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { assertNoProfanity } from "@/server/security/profanity";
import { normalizeKzPhone } from "@/shared/kz/kz";
import { generate6DigitCode, hashCode, codeTtlMs } from "@/server/email/verification";
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
    .refine((v) => {
      const m = v.toLowerCase().match(/\.([a-z]{2,})$/);
      if (!m) return false;
      return allowedTlds.includes(m[1]);
    }, `Email должен заканчиваться на: ${allowedTlds.map((t) => "." + t).join(", ")}`),
  password: z
    .string()
    .min(8)
    .max(200)
    .refine((v) => /[A-Z]/.test(v), "Пароль: нужна хотя бы 1 заглавная буква")
    .refine((v) => /[a-z]/.test(v), "Пароль: нужна хотя бы 1 строчная буква")
    .refine((v) => /\d/.test(v), "Пароль: нужна хотя бы 1 цифра"),
});

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    assertNoProfanity(input.firstName, "Имя");
    assertNoProfanity(input.lastName, "Фамилия");
    assertNoProfanity(input.nickname, "Никнейм");
    assertNoProfanity(input.email, "Email");

    const phone = normalizeKzPhone(input.phone, "Телефон");

    // 1) если email уже есть
    const existsEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, emailVerifiedAt: true },
    });

    // если email уже подтверждён — обычный конфликт
    if (existsEmail?.emailVerifiedAt) {
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }

    // если email есть, но НЕ подтверждён — просто переотправим код
    if (existsEmail && !existsEmail.emailVerifiedAt) {
      // минимальный анти-спам: если код отправляли недавно — просим подождать
      const last = await prisma.emailVerification.findUnique({
        where: { userId_email: { userId: existsEmail.id, email: input.email } },
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
        where: { userId_email: { userId: existsEmail.id, email: input.email } },
        update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
        create: { userId: existsEmail.id, email: input.email, codeHash, expiresAt },
      });

      await sendEmailVerificationCode(input.email, code);

      return NextResponse.json({ ok: true, needsEmailVerification: true, email: input.email });
    }

    // 2) проверки уникальности (для нового пользователя)
    const existsPhone = await prisma.user.findUnique({ where: { phone } });
    if (existsPhone) return NextResponse.json({ error: "Телефон уже занят" }, { status: 409 });

    const existsNick = await prisma.user.findFirst({ where: { nickname: input.nickname } });
    if (existsNick) return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        nickname: input.nickname,
        phone,
        email: input.email,
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

    // ✅ не выдаём session cookie тут — сначала подтверждение
    return NextResponse.json({ ok: true, needsEmailVerification: true, email: user.email });
  } catch (err: any) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("номер") || err.message.includes("Телефон")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message.startsWith("Mail: env")) {
        return NextResponse.json({ error: "Почта не настроена (SMTP env)" }, { status: 500 });
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
    return NextResponse.json({ error: "Ошибка сервера при регистрации" }, { status: 500 });
  }
}
