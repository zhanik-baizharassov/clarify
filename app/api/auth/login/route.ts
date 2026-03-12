import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

function formatBlockDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        passwordHash: true,
        emailVerifiedAt: true,
        role: true,
        blockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь с таким email не найден" },
        { status: 401 },
      );
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Подтвердите email: введите код из письма и попробуйте снова" },
        { status: 403 },
      );
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return NextResponse.json(
        {
          error: `Аккаунт временно заблокирован до ${formatBlockDate(user.blockedUntil)}`,
        },
        { status: 403 },
      );
    }

    if (user.role === "COMPANY") {
      const company = await prisma.company.findUnique({
        where: { ownerId: user.id },
        select: {
          blockedUntil: true,
        },
      });

      if (company?.blockedUntil && company.blockedUntil > new Date()) {
        return NextResponse.json(
          {
            error: `Компания временно заблокирована до ${formatBlockDate(company.blockedUntil)}`,
          },
          { status: 403 },
        );
      }
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);

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
    return NextResponse.json(
      { error: "Ошибка сервера при входе" },
      { status: 500 },
    );
  }
}