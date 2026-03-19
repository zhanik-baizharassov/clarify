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

const defaultTitle = "Clarify — отзывы о местах и компаниях Казахстана";
const defaultDescription =
  "Clarify — платформа отзывов по Казахстану. Ищите места и компании, читайте реальные отзывы, сравнивайте рейтинг и выбирайте сервисы осознанно.";

export const metadata: Metadata = {
  metadataBase,
  applicationName: "Clarify",
  title: {
    default: defaultTitle,
    template: "%s — Clarify",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
    title: defaultTitle,
    description: defaultDescription,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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