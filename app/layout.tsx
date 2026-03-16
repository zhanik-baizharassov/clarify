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
  const raw =
    process.env.APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  if (!raw) return undefined;

  try {
    return new URL(raw);
  } catch {
    console.error("Invalid site origin for metadataBase:", raw);
    return undefined;
  }
}

const metadataBase = resolveMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Clarify",
    template: "%s — Clarify",
  },
  description: "Отзывы о компаниях и местах в Казахстане",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
    title: "Clarify",
    description: "Отзывы о компаниях и местах в Казахстане",
  },
  twitter: {
    card: "summary",
    title: "Clarify",
    description: "Отзывы о компаниях и местах в Казахстане",
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