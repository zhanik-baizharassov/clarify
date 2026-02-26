import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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

    const existsEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existsEmail) return NextResponse.json({ error: "Email уже занят" }, { status: 409 });

    const existsPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existsPhone) return NextResponse.json({ error: "Телефон уже занят" }, { status: 409 });

    const existsNick = await prisma.user.findUnique({ where: { nickname: input.nickname } });
    if (existsNick) return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        nickname: input.nickname,
        phone: input.phone,
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        passwordHash,
        role: "USER",
      },
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return res;
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const first = err.issues?.[0]?.message ?? "Неверные данные формы";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера при регистрации" }, { status: 500 });
  }
}