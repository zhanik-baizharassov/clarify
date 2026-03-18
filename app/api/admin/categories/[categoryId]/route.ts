import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateCategorySchema = z
  .object({
    isActive: z.boolean(),
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
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { categoryId } = await params;
    if (!categoryId) {
      return NextResponse.json(
        { error: "Не найдена категория" },
        { status: 400 },
      );
    }

    const input = UpdateCategorySchema.parse(await req.json());

    const current = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 },
      );
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: input.isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("PATCH /api/admin/categories/[categoryId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
