import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Название тега: минимум 2 символа")
      .max(80, "Название тега слишком длинное"),
    isActive: z.boolean(),
    sortOrder: z.coerce
      .number()
      .int("Порядок должен быть целым числом")
      .min(0, "Порядок не может быть отрицательным")
      .max(10000, "Порядок слишком большой"),
  })
  .strict();

async function requireAdmin() {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Нужна авторизация" },
        { status: 401 },
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;    
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { tagId } = await params;
    if (!tagId) {
      return NextResponse.json({ error: "Не найден тег" }, { status: 400 });
    }

    const input = UpdateTagSchema.parse(await req.json());

    const current = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { id: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Тег не найден" }, { status: 404 });
    }

    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: input.name.trim(),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("PATCH /api/admin/tags/[tagId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}