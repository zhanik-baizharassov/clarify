import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [places, reviews, users, companies] = await Promise.all([
    prisma.place.count(),
    prisma.review.count(),
    prisma.user.count(),
    prisma.company.count(),
  ]);

  // топ городов по кол-ву карточек + средний рейтинг + кол-во отзывов (ratingCount)
  const topCitiesRaw = await prisma.place.groupBy({
    by: ["city"],
    where: { city: { not: "" } },
    _count: { _all: true },
    _avg: { avgRating: true },
    _sum: { ratingCount: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });

  const topCities = topCitiesRaw.map((x) => ({
    city: x.city,
    places: x._count._all,
    avgRating: Number(x._avg.avgRating ?? 0),
    reviews: Number(x._sum.ratingCount ?? 0),
  }));

  // топ категорий по кол-ву карточек
  const topCatRaw = await prisma.place.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });

  const catIds = topCatRaw.map((x) => x.categoryId);
  const cats = await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  });
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  const topCategories = topCatRaw.map((x) => ({
    id: x.categoryId,
    name: catMap.get(x.categoryId) ?? "Категория",
    places: x._count._all,
  }));

  return NextResponse.json({
    totals: { places, reviews, users, companies },
    topCities,
    topCategories,
  });
}
