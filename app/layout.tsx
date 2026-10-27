import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import YandexMetrika from "@/components/analytics/YandexMetrika";
import PointerGlow from "@/components/ui/PointerGlow";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Runs before first paint so there is no light/dark flash. Falls back to the
// system preference when the visitor has not picked a theme yet.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

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
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  // set GOOGLE_SITE_VERIFICATION / YANDEX_VERIFICATION in the environment to
  // verify the site in Search Console / Yandex Webmaster via meta tags
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.YANDEX_VERIFICATION || undefined,
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
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${onest.variable} ${unbounded.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <PointerGlow />
        <YandexMetrika />
      </body>
    </html>
  );
}