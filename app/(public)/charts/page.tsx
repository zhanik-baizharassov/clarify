import type { Metadata } from "next";
import ChartsClient from "./ChartsClient";

export const metadata: Metadata = {
  title: "Чарты",
  description:
    "Чарты Clarify: активные города, рекомендации пользователей и лучшие места по отзывам и рейтингу в Казахстане.",
  alternates: {
    canonical: "/charts",
  },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "Чарты — Clarify",
    description:
      "Смотрите чарты Clarify: активные города, рекомендации пользователей и лучшие места по отзывам и рейтингу в Казахстане.",
    url: "/charts",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
    title: "Чарты — Clarify",
    description:
      "Активные города, рекомендации пользователей и лучшие места по отзывам и рейтингу в Казахстане.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ChartsPage() {
  return <ChartsClient />;
}