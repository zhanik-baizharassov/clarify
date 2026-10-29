"use client";

import { useEffect } from "react";
import "./globals.css";

// Rendered only when the root layout itself fails, so it must provide its own
// <html>/<body> and cannot rely on layout fonts or providers.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GLOBAL APP ERROR:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-16">
          <div className="clarify-card-elevated w-full p-8 text-center">
            <div className="text-4xl font-semibold">Ой!</div>
            <h1 className="mt-4 text-xl font-semibold">
              Сайт временно недоступен
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Попробуйте ещё раз через минуту.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="clarify-button-primary"
              >
                Попробовать снова
              </button>
              {/* A plain anchor: the router may be unavailable here. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="clarify-button-secondary">
                На главную
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
