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
    title: "Чарты — Clarify",
    description:
      "Смотрите чарты Clarify: активные города, рекомендации пользователей и лучшие места по отзывам и рейтингу в Казахстане.",
    url: "/charts",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary",
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