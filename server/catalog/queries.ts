import { prisma } from "@/server/db/prisma";
import { KZ_CITIES, type KzCity } from "@/shared/kz/kz";

const PLACE_SELECT = {
  slug: true,
  name: true,
  city: true,
  address: true,
  avgRating: true,
  ratingCount: true,
  category: { select: { name: true } },
} as const;

const PLACE_ORDER = [
  { ratingCount: "desc" },
  { avgRating: "desc" },
  { createdAt: "desc" },
] as const;

function isKzCity(value: string): value is KzCity {
  return (KZ_CITIES as readonly string[]).includes(value);
}

/** Cities that have at least one place, with their place counts. */
export async function getCitiesWithPlaces() {
  const rows = await prisma.place.groupBy({
    by: ["city"],
    _count: { _all: true },
  });

  return rows
    .filter((row): row is typeof row & { city: KzCity } => isKzCity(row.city))
    .map((row) => ({ city: row.city, count: row._count._all }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "ru"));
}

/** Active categories used in a city, most populated first. */
export async function getCategoriesInCity(city: KzCity) {
  const rows = await prisma.place.groupBy({
    by: ["categoryId"],
    where: { city },
    _count: { _all: true },
  });

  if (rows.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: rows.map((r) => r.categoryId) }, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  const counts = new Map(rows.map((r) => [r.categoryId, r._count._all]));

  return categories
    .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
}

/** Cities where a category has places. */
export async function getCitiesForCategory(categoryId: string) {
  const rows = await prisma.place.groupBy({
    by: ["city"],
    where: { categoryId },
    _count: { _all: true },
  });

  return rows
    .filter((row): row is typeof row & { city: KzCity } => isKzCity(row.city))
    .map((row) => ({ city: row.city, count: row._count._all }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "ru"));
}

export async function getTopPlacesInCity(city: KzCity, take = 12) {
  return prisma.place.findMany({
    where: { city },
    orderBy: [...PLACE_ORDER],
    take,
    select: PLACE_SELECT,
  });
}

export async function getPlacesInCityCategory(
  city: KzCity,
  categoryId: string,
  take = 60,
) {
  const [places, total] = await Promise.all([
    prisma.place.findMany({
      where: { city, categoryId },
      orderBy: [...PLACE_ORDER],
      take,
      select: PLACE_SELECT,
    }),
    prisma.place.count({ where: { city, categoryId } }),
  ]);

  return { places, total };
}

export async function getRelatedPlaces(params: {
  placeId: string;
  city: string;
  categoryId: string;
  take?: number;
}) {
  return prisma.place.findMany({
    where: {
      city: params.city,
      categoryId: params.categoryId,
      id: { not: params.placeId },
    },
    orderBy: [...PLACE_ORDER],
    take: params.take ?? 6,
    select: PLACE_SELECT,
  });
}
