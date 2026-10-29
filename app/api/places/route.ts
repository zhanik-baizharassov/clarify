import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const SortSchema = z.enum([
  "rating_desc",
  "reviews_desc",
  "new_desc",
  "name_asc",
]);

const QuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  categoryId: z.string().trim().max(64).optional(),
  categorySlug: z.string().trim().max(200).optional(),
  sort: SortSchema.default("rating_desc"),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000, "Слишком большой номер страницы")
    .default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

// Prisma передаёт значение в LIKE/ILIKE как есть, поэтому `%`, `_` и `\`
// из пользовательского ввода нужно экранировать, чтобы они не работали как маски.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const parsed = QuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      categorySlug: url.searchParams.get("categorySlug") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      const msg =
        parsed.error.issues?.[0]?.message ?? "Неверные параметры запроса";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { q, city, categoryId, categorySlug, sort, page, limit } =
      parsed.data;

    let baseCategoryId: string | undefined;

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Категория не найдена" },
          { status: 400 },
        );
      }

      baseCategoryId = category.id;
    } else if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Категория не найдена" },
          { status: 400 },
        );
      }

      baseCategoryId = category.id;
    }

    const and: Prisma.PlaceWhereInput[] = [];

    if (q) {
      and.push({
        name: { startsWith: escapeLike(q), mode: "insensitive" },
      });
    }

    if (city) {
      and.push({ city: { equals: escapeLike(city), mode: "insensitive" } });
    }

    if (baseCategoryId) {
      and.push({ categoryId: baseCategoryId });
    }

    const where: Prisma.PlaceWhereInput | undefined = and.length
      ? { AND: and }
      : undefined;

    const orderBy: Prisma.PlaceOrderByWithRelationInput[] =
      sort === "reviews_desc"
        ? [{ ratingCount: "desc" }, { avgRating: "desc" }, { id: "asc" }]
        : sort === "new_desc"
          ? [{ createdAt: "desc" }, { id: "desc" }]
          : sort === "name_asc"
            ? [{ name: "asc" }, { id: "asc" }]
            : [{ avgRating: "desc" }, { ratingCount: "desc" }, { id: "asc" }];

    const skip = (page - 1) * limit;

    const [places, total] = await prisma.$transaction([
      prisma.place.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          address: true,
          avgRating: true,
          ratingCount: true,
          category: { select: { name: true } },
        },
      }),
      prisma.place.count({ where }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return NextResponse.json({
      items: places,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("PLACES GET ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
