import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

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
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const admin = await getSessionUser();

    if (!admin) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { companyId } = await params;
    if (!companyId) {
      return NextResponse.json(
        { error: "Не найден companyId" },
        { status: 400 },
      );
    }

    const input = Schema.parse(await req.json());

    const target = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Компания не найдена" },
        { status: 404 },
      );
    }

    if (input.action === "block") {
      const blockedUntil = parseBlockedUntil(input.blockedUntil);
      const blockReason = input.reason?.trim() || null;

      await prisma.$transaction([
        prisma.company.update({
          where: { id: companyId },
          data: {
            blockedUntil,
            blockReason,
          },
        }),
        prisma.session.deleteMany({
          where: { userId: target.ownerId },
        }),
      ]);

      return NextResponse.json({ ok: true });
    }

    await prisma.company.update({
      where: { id: companyId },
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

    console.error("PATCH /api/admin/companies/[companyId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}