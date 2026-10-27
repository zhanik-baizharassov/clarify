import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";
import { getSiteOrigin } from "@/server/seo/site";
import { KZ_CITIES, KZ_CITY_META, cityPath, type KzCity } from "@/shared/kz/kz";

function isKzCity(value: string): value is KzCity {
  return (KZ_CITIES as readonly string[]).includes(value);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();

  const [places, cityCategoryRows, categories] = await Promise.all([
    prisma.place.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.place.groupBy({
      by: ["city", "categoryId"],
      _max: { updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    }),
  ]);

  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/business`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/charts`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];

  // city hubs and city x category landing pages (only ones that have places)
  const cityLastModified = new Map<KzCity, Date>();
  const cityCategoryPages: MetadataRoute.Sitemap = [];

  for (const row of cityCategoryRows) {
    if (!isKzCity(row.city)) continue;

    const updatedAt = row._max.updatedAt ?? now;
    const known = cityLastModified.get(row.city);
    if (!known || updatedAt > known) cityLastModified.set(row.city, updatedAt);

    const categorySlug = categorySlugById.get(row.categoryId);
    if (!categorySlug) continue;

    cityCategoryPages.push({
      url: `${base}${cityPath(row.city)}/${categorySlug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  const cityPages: MetadataRoute.Sitemap = [...cityLastModified.entries()]
    .sort(([a], [b]) => KZ_CITY_META[a].slug.localeCompare(KZ_CITY_META[b].slug))
    .map(([city, lastModified]) => ({
      url: `${base}${cityPath(city)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));

  const placePages: MetadataRoute.Sitemap = places.map((place) => ({
    url: `${base}/place/${place.slug}`,
    lastModified: place.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...cityCategoryPages, ...placePages];
}
