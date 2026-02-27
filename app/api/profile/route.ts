import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertNoProfanity } from "@/lib/profanity";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];

const Schema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .refine((v) => {
      const m = v.toLowerCase().match(/\.([a-z]{2,})$/);
      if (!m) return false;
      return allowedTlds.includes(m[1]);
    }, `Email должен заканчиваться на: ${allowedTlds.map((t) => "." + t).join(", ")}`),
  password: z.string().min(8).max(200).optional(),
  avatarUrl: z.string().trim().optional(), // можно пустую строку
});

export async function PATCH(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // profanity check
    assertNoProfanity(input.firstName, "Имя");
    assertNoProfanity(input.lastName, "Фамилия");

    // password checks (если меняют)
    let passwordHash: string | undefined = undefined;
    if (input.password) {
      if (!/[A-Z]/.test(input.password)) return NextResponse.json({ error: "Пароль: нужна хотя бы 1 заглавная буква" }, { status: 400 });
      if (!/[a-z]/.test(input.password)) return NextResponse.json({ error: "Пароль: нужна хотя бы 1 строчная буква" }, { status: 400 });
      if (!/\d/.test(input.password)) return NextResponse.json({ error: "Пароль: нужна хотя бы 1 цифра" }, { status: 400 });

      passwordHash = await bcrypt.hash(input.password, 10);
    }

    // email unique (если меняют)
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, profileEditCount: true },
    });
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (current.profileEditCount >= 1) {
      return NextResponse.json({ error: "Профиль уже изменён. Можно изменить данные только 1 раз." }, { status: 409 });
    }

    if (input.email !== current.email) {
      const exists = await prisma.user.findUnique({ where: { email: input.email } });
      if (exists) return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }

    const avatarUrl = (input.avatarUrl ?? "").trim() || null;

    // атомарно: редактирование только 1 раз
    const updated = await prisma.user.updateMany({
      where: { id: user.id, profileEditCount: 0 },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        avatarUrl,
        ...(passwordHash ? { passwordHash } : {}),
        profileEditCount: 1,
        profileEditedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json({ error: "Профиль уже изменён. Можно изменить данные только 1 раз." }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PROFILE PATCH ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}