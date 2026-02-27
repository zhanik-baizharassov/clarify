import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { assertNoProfanity } from "@/lib/profanity";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];

const Schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  bin: z.string().trim().regex(/^\d{12}$/, "БИН должен состоять из 12 цифр"),
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
  address: z.string().trim().min(5).max(200),
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

    // ✅ profanity-check
    assertNoProfanity(input.companyName, "Название компании");
    assertNoProfanity(input.address, "Адрес компании");

    const existsEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existsEmail) return NextResponse.json({ error: "Email уже занят" }, { status: 409 });

    const existsPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existsPhone) return NextResponse.json({ error: "Телефон уже занят" }, { status: 409 });

    const existsBin = await prisma.company.findFirst({ where: { bin: input.bin } });
    if (existsBin)
      return NextResponse.json({ error: "Компания с таким БИН уже зарегистрирована" }, { status: 409 });

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "COMPANY",
      },
    });

    await prisma.company.create({
      data: {
        name: input.companyName,
        bin: input.bin,
        address: input.address,
        ownerId: user.id,
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
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("COMPANY SIGNUP ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера при регистрации компании" }, { status: 500 });
  }
}