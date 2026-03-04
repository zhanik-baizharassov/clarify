// app/api/analytics/overview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_N = 8;

export async function GET() {
  try {
    const [places, reviews, users, companies] = await Promise.all([
      prisma.place.count(),
      // ✅ логичнее для витрины: только опубликованные
      prisma.review.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count(),
      prisma.company.count(),
    ]);

    // топ городов по кол-ву карточек + средний рейтинг + кол-во отзывов (ratingCount)
    const topCitiesRaw = await prisma.place.groupBy({
      by: ["city"],
      where: { city: { not: "" } },
      _count: { id: true },
      _avg: { avgRating: true },
      _sum: { ratingCount: true },
      orderBy: { _count: { id: "desc" } },
      take: TOP_N,
    });

    const topCities = topCitiesRaw.map((x) => ({
      city: x.city,
      places: x._count.id,
      avgRating: Number(x._avg.avgRating ?? 0),
      reviews: Number(x._sum.ratingCount ?? 0),
    }));

    // топ категорий по кол-ву карточек
    const topCatRaw = await prisma.place.groupBy({
      by: ["categoryId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: TOP_N,
    });

    // защита, если categoryId вдруг nullable
    const catIds = topCatRaw
      .map((x) => x.categoryId)
      .filter((v): v is NonNullable<typeof v> => v != null);

    const cats = catIds.length
      ? await prisma.category.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true },
        })
      : [];

    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    const topCategories = topCatRaw
      .filter((x) => x.categoryId != null)
      .map((x) => ({
        id: x.categoryId!,
        name: catMap.get(x.categoryId!) ?? "Категория",
        places: x._count.id,
      }));

    return NextResponse.json({
      totals: { places, reviews, users, companies },
      topCities,
      topCategories,
    });
  } catch (err) {
    console.error("GET /api/analytics/overview failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}