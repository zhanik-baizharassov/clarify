import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { clearSessionCookie } from "@/server/auth/session-token";
import { enforceSameOrigin } from "@/server/security/csrf";
import { assertNoProfanity } from "@/server/security/profanity";
import {
  generate6DigitCode,
  hashCode,
  codeTtlMs,
} from "@/server/email/verification";
import { sendEmailVerificationCode } from "@/server/email/mailer";

export const runtime = "nodejs";

const allowedTlds = ["ru", "com", "kz", "net", "org", "io"];
const GENERIC_EMAIL_CHANGE_CONFLICT_ERROR =
  "Этот email сейчас нельзя использовать. Укажите другой email.";

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
  currentPassword: z.string().min(1).max(200).optional(),
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

    const currentPasswordRaw = fd.get("currentPassword");
    const currentPassword =
      typeof currentPasswordRaw === "string" && currentPasswordRaw.trim()
        ? currentPasswordRaw
        : undefined;

    return {
      firstName,
      lastName,
      nickname,
      email,
      password,
      currentPassword,
    };
  }

  const json = await req.json();
  return {
    ...json,
    currentPassword:
      typeof json?.currentPassword === "string" && json.currentPassword.trim()
        ? json.currentPassword
        : undefined,
  };
}

function isLikelyPrismaUniqueErr(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

function getPrismaTarget(err: unknown) {
  if (typeof err !== "object" || err === null) return "";

  const meta = "meta" in err ? (err as { meta?: unknown }).meta : undefined;
  if (typeof meta !== "object" || meta === null) return "";

  const target =
    "target" in meta ? (meta as { target?: unknown }).target : undefined;

  if (Array.isArray(target)) {
    return target.map((item) => String(item)).join(",");
  }

  return typeof target === "string" ? target : "";
}

export async function PATCH(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;

    const body = await readBody(req);

    const input = Schema.parse({
      firstName: body.firstName,
      lastName: body.lastName,
      nickname: body.nickname,
      email: body.email,
      password: body.password,
      currentPassword: body.currentPassword,
    });

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertNoProfanity(input.firstName, "Имя");
    assertNoProfanity(input.lastName, "Фамилия");
    assertNoProfanity(input.nickname, "Никнейм");

    let passwordHash: string | undefined;
    if (input.password) {
      if (!/[A-Z]/.test(input.password)) {
        return NextResponse.json(
          { error: "Пароль: нужна хотя бы 1 заглавная буква" },
          { status: 400 },
        );
      }
      if (!/[a-z]/.test(input.password)) {
        return NextResponse.json(
          { error: "Пароль: нужна хотя бы 1 строчная буква" },
          { status: 400 },
        );
      }
      if (!/\d/.test(input.password)) {
        return NextResponse.json(
          { error: "Пароль: нужна хотя бы 1 цифра" },
          { status: 400 },
        );
      }

      passwordHash = await bcrypt.hash(input.password, 10);
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        passwordHash: true,
        profileEditCount: true,
      },
    });

    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prevEmail = (current.email ?? "").trim().toLowerCase();
    const nextEmail = input.email.trim().toLowerCase();
    const isEmailChanged = nextEmail !== prevEmail;

    const isMainChanged =
      input.firstName !== (current.firstName ?? "") ||
      input.lastName !== (current.lastName ?? "") ||
      input.nickname !== (current.nickname ?? "") ||
      isEmailChanged;

    const isPasswordChanged = Boolean(passwordHash);
    const isSensitiveChange = isEmailChanged || isPasswordChanged;

    if (!isMainChanged && !isPasswordChanged) {
      return NextResponse.json(
        { error: "Нет изменений для сохранения" },
        { status: 400 },
      );
    }

    if (isSensitiveChange) {
      if (!input.currentPassword) {
        return NextResponse.json(
          {
            error:
              "Для смены email или пароля введите текущий пароль.",
          },
          { status: 400 },
        );
      }

      const currentPasswordOk = await bcrypt.compare(
        input.currentPassword,
        current.passwordHash,
      );

      if (!currentPasswordOk) {
        return NextResponse.json(
          { error: "Текущий пароль указан неверно." },
          { status: 401 },
        );
      }
    }

    if (!isMainChanged && isPasswordChanged) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (current.profileEditCount >= 1) {
      return NextResponse.json(
        {
          error:
            "Основные данные профиля уже изменены. Их можно изменить только 1 раз.",
        },
        { status: 409 },
      );
    }

    if (isEmailChanged) {
      const [exists, pendingCompany] = await Promise.all([
        prisma.user.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        }),
        prisma.pendingCompanySignup.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        }),
      ]);

      if ((exists && exists.id !== user.id) || pendingCompany) {
        return NextResponse.json(
          { error: GENERIC_EMAIL_CHANGE_CONFLICT_ERROR },
          { status: 409 },
        );
      }
    }

    try {
      const updateRes = await prisma.user.updateMany({
        where: { id: user.id, profileEditCount: 0 },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          nickname: input.nickname,
          email: nextEmail,
          ...(isEmailChanged ? { emailVerifiedAt: null } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          profileEditCount: 1,
          profileEditedAt: new Date(),
        },
      });

      if (updateRes.count !== 1) {
        return NextResponse.json(
          {
            error:
              "Основные данные профиля уже изменены. Их можно изменить только 1 раз.",
          },
          { status: 409 },
        );
      }
    } catch (e: unknown) {
      if (isLikelyPrismaUniqueErr(e)) {
        const target = getPrismaTarget(e);

        if (target.includes("email")) {
          return NextResponse.json(
            { error: GENERIC_EMAIL_CHANGE_CONFLICT_ERROR },
            { status: 409 },
          );
        }

        if (target.includes("nickname")) {
          return NextResponse.json(
            { error: "Никнейм уже занят" },
            { status: 409 },
          );
        }

        return NextResponse.json(
          { error: "Уникальное значение уже занято" },
          { status: 409 },
        );
      }
      throw e;
    }

    if (isEmailChanged) {
      const code = generate6DigitCode();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + codeTtlMs());

      await prisma.emailVerification.upsert({
        where: { userId_email: { userId: user.id, email: nextEmail } },
        update: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
        create: { userId: user.id, email: nextEmail, codeHash, expiresAt },
      });

      await sendEmailVerificationCode(nextEmail, code);

      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      const res = NextResponse.json(
        {
          ok: true,
          needsEmailVerification: true,
          email: nextEmail,
          message:
            "Email изменён. Мы отправили код подтверждения на новую почту. Подтвердите email и войдите заново.",
        },
        { status: 200 },
      );

      clearSessionCookie(res);
      return res;
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const issue = err.issues?.[0];
      const path = issue?.path?.join(".") || "field";
      const msg = issue?.message ?? "Неверные данные";
      return NextResponse.json({ error: `${path}: ${msg}` }, { status: 400 });
    }

    if (err instanceof Error && err.message.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof Error && err.message.startsWith("Mail: env")) {
      return NextResponse.json(
        { error: "Почта не настроена (SMTP env)" },
        { status: 500 },
      );
    }

    console.error("PROFILE PATCH ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}