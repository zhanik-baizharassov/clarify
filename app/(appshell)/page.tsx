import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import LandingHome from "@/features/landing/LandingHome";
import { prisma } from "@/server/db/prisma";
import {
  getSessionUser,
  isDynamicServerUsageError,
} from "@/server/auth/session";

const homeTitle = "Отзывы по Казахстану";
const homeDescription =
  "Clarify — платформа отзывов по Казахстану. Ищите места и компании, читайте реальные отзывы, сравнивайте рейтинг и выбирайте сервисы осознанно.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: `${homeTitle} — Clarify`,
    description: homeDescription,
    url: "/",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
    title: `${homeTitle} — Clarify`,
    description: homeDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function resolveStructuredDataOrigin() {
  const raw = process.env.APP_ORIGIN?.trim();

  if (!raw) return "https://www.clarify.kz";

  try {
    return new URL(raw).origin;
  } catch {
    return "https://www.clarify.kz";
  }
}

async function loadLandingCategories() {
  const [categories, usage] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.place.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(usage.map((row) => [row.categoryId, row._count._all]));
  const used = categories.filter((c) => (counts.get(c.id) ?? 0) > 0);

  const popular = [...used]
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, 5)
    .map(({ name, slug }) => ({ name, slug }));

  return {
    categories: used.map(({ name, slug }) => ({ name, slug })),
    popular,
  };
}

// Categories rarely change; cache them so the landing page does not hit the
// database for them on every visit. The cached function throws on failure, so
// an outage is never cached; the wrapper below turns it into an empty list.
const loadLandingCategoriesCached = unstable_cache(
  loadLandingCategories,
  ["landing-categories"],
  { revalidate: 300 },
);

async function getLandingCategories() {
  try {
    return await loadLandingCategoriesCached();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("HomePage: categories failed:", err);
    }
    return { categories: [], popular: [] };
  }
}

export default async function HomePage() {
  const [sessionUser, landingCategories] = await Promise.all([
    getSessionUser().catch((err) => {
      if (!isDynamicServerUsageError(err)) {
        console.error("HomePage: getSessionUser failed:", err);
      }
      return null;
    }),
    getLandingCategories(),
  ]);

  const origin = resolveStructuredDataOrigin();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Clarify",
      url: origin,
      inLanguage: "ru",
      description: homeDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${origin}/explore?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Clarify",
      url: origin,
      description:
        "Платформа отзывов о местах и компаниях Казахстана с публичными карточками, рейтингами и официальными ответами компаний.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingHome
        isAuthed={!!sessionUser}
        role={sessionUser?.role ?? null}
        categories={landingCategories.categories}
        popularCategories={landingCategories.popular}
      />
    </>
  );
}