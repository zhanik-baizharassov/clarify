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
  categoryId: z.string().trim().optional(),
  categorySlug: z.string().trim().optional(),
  sort: SortSchema.default("rating_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

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
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (city) {
      and.push({ city: { equals: city, mode: "insensitive" } });
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