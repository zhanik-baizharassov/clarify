import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Название категории: минимум 2 символа")
      .max(80, "Название категории слишком длинное"),
    parentId: z.string().trim().nullable().optional(),
    isActive: z.boolean(),
    sortOrder: z.coerce
      .number()
      .int("Порядок должен быть целым числом")
      .min(0, "Порядок не может быть отрицательным")
      .max(10000, "Порядок слишком большой"),
  })
  .strict();

function normalizeParentId(value?: string | null) {
  const clean = (value ?? "").trim();
  return clean || null;
}

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

async function collectDescendantIds(rootId: string) {
  const result = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length) {
    const batch = queue.splice(0, 50);

    const children = await prisma.category.findMany({
      where: { parentId: { in: batch } },
      select: { id: true },
    });

    for (const child of children) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return Array.from(result);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
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
    const parentId = normalizeParentId(input.parentId);

    const current = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 },
      );
    }

    if (parentId === categoryId) {
      return NextResponse.json(
        { error: "Категория не может быть родителем самой себе" },
        { status: 400 },
      );
    }

    const descendantIds = await collectDescendantIds(categoryId);

    if (parentId && descendantIds.includes(parentId)) {
      return NextResponse.json(
        { error: "Нельзя сделать дочернюю категорию родителем текущей" },
        { status: 400 },
      );
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Родительская категория не найдена" },
          { status: 400 },
        );
      }

      if (!parent.isActive) {
        return NextResponse.json(
          { error: "Нельзя привязать категорию к отключённому родителю" },
          { status: 400 },
        );
      }
    }

    if (!input.isActive && descendantIds.length > 0) {
      const activeDescendant = await prisma.category.findFirst({
        where: {
          id: { in: descendantIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (activeDescendant) {
        return NextResponse.json(
          {
            error:
              "Сначала отключите или переназначьте активные дочерние категории",
          },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: input.name.trim(),
        parentId,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
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

    console.error("PATCH /api/admin/categories/[categoryId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}