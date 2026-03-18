import slugify from "slugify";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Название категории: минимум 2 символа")
      .max(80, "Название категории слишком длинное"),
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

async function makeUniqueCategorySlug(name: string) {
  const base = slugify(name, { lower: true, strict: true }) || "category";
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const input = CreateCategorySchema.parse(await req.json());

    const slug = await makeUniqueCategorySlug(input.name);

    const category = await prisma.category.create({
      data: {
        name: input.name.trim(),
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("POST /api/admin/categories failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
