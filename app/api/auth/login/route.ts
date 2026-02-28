import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true },
    });

    // ✅ если пользователя нет
    if (!user) {
      return NextResponse.json({ error: "Пользователь с таким email не найден" }, { status: 401 });
      // если хочешь короче:
      // return NextResponse.json({ error: "Неверный email" }, { status: 401 });
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);

    // ✅ если пароль неверный
    if (!ok) {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
    }

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
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера при входе" }, { status: 500 });
  }
}