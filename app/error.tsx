"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Never show the raw message to visitors; keep it in the console/logs.
    console.error("APP ERROR:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
      <div className="clarify-card-elevated w-full p-8 text-center">
        <div className="font-display text-4xl font-semibold">Ой!</div>
        <h1 className="mt-4 text-xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Мы уже знаем о проблеме. Попробуйте ещё раз или вернитесь на главную.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="clarify-button-primary"
          >
            Попробовать снова
          </button>
          <Link href="/" className="clarify-button-secondary">
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
