import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function resolveMetadataBase() {
  const raw = process.env.APP_ORIGIN?.trim() || "";

  if (!raw) return undefined;

  try {
    return new URL(raw);
  } catch {
    console.error("Invalid APP_ORIGIN for metadataBase:", raw);
    return undefined;
  }
}

const metadataBase = resolveMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Clarify — отзывы о местах и компаниях Казахстана",
    template: "%s — Clarify",
  },
  description:
    "Clarify — платформа отзывов по Казахстану. Ищите места, читайте реальные отзывы, сравнивайте рейтинг и выбирайте сервисы осознанно.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
    title: "Clarify — отзывы о местах и компаниях Казахстана",
    description:
      "Платформа отзывов по Казахстану: реальные оценки, карточки мест, ответы компаний и удобный поиск.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clarify — отзывы о местах и компаниях Казахстана",
    description:
      "Платформа отзывов по Казахстану: реальные оценки, карточки мест, ответы компаний и удобный поиск.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}