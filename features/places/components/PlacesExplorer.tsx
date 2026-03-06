"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import {
  BarChart3,
  MessageCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { KZ_CITIES } from "@/shared/kz/kz";

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type PlaceCard = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  avgRating: number;
  ratingCount: number;
  category: { name: string };
};

type SortKey = "rating_desc" | "reviews_desc" | "new_desc" | "name_asc";

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

type Variant = "hero" | "catalog";

const nf = new Intl.NumberFormat("ru-RU");

export default function PlacesExplorer({
  isAuthed,
  variant = "hero",
}: {
  isAuthed?: boolean;
  variant?: Variant;
}) {
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [city, setCity] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("rating_desc");

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<PlaceCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);

  const placesAbortRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback(
    (
      override?: Partial<{
        q: string;
        city: string;
        categoryId: string;
        sort: SortKey;
      }>,
    ) => {
      const p = new URLSearchParams();

      const q0 = (override?.q ?? q).trim();
      const city0 = (override?.city ?? city).trim();
      const categoryId0 = (override?.categoryId ?? categoryId).trim();
      const sort0 = override?.sort ?? sort;

      if (q0) p.set("q", q0);
      if (city0) p.set("city", city0);
      if (categoryId0) p.set("categoryId", categoryId0);
      if (sort0) p.set("sort", sort0);

      return p.toString();
    },
    [q, city, categoryId, sort],
  );

  // bootstrap: categories + analytics
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      try {
        const [catsRes, aRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store", signal: ctrl.signal }),
          fetch("/api/analytics/overview", {
            cache: "no-store",
            signal: ctrl.signal,
          }),
        ]);

        if (ctrl.signal.aborted) return;

        const catsData = await safeJson(catsRes);
        const list =
          catsRes.ok && Array.isArray((catsData as any)?.items)
            ? ((catsData as any).items as Category[])
            : [];
        setCategories(list);

        const aData = await safeJson(aRes);
        if (!aRes.ok) {
          setAnalytics(null);
          setAnalyticsError(
            (aData as any)?.error ?? "Не удалось загрузить аналитику",
          );
        } else {
          setAnalytics(aData as Analytics);
        }
      } catch {
        if (ctrl.signal.aborted) return;
        setCategories([]);
        setAnalytics(null);
        setAnalyticsError("Не удалось загрузить аналитику");
      } finally {
        if (!ctrl.signal.aborted) setAnalyticsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const allCategories = useMemo(() => categories, [categories]);

  const loadPlaces = useCallback(async (qs: string) => {
    placesAbortRef.current?.abort();
    const ctrl = new AbortController();
    placesAbortRef.current = ctrl;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/places?${qs}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });

      if (ctrl.signal.aborted) return;

      const data = await safeJson(res);
      if (!res.ok)
        throw new Error((data as any)?.error ?? "Не удалось загрузить места");

      setItems(
        Array.isArray((data as any)?.items)
          ? ((data as any).items as PlaceCard[])
          : [],
      );
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      setErr(e?.message ?? "Ошибка");
      setItems([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      placesAbortRef.current?.abort();
    };
  }, []);

  async function onSearchClick() {
    const qs = buildQueryString();
    setHasSearched(true);
    await loadPlaces(qs);
  }

  async function resetFilters() {
    setQ("");
    setCity("");
    setCategoryId("");
    setSort("rating_desc");

    const qs = buildQueryString({
      q: "",
      city: "",
      categoryId: "",
      sort: "rating_desc",
    });
    setHasSearched(true);
    await loadPlaces(qs);
  }

  return (
    <section
      id="explore"
      className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      {/* subtle background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-72 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
      />

      {/* TOP: hero or catalog */}
      {variant === "hero" ? (
        <div className="relative overflow-hidden rounded-3xl border bg-muted/20 p-7 md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">KZ</span>
                <span>
                  Настоящие отзывы разных мест только от верифицированных
                  пользователей
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Нам важно ваше мнение!
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Оценивай заведения и сервисы Казахстана честно: еда, магазины,
                ремонт, услуги и многое другое.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="#search"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:w-auto"
                >
                  <Search className="h-4 w-4" />
                  Начать поиск
                </a>

                {!isAuthed ? (
                  <Link
                    href="/signup"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium sm:w-auto"
                  >
                    Зарегистрироваться
                  </Link>
                ) : null}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FeatureCard
                  title="Рейтинг"
                  desc="Средние оценки по филиалам"
                  icon={<BarChart3 className="h-4 w-4" />}
                />
                <FeatureCard
                  title="Фильтры"
                  desc="Город, категория, сортировка"
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                />
                <FeatureCard
                  title="Модерация"
                  desc="Profanity-check на сервере"
                  icon={<MessageCircle className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Right */}
            <div id="search" className="scroll-mt-24 lg:col-span-5">
              <SearchCard
                q={q}
                setQ={setQ}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                city={city}
                setCity={setCity}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                sort={sort}
                setSort={setSort}
                allCategories={allCategories}
                loading={loading}
                err={err}
                onSearch={onSearchClick}
                onReset={resetFilters}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          id="search"
          className="scroll-mt-24 relative overflow-hidden rounded-3xl border bg-background/80 shadow-sm backdrop-blur"
        >
          <SearchCard
            fillParent
            q={q}
            setQ={setQ}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            city={city}
            setCity={setCity}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            sort={sort}
            setSort={setSort}
            allCategories={allCategories}
            loading={loading}
            err={err}
            onSearch={onSearchClick}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* Analytics blocks (без верхних KPI) */}
      <div className="mt-6">
        {analyticsLoading ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border bg-background p-5 lg:col-span-7">
              <div className="h-4 w-56 animate-pulse rounded bg-muted/50" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted/50" />
              <div className="mt-5 h-2 w-full animate-pulse rounded bg-muted/50" />
            </div>
            <div className="rounded-2xl border bg-background p-5 lg:col-span-5">
              <div className="h-4 w-56 animate-pulse rounded bg-muted/50" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted/50" />
              <div className="mt-5 grid gap-2">
                <div className="h-9 w-44 animate-pulse rounded-full bg-muted/50" />
                <div className="h-9 w-60 animate-pulse rounded-full bg-muted/50" />
                <div className="h-9 w-52 animate-pulse rounded-full bg-muted/50" />
              </div>
            </div>
          </div>
        ) : !analytics ? (
          <div className="rounded-2xl border bg-background p-5 text-sm text-muted-foreground">
            Аналитика временно недоступна
            {analyticsError ? `: ${analyticsError}` : "."}
          </div>
        ) : analytics?.topCities?.length || analytics?.topCategories?.length ? (
          <div className="grid gap-4 lg:grid-cols-12">
            {analytics?.topCities?.length ? (
              <div className="rounded-2xl border bg-background p-5 lg:col-span-7">
                <div>
                  <div className="text-sm font-semibold">
                    Активность по городам
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Топ городов по количеству карточек
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <MiniBarChart
                    rows={analytics.topCities.map((c) => ({
                      label: c.city || "—",
                      value: c.places,
                      hint: `Средний рейтинг: ${Number(c.avgRating).toFixed(2)} • Отзывов: ${nf.format(c.reviews)}`,
                    }))}
                  />
                </div>
              </div>
            ) : null}

            {analytics?.topCategories?.length ? (
              <div className="rounded-2xl border bg-background p-5 lg:col-span-5">
                <div>
                  <div className="text-sm font-semibold">
                    Популярные категории
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Топ категорий по количеству карточек
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {analytics.topCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c.id);
                        setShowFilters(true);
                        const el = document.getElementById("search");
                        el?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm transition hover:bg-muted/40"
                      title="Фильтровать по категории"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {nf.format(c.places)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Категории */}
      {allCategories.length ? (
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">Категории</div>

          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Chip
                active={!categoryId}
                onClick={() => setCategoryId("")}
                text="Все"
              />
              {allCategories.map((c) => (
                <Chip
                  key={c.id}
                  active={categoryId === c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    setShowFilters(true);
                    const el = document.getElementById("search");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  text={c.name}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Карточки */}
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/place/${p.slug}`}
            className="rounded-2xl border bg-background p-5 transition hover:-translate-y-[1px] hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {p.category.name} • {p.city}
                  {p.address ? ` • ${p.address}` : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">
                  {Number(p.avgRating).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {nf.format(p.ratingCount)} отзывов
                </div>
              </div>
            </div>
          </Link>
        ))}

        {!loading && items.length === 0 ? (
          hasSearched ? (
            <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              Ничего не найдено по этим условиям.
            </div>
          ) : (
            <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              Выберите фильтры и нажмите <b>«Найти»</b>, чтобы увидеть места.
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}

function SearchCard({
  fillParent,
  q,
  setQ,
  showFilters,
  setShowFilters,
  city,
  setCity,
  categoryId,
  setCategoryId,
  sort,
  setSort,
  allCategories,
  loading,
  err,
  onSearch,
  onReset,
}: {
  fillParent?: boolean;
  q: string;
  setQ: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean | ((p: boolean) => boolean)) => void;
  city: string;
  setCity: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  allCategories: Category[];
  loading: boolean;
  err: string | null;
  onSearch: () => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const shellClass = fillParent
    ? "h-full w-full p-6 sm:p-8 md:p-10"
    : "rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur sm:p-8";

  return (
    <div className={shellClass}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold sm:text-lg">Поиск мест</div>
          <div className="mt-1 text-sm text-muted-foreground sm:text-base">
            Название, адрес или описание — плюс фильтры по городу/категории.
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 sm:text-base"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
        </button>
      </div>

      <form
        className="mt-6 grid gap-4"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          await onSearch();
        }}
      >
        <div className="grid gap-3 md:grid-cols-12 md:items-stretch">
          <div className="md:col-span-8">
            <input
              className="h-12 w-full rounded-2xl border bg-background px-5 text-base outline-none focus:ring-2 focus:ring-primary/20 sm:h-14 sm:text-lg"
              placeholder="Например: Coffee, СТО, доставка…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-3 md:col-span-4 md:grid-cols-2">
            <button
              type="button"
              className="h-12 rounded-2xl border bg-background px-5 text-base font-medium hover:bg-muted/40 disabled:opacity-50 sm:h-14"
              onClick={onReset}
              disabled={loading}
            >
              Сбросить
            </button>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50 sm:h-14"
              disabled={loading}
            >
              <Search className="h-5 w-5" />
              {loading ? "Ищем…" : "Найти"}
            </button>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-12 rounded-2xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/20 sm:h-14"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            >
              <option value="">Все города (KZ)</option>
              {KZ_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-2xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/20 sm:h-14"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
            >
              <option value="">Все категории</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-2xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/20 sm:h-14"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              disabled={loading}
            >
              <option value="rating_desc">Сначала высокий рейтинг</option>
              <option value="reviews_desc">Сначала больше отзывов</option>
              <option value="new_desc">Сначала новые</option>
              <option value="name_asc">По названию A→Z</option>
            </select>
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:text-base">
            {err}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-muted/30">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function Chip({
  text,
  active,
  onClick,
}: {
  text: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted/40",
      ].join(" ")}
    >
      {text}
    </button>
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