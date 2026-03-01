import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function collectCategoryIds(rootId: string) {
  // Собираем root + всех потомков (любой глубины)
  const seen = new Set<string>();
  const queue: string[] = [rootId];
  seen.add(rootId);

  while (queue.length) {
    // маленькими пачками, чтобы не делать огромный IN на всякий случай
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

  return Array.from(seen);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim();
    const city = (url.searchParams.get("city") ?? "").trim();
    const categoryId = (url.searchParams.get("categoryId") ?? "").trim();
    const categorySlug = (url.searchParams.get("categorySlug") ?? "").trim();
    const sort = (url.searchParams.get("sort") ?? "rating_desc").trim();

    let baseCategoryId: string | undefined = undefined;

    if (categoryId) {
      baseCategoryId = categoryId;
    } else if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      baseCategoryId = cat?.id;
    }

    const and: any[] = [];

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

    const where = and.length ? { AND: and } : undefined;

    const orderBy =
      sort === "reviews_desc"
        ? [{ ratingCount: "desc" as const }, { avgRating: "desc" as const }]
        : sort === "new_desc"
          ? [{ createdAt: "desc" as const }]
          : sort === "name_asc"
            ? [{ name: "asc" as const }]
            : [{ avgRating: "desc" as const }, { ratingCount: "desc" as const }];

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