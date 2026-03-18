import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";

export const runtime = "nodejs";

const Schema = z
  .object({
    action: z.enum(["block", "unblock"]),
    blockedUntil: z.string().trim().optional(),
    reason: z.string().trim().max(200, "Причина слишком длинная").optional(),
  })
  .strict();

function parseBlockedUntil(raw?: string) {
  if (!raw) {
    throw new Error("Укажите дату и время блокировки");
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата блокировки");
  }

  if (date <= new Date()) {
    throw new Error("Дата блокировки должна быть в будущем");
  }

  return date;
}

function isValidationMessage(message: string) {
  return (
    message.includes("дата") ||
    message.includes("Дата") ||
    message.includes("Причина") ||
    message.includes("Укажите")
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;    
    const admin = await getSessionUser();

    if (!admin) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Не найден userId" }, { status: 400 });
    }

    const input = Schema.parse(await req.json());

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 },
      );
    }

    if (target.role !== "USER") {
      return NextResponse.json(
        {
          error:
            "Через этот раздел можно управлять только обычными пользователями",
        },
        { status: 400 },
      );
    }

    if (input.action === "block") {
      const blockedUntil = parseBlockedUntil(input.blockedUntil);
      const blockReason = input.reason?.trim() || null;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            blockedUntil,
            blockReason,
          },
        }),
        prisma.session.deleteMany({
          where: { userId },
        }),
      ]);

      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        blockedUntil: null,
        blockReason: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && isValidationMessage(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("PATCH /api/admin/users/[userId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}