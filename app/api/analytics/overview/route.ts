import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import {enforceRateLimits,getRequestIp,} from "@/server/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_N = 8;
const RECOMMENDED_LIMIT = 6;
const TOP_PLACES_PER_CITY = 8;

function truncateText(text: string, max = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export async function GET(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "analytics:overview:ip",
        key: ip,
        limit: 30,
        windowSec: 5 * 60,
        errorMessage:
          "Слишком много запросов к аналитике. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const { searchParams } = new URL(req.url);
    const selectedCity = searchParams.get("city")?.trim() || null;

    const [places, reviews, users, companies] = await Promise.all([
      prisma.place.count(),
      prisma.review.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count(),
      prisma.company.count(),
    ]);

    // Все города с количеством карточек.
    const cityAggRaw = await prisma.place.groupBy({
      by: ["city"],
      where: { city: { not: "" } },
      _count: { id: true },
      _avg: { avgRating: true },
      _sum: { ratingCount: true },
      orderBy: { _count: { id: "desc" } },
    });

    const cityOptions = cityAggRaw.map((x) => ({
      city: x.city,
      places: x._count.id,
      avgRating: Number(x._avg.avgRating ?? 0),
      reviews: Number(x._sum.ratingCount ?? 0),
    }));

    const topCities = cityOptions.slice(0, TOP_N);

    // Топ категорий по количеству карточек.
    const topCatRaw = await prisma.place.groupBy({
      by: ["categoryId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: TOP_N,
    });

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

    // Недавние хорошо оценённые места.
    const recentPositiveReviews = await prisma.review.findMany({
      where: {
        status: "PUBLISHED",
        rating: { gte: 4 },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        place: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            address: true,
            avgRating: true,
            ratingCount: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const seenPlaceIds = new Set<string>();
    const recommendedPlaces = recentPositiveReviews
      .filter((review) => {
        if (seenPlaceIds.has(review.place.id)) return false;
        seenPlaceIds.add(review.place.id);
        return true;
      })
      .slice(0, RECOMMENDED_LIMIT)
      .map((review) => ({
        id: review.place.id,
        slug: review.place.slug,
        name: review.place.name,
        city: review.place.city,
        address: review.place.address,
        categoryName: review.place.category.name,
        avgRating: Number(review.place.avgRating ?? 0),
        ratingCount: Number(review.place.ratingCount ?? 0),
        highlightRating: review.rating,
        reviewText: truncateText(review.text, 110),
      }));

    let topPlacesByCity:
      | {
          city: string;
          items: {
            id: string;
            slug: string;
            name: string;
            address: string | null;
            categoryName: string;
            avgRating: number;
            ratingCount: number;
          }[];
        }
      | undefined;

    if (selectedCity) {
      const cityPlacesRaw = await prisma.place.findMany({
        where: {
          city: selectedCity,
          ratingCount: { gt: 0 },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          avgRating: true,
          ratingCount: true,
          createdAt: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      });

      const cityPlacesSorted = [...cityPlacesRaw].sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      topPlacesByCity = {
        city: selectedCity,
        items: cityPlacesSorted.slice(0, TOP_PLACES_PER_CITY).map((place) => ({
          id: place.id,
          slug: place.slug,
          name: place.name,
          address: place.address,
          categoryName: place.category.name,
          avgRating: Number(place.avgRating ?? 0),
          ratingCount: Number(place.ratingCount ?? 0),
        })),
      };
    }

    return NextResponse.json({
      totals: { places, reviews, users, companies },
      cityOptions,
      topCities,
      topCategories,
      recommendedPlaces,
      ...(topPlacesByCity ? { topPlacesByCity } : {}),
    });
  } catch (err) {
    console.error("GET /api/analytics/overview failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}