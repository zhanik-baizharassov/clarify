"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Star, TrendingUp } from "lucide-react";

type Analytics = {
  totals: { places: number; reviews: number; users: number; companies: number };
  cityOptions: {
    city: string;
    places: number;
    avgRating: number;
    reviews: number;
  }[];
  topCities: {
    city: string;
    places: number;
    avgRating: number;
    reviews: number;
  }[];
  topCategories: { id: string; name: string; places: number }[];
  recommendedPlaces: {
    id: string;
    slug: string;
    name: string;
    city: string;
    address: string | null;
    categoryName: string;
    avgRating: number;
    ratingCount: number;
    highlightRating: number;
    reviewText: string;
  }[];
  topPlacesByCity?: {
    city: string;
    items: {
      id: string;
      slug: string;
      name: string;
      address: string | null;
      categoryName: string;
      avgRating: number;
      ratingCount: number;
    }[];
  };
};

type ApiError = {
  error?: string;
};

const nf = new Intl.NumberFormat("ru-RU");

export default function ChartsClient() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityPlaces, setCityPlaces] = useState<
    Analytics["topPlacesByCity"] | null
  >(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/analytics/overview", {
          signal: ctrl.signal,
        });

        const data = await safeJson<Analytics | ApiError>(res);

        if (!res.ok) {
          const errorMessage =
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Не удалось загрузить чарты";

          throw new Error(errorMessage);
        }

        if (!ctrl.signal.aborted) {
          setAnalytics((data ?? null) as Analytics | null);
        }
      } catch (e: unknown) {
        if (ctrl.signal.aborted) return;
        setAnalytics(null);
        setErr(e instanceof Error ? e.message : "Не удалось загрузить чарты");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setCityPlaces(null);
      setCityErr(null);
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      setCityLoading(true);
      setCityErr(null);

      try {
        const res = await fetch(
          `/api/analytics/overview?city=${encodeURIComponent(selectedCity)}`,
          {
            signal: ctrl.signal,
          },
        );

        const data = await safeJson<Analytics | ApiError>(res);

        if (!res.ok) {
          const errorMessage =
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Не удалось загрузить топ заведений";

          throw new Error(errorMessage);
        }

        if (!ctrl.signal.aborted) {
          setCityPlaces(
            ((data as Analytics | null)?.topPlacesByCity ?? null) as
              | Analytics["topPlacesByCity"]
              | null,
          );
        }
      } catch (e: unknown) {
        if (ctrl.signal.aborted) return;
        setCityPlaces(null);
        setCityErr(
          e instanceof Error ? e.message : "Не удалось загрузить топ заведений",
        );
      } finally {
        if (!ctrl.signal.aborted) setCityLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [selectedCity]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Что сейчас интересно пользователям Clarify
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Чарты Clarify
        </h1>

        <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
          Здесь собраны самые активные города, недавние рекомендации
          пользователей и лучшие места по выбранному городу.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/explore"
            className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/30"
          >
            Перейти к поиску мест
          </Link>
        </div>
      </section>

      {loading ? (
        <>
          <SectionSkeleton className="mt-6" />
          <SectionSkeleton className="mt-6" />
          <SectionSkeleton className="mt-6" />
        </>
      ) : err ? (
        <section className="mt-6 rounded-2xl border bg-background p-5">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {err}
          </div>
        </section>
      ) : analytics ? (
        <>
          <section className="mt-6 rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">
                  Пользователи Clarify рекомендуют
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Недавние места, которые получили хорошие оценки 4–5 звёзд.
                </div>
              </div>

              <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Рекомендаций:{" "}
                <span className="font-medium text-foreground">
                  {analytics.recommendedPlaces.length}
                </span>
              </div>
            </div>

            {analytics.recommendedPlaces.length ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {analytics.recommendedPlaces.map((place) => (
                  <Link
                    key={place.id}
                    href={`/place/${place.slug}`}
                    className="group rounded-2xl border bg-muted/10 p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold">
                          {place.name}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {place.categoryName} • {place.city}
                        </div>
                      </div>

                      <div className="rounded-full border bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {place.highlightRating}/5
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground">
                      {place.reviewText}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                        <Star className="h-3.5 w-3.5 text-primary" />
                        Рейтинг {place.avgRating.toFixed(2)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                        {nf.format(place.ratingCount)} отзывов
                      </span>
                    </div>

                    {place.address ? (
                      <div className="mt-4 text-sm text-muted-foreground">
                        {place.address}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState text="Пока нет свежих рекомендаций с высокими оценками." />
            )}
          </section>

          <section className="mt-6 rounded-2xl border bg-background p-5">
            <div>
              <div className="text-lg font-semibold">Активность по городам</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Топ городов по количеству карточек мест и общей активности.
              </div>
            </div>

            {analytics.topCities.length ? (
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
              <EmptyState text="Пока нет данных по городам." />
            )}
          </section>

          <section className="mt-6 rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">
                  Топ заведений по городу
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Выберите город и посмотрите лучшие места по рейтингу и
                  отзывам.
                </div>
              </div>

              <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Городов:{" "}
                <span className="font-medium text-foreground">
                  {analytics.cityOptions.length}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {analytics.cityOptions.map((city) => {
                const isActive = selectedCity === city.city;

                return (
                  <button
                    key={city.city}
                    type="button"
                    onClick={() => setSelectedCity(city.city)}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                      "hover:border-primary/40 hover:bg-muted/20",
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "",
                    ].join(" ")}
                  >
                    <span>{city.city}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {city.places}
                    </span>
                  </button>
                );
              })}
            </div>

            {!selectedCity ? (
              <div className="mt-6">
                <EmptyState text="Сначала выберите город, чтобы увидеть лучшие заведения." />
              </div>
            ) : cityLoading ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PlaceSkeleton />
                <PlaceSkeleton />
                <PlaceSkeleton />
                <PlaceSkeleton />
              </div>
            ) : cityErr ? (
              <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {cityErr}
              </div>
            ) : cityPlaces?.items?.length ? (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">
                      Лучшие места города {cityPlaces.city}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Список формируется по среднему рейтингу и количеству
                      отзывов.
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {cityPlaces.items.map((place, index) => (
                    <Link
                      key={place.id}
                      href={`/place/${place.slug}`}
                      className="group rounded-2xl border bg-muted/10 p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border bg-primary/10 px-2 text-xs font-semibold text-primary">
                              #{index + 1}
                            </span>
                            <div className="text-lg font-semibold">
                              {place.name}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-muted-foreground">
                            {place.categoryName}
                            {place.address ? ` • ${place.address}` : ""}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-lg font-semibold">
                            {place.avgRating.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {nf.format(place.ratingCount)} отзывов
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                        Открыть место
                        <MapPin className="h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState text="В выбранном городе пока нет заведений с отзывами для рейтинга." />
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function MiniBarChart({
  rows,
}: {
  rows: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="grid gap-4">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate text-base font-medium">{r.label}</div>
              {r.hint ? (
                <div className="truncate text-xs text-muted-foreground">
                  {r.hint}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 font-medium">{r.value}</div>
          </div>

          <div className="h-2.5 rounded-full bg-muted/40">
            <div
              className="h-2.5 rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
              aria-label={`${r.label}: ${r.value}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SectionSkeleton({ className = "" }: { className?: string }) {
  return (
    <section className={`${className} rounded-2xl border bg-background p-5`}>
      <div className="h-6 w-56 animate-pulse rounded bg-muted/50" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted/50" />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <PlaceSkeleton />
        <PlaceSkeleton />
      </div>
    </section>
  );
}

function PlaceSkeleton() {
  return (
    <div className="rounded-2xl border bg-muted/10 p-5">
      <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
      <div className="mt-3 h-4 w-56 animate-pulse rounded bg-muted/50" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-muted/50" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted/50" />
    </div>
  );
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}