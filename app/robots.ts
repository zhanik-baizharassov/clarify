// app/robots.ts
import type { MetadataRoute } from "next";

const base =
  process.env.APP_ORIGIN?.trim() || "https://www.clarify.kz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/company",
        "/profile",
        "/login",
        "/signup",
        "/business/signup",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}