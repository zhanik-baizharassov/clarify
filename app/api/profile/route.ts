// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { assertNoProfanity } from "@/server/security/profanity";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";

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
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Никнейм: только латиница, цифры и _ (без пробелов)",
    ),

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
      `Email должен заканчиваться на: ${allowedTlds
        .map((t) => "." + t)
        .join(", ")}`,
    ),

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
      typeof passwordRaw === "string" && passwordRaw.trim()
        ? passwordRaw
        : undefined;

    const avatarClear = String(fd.get("avatarClear") ?? "") === "1";
    const avatar = fd.get("avatar"); // File | string | null

    return {
      firstName,
      lastName,
      nickname,
      email,
      password,
      avatarClear,
      avatar,
    };
  }

  const json = await req.json();
  return { ...json, avatarClear: Boolean(json?.avatarClear), avatar: null };
}

function isLikelyPrismaUniqueErr(e: any) {
  return e?.code === "P2002";
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

    // profanity-check
    assertNoProfanity(input.firstName, "Имя");
    assertNoProfanity(input.lastName, "Фамилия");
    assertNoProfanity(input.nickname, "Никнейм");

    // ✅ пароль — готовим ДО обращения к БД
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

    // ✅ аватар — готовим ДО обращения к БД
    let newAvatarUrl: string | null | undefined = undefined;

    if (body.avatar && typeof body.avatar !== "string") {
      const file = body.avatar as File;

      if (!allowedAvatarTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Аватар: разрешены только JPG / PNG / WEBP" },
          { status: 400 },
        );
      }

      const ab = await file.arrayBuffer();
      if (ab.byteLength > maxAvatarBytes) {
        return NextResponse.json(
          { error: "Аватар: файл слишком большой (макс. 1MB)" },
          { status: 400 },
        );
      }

      const b64 = Buffer.from(ab).toString("base64");
      newAvatarUrl = `data:${file.type};base64,${b64}`;
    } else if (input.avatarClear) {
      newAvatarUrl = null;
    }

    // текущие значения (нужны, чтобы понять менялся ли email)
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, profileEditCount: true },
    });
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (current.profileEditCount >= 1) {
      return NextResponse.json(
        { error: "Профиль уже изменён. Можно изменить данные только 1 раз." },
        { status: 409 },
      );
    }

    const prevEmail = (current.email ?? "").trim();
    const nextEmail = input.email.trim();
    const isEmailChanged = nextEmail.toLowerCase() !== prevEmail.toLowerCase();

    // ✅ если меняем email — заранее проверим, что он не занят ДРУГИМ пользователем
    // (но всё равно держим P2002 как финальную защиту от гонок)
    if (isEmailChanged) {
      const exists = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (exists && exists.id !== user.id) {
        return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
      }
    }

    // ✅ один атомарный апдейт: защита "1 раз" через where profileEditCount=0
    try {
      const updateRes = await prisma.user.updateMany({
        where: { id: user.id, profileEditCount: 0 },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          nickname: input.nickname,

          // email меняем только тут
          email: nextEmail,

          // если email сменился — сбросим верификацию
          ...(isEmailChanged ? { emailVerifiedAt: null } : {}),

          ...(newAvatarUrl !== undefined ? { avatarUrl: newAvatarUrl } : {}),
          ...(passwordHash ? { passwordHash } : {}),

          profileEditCount: 1,
          profileEditedAt: new Date(),
        },
      });

      if (updateRes.count !== 1) {
        return NextResponse.json(
          { error: "Профиль уже изменён. Можно изменить данные только 1 раз." },
          { status: 409 },
        );
      }
    } catch (e: any) {
      // уникальные ограничения (email/nickname/phone)
      if (isLikelyPrismaUniqueErr(e)) {
        const target = Array.isArray(e?.meta?.target)
          ? e.meta.target.join(",")
          : String(e?.meta?.target ?? "");

        if (target.includes("email"))
          return NextResponse.json({ error: "Email уже занят" }, { status: 409 });

        if (target.includes("nickname"))
          return NextResponse.json({ error: "Никнейм уже занят" }, { status: 409 });

        return NextResponse.json({ error: "Уникальное значение уже занято" }, { status: 409 });
      }
      throw e;
    }

    // ✅ если email поменялся — создаём/обновляем код и отправляем письмо
    // Важно: твой getSessionUser удаляет сессию, если emailVerifiedAt = null,
    // значит после смены email пользователь будет считаться разлогиненным (это ок и безопасно).
    if (isEmailChanged) {
      const code = generate6DigitCode();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + codeTtlMs());

      // upsert по (userId,email)
      await prisma.emailVerification.upsert({
        where: { userId_email: { userId: user.id, email: nextEmail } },
        update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
        create: { userId: user.id, email: nextEmail, codeHash, expiresAt },
      });

      await sendEmailVerificationCode(nextEmail, code);

      return NextResponse.json(
        {
          ok: true,
          needsEmailVerification: true,
          email: nextEmail,
          message:
            "Email изменён. Мы отправили код подтверждения на новую почту. Подтвердите, чтобы снова войти.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const issue = err.issues?.[0];
      const path = issue?.path?.join(".") || "field";
      const msg = issue?.message ?? "Неверные данные";
      return NextResponse.json({ error: `${path}: ${msg}` }, { status: 400 });
    }
    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message?.startsWith("Mail: env")) {
      return NextResponse.json({ error: "Почта не настроена (SMTP env)" }, { status: 500 });
    }

    console.error("PROFILE PATCH ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}