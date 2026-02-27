import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertNoProfanity } from "@/lib/profanity";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];
const maxAvatarBytes = 1_000_000; // 1MB

const Schema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),

  nickname: z
    .string()
    .trim()
    .min(3, "Никнейм: минимум 3 символа")
    .max(20, "Никнейм: максимум 20 символов")
    .regex(/^[a-zA-Z0-9_]+$/, "Никнейм: только латиница, цифры и _ (без пробелов)"),

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
  avatarClear: z.boolean().optional(),
});

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();

    const firstName = String(fd.get("firstName") ?? "");
    const lastName = String(fd.get("lastName") ?? "");
    const nickname = String(fd.get("nickname") ?? "");
    const email = String(fd.get("email") ?? "");

    const passwordRaw = fd.get("password");
    const password =
      typeof passwordRaw === "string" && passwordRaw.trim() ? passwordRaw : undefined;

    const avatarClear = String(fd.get("avatarClear") ?? "") === "1";
    const avatar = fd.get("avatar"); // File | string | null

    return { firstName, lastName, nickname, email, password, avatarClear, avatar };
  }

  // fallback JSON
  const json = await req.json();
  return { ...json, avatarClear: Boolean(json?.avatarClear), avatar: null };
}

export async function PATCH(req: Request) {
  try {
    const body = await readBody(req);

    const input = Schema.parse({
      firstName: body.firstName,
      lastName: body.lastName,
      nickname: body.nickname,
      email: body.email,
      password: body.password,
      avatarClear: body.avatarClear,
    });

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    assertNoProfanity(input.firstName, "Имя");
    assertNoProfanity(input.lastName, "Фамилия");
    assertNoProfanity(input.nickname, "Никнейм");

    let passwordHash: string | undefined = undefined;
    if (input.password) {
      if (!/[A-Z]/.test(input.password))
        return NextResponse.json({ error: "Пароль: нужна хотя бы 1 заглавная буква" }, { status: 400 });
      if (!/[a-z]/.test(input.password))
        return NextResponse.json({ error: "Пароль: нужна хотя бы 1 строчная буква" }, { status: 400 });
      if (!/\d/.test(input.password))
        return NextResponse.json({ error: "Пароль: нужна хотя бы 1 цифра" }, { status: 400 });

      passwordHash = await bcrypt.hash(input.password, 10);
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, nickname: true, profileEditCount: true },
    });
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (current.profileEditCount >= 1) {
      return NextResponse.json(
        { error: "Профиль уже изменён. Можно изменить данные только 1 раз." },
        { status: 409 },
      );
    }

    // avatar -> data-url
    let newAvatarUrl: string | null | undefined = undefined;

    if (body.avatar && typeof body.avatar !== "string") {
      const file = body.avatar as File;

      if (!allowedAvatarTypes.includes(file.type)) {
        return NextResponse.json({ error: "Аватар: разрешены только JPG / PNG / WEBP" }, { status: 400 });
      }

      const ab = await file.arrayBuffer();
      if (ab.byteLength > maxAvatarBytes) {
        return NextResponse.json({ error: "Аватар: файл слишком большой (макс. 1MB)" }, { status: 400 });
      }

      const b64 = Buffer.from(ab).toString("base64");
      newAvatarUrl = `data:${file.type};base64,${b64}`;
    } else if (input.avatarClear) {
      newAvatarUrl = null;
    }

    try {
      const updated = await prisma.user.updateMany({
        where: { id: user.id, profileEditCount: 0 },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          nickname: input.nickname,
          email: input.email,
          ...(newAvatarUrl !== undefined ? { avatarUrl: newAvatarUrl } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          profileEditCount: 1,
          profileEditedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        return NextResponse.json(
          { error: "Профиль уже изменён. Можно изменить данные только 1 раз." },
          { status: 409 },
        );
      }
    } catch (e: any) {
      // уникальные ограничения (email/nickname/phone)
      if (e?.code === "P2002") {
        const target = Array.isArray(e?.meta?.target) ? e.meta.target.join(",") : String(e?.meta?.target ?? "");
        if (target.includes("email")) return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
        if (target.includes("nickname")) return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });
        return NextResponse.json({ error: "Уникальное значение уже занято" }, { status: 409 });
      }
      throw e;
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