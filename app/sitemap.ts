import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";

const base =
  process.env.APP_ORIGIN?.trim() || "https://www.clarify.kz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const places = await prisma.place.findMany({
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/business`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/charts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const placePages: MetadataRoute.Sitemap = places.map((place) => ({
    url: `${base}/place/${place.slug}`,
    lastModified: place.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...placePages];
}