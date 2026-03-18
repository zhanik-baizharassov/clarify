import slugify from "slugify";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Название тега: минимум 2 символа")
      .max(80, "Название тега слишком длинное"),
    sortOrder: z.coerce
      .number()
      .int("Порядок должен быть целым числом")
      .min(0, "Порядок не может быть отрицательным")
      .max(10000, "Порядок слишком большой")
      .default(0),
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

async function makeUniqueTagSlug(name: string) {
  const base = slugify(name, { lower: true, strict: true }) || "tag";
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.tag.findUnique({
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

    const input = CreateTagSchema.parse(await req.json());
    const slug = await makeUniqueTagSlug(input.name);

    const tag = await prisma.tag.create({
      data: {
        name: input.name.trim(),
        slug,
        isActive: true,
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

    return NextResponse.json(tag, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("POST /api/admin/tags failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}