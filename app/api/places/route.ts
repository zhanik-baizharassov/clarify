import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim();
    const city = (url.searchParams.get("city") ?? "").trim();
    const categoryId = (url.searchParams.get("categoryId") ?? "").trim();
    const categorySlug = (url.searchParams.get("categorySlug") ?? "").trim();
    const sort = (url.searchParams.get("sort") ?? "rating_desc").trim();

    let resolvedCategoryId: string | undefined = undefined;

    if (categoryId) {
      resolvedCategoryId = categoryId;
    } else if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      resolvedCategoryId = cat?.id;
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

    if (resolvedCategoryId) {
      and.push({ categoryId: resolvedCategoryId });
    }

    const where = and.length ? { AND: and } : undefined;

    const orderBy =
      sort === "reviews_desc"
        ? [{ ratingCount: "desc" as const }, { avgRating: "desc" as const }]
        : sort === "new_desc"
        ? [{ createdAt: "desc" as const }]
        : sort === "name_asc"
        ? [{ name: "asc" as const }]
        : [{ avgRating: "desc" as const }, { ratingCount: "desc" as const }]; // rating_desc default

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