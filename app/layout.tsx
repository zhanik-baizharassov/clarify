import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  getSessionUser,
  isDynamicServerUsageError,
} from "@/server/auth/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : undefined;

export const metadata: Metadata = {
  metadataBase: siteUrl,
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

export const viewport = {
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("RootLayout: getSessionUser failed:", err);
    }
    sessionUser = null;
  }

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <Footer role={sessionUser?.role ?? null} />
      </body>
    </html>
  );
}