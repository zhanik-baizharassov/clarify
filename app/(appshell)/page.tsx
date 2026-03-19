import type { Metadata } from "next";
import LandingHome from "@/features/landing/LandingHome";
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
    title: `${homeTitle} — Clarify`,
    description: homeDescription,
    url: "/",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary",
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

export default async function HomePage() {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("HomePage: getSessionUser failed:", err);
    }
    sessionUser = null;
  }

  const origin = resolveStructuredDataOrigin();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Clarify",
      url: origin,
      inLanguage: "ru",
      description: homeDescription,
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
      />
    </>
  );
}