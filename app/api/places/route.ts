// app/api/places/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const SortSchema = z.enum(["rating_desc", "reviews_desc", "new_desc", "name_asc"]);

const QuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  categoryId: z.string().trim().optional(),
  categorySlug: z.string().trim().optional(),
  sort: SortSchema.default("rating_desc"),
});

const categoryIdsCache = new Map<string, string[]>();

async function collectCategoryIds(rootId: string) {
  const cached = categoryIdsCache.get(rootId);
  if (cached) return cached;

  const seen = new Set<string>();
  const queue: string[] = [rootId];
  seen.add(rootId);

  while (queue.length) {
    const batch = queue.splice(0, 50);

    const children = await prisma.category.findMany({
      where: { parentId: { in: batch } },
      select: { id: true },
    });

    for (const c of children) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        queue.push(c.id);
      }
    }
  }

  const result = Array.from(seen);
  categoryIdsCache.set(rootId, result);
  return result;
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
    });

    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? "Неверные параметры запроса";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { q, city, categoryId, categorySlug, sort } = parsed.data;

    let baseCategoryId: string | undefined;

    if (categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
      }
      baseCategoryId = cat.id;
    } else if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
      }
      baseCategoryId = cat.id;
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
      const ids = await collectCategoryIds(baseCategoryId);
      and.push({ categoryId: { in: ids } });
    }

    const where: Prisma.PlaceWhereInput | undefined = and.length ? { AND: and } : undefined;

    const orderBy: Prisma.PlaceOrderByWithRelationInput[] =
      sort === "reviews_desc"
        ? [{ ratingCount: "desc" }, { avgRating: "desc" }]
        : sort === "new_desc"
          ? [{ createdAt: "desc" }]
          : sort === "name_asc"
            ? [{ name: "asc" }]
            : [{ avgRating: "desc" }, { ratingCount: "desc" }];

    const places = await prisma.place.findMany({
      where,
      orderBy,
      take: 50,
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
    });

    return NextResponse.json({ items: places });
  } catch (err) {
    console.error("PLACES GET ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}