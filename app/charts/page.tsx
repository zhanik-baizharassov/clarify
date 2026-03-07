"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Analytics = {
  totals: { places: number; reviews: number; users: number; companies: number };
  topCities: {
    city: string;
    places: number;
    avgRating: number;
    reviews: number;
  }[];
  topCategories: { id: string; name: string; places: number }[];
};

const nf = new Intl.NumberFormat("ru-RU");

export default function ChartsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/analytics/overview", {
          cache: "no-store",
          signal: ctrl.signal,
        });

        const data = await safeJson(res);

        if (!res.ok) {
          throw new Error(
            (data as any)?.error ?? "Не удалось загрузить чарты",
          );
        }

        if (!ctrl.signal.aborted) {
          setAnalytics(data as Analytics);
        }
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setAnalytics(null);
        setErr(e?.message ?? "Не удалось загрузить чарты");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-muted/20 p-7 md:p-10">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Чарты Clarify
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Здесь собрана сводная активность платформы. Сейчас показываем топ
          городов по количеству карточек мест.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/explore"
            className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium"
          >
            Перейти к поиску мест
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-background p-5">
        <div>
          <div className="text-lg font-semibold">Активность по городам</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Топ городов по количеству карточек
          </div>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-3">
            <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
            <div className="h-2 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted/50" />
            <div className="h-2 w-full animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
            <div className="h-2 w-full animate-pulse rounded bg-muted/50" />
          </div>
        ) : err ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {err}
          </div>
        ) : analytics?.topCities?.length ? (
          <div className="mt-5">
            <MiniBarChart
              rows={analytics.topCities.map((c) => ({
                label: c.city || "—",
                value: c.places,
                hint: `Средний рейтинг: ${Number(c.avgRating).toFixed(2)} • Отзывов: ${nf.format(c.reviews)}`,
              }))}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            Пока нет данных по городам.
          </div>
        )}
      </section>
    </main>
  );
}

function MiniBarChart({
  rows,
}: {
  rows: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="grid gap-3">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="grid gap-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate text-muted-foreground">{r.label}</div>
              {r.hint ? (
                <div className="truncate text-xs text-muted-foreground">
                  {r.hint}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 font-medium">{r.value}</div>
          </div>

          <div className="h-2 rounded-full bg-muted/40">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
              aria-label={`${r.label}: ${r.value}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}