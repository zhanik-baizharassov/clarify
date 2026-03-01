"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { KZ_CITIES } from "@/lib/kz";

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

const nf = new Intl.NumberFormat("ru-RU");

export default function PlacesExplorer({ isAuthed }: { isAuthed?: boolean }) {
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

  const debouncedQ = useDebouncedValue(q, 350);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ.trim()) p.set("q", debouncedQ.trim());
    if (city.trim()) p.set("city", city.trim());
    if (categoryId) p.set("categoryId", categoryId);
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [debouncedQ, city, categoryId, sort]);

  useEffect(() => {
    (async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      try {
        const [catsRes, aRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/analytics/overview", { cache: "no-store" }),
        ]);

        // categories
        const catsData = await catsRes.json().catch(() => null);
        const list = Array.isArray(catsData?.items)
          ? (catsData.items as Category[])
          : [];
        setCategories(list);

        // analytics
        const aText = await aRes.text();
        const aData = aText ? JSON.parse(aText) : null;

        if (!aRes.ok) {
          setAnalytics(null);
          setAnalyticsError(aData?.error ?? "Не удалось загрузить аналитику");
        } else {
          setAnalytics(aData as Analytics);
        }
      } catch {
        setCategories([]);
        setAnalytics(null);
        setAnalyticsError("Не удалось загрузить аналитику");
      } finally {
        setAnalyticsLoading(false);
      }
    })();
  }, []);

  const allCategories = useMemo(() => categories, [categories]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/places?${queryString}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить места");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function resetFilters() {
    setCity("");
    setCategoryId("");
    setSort("rating_desc");
  }

  return (
    <section id="explore" className="mx-auto max-w-5xl px-6 py-10">
      {/* HERO */}
      <div className="rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
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
          Оценивай заведения и сервисы Казахстана честно: еда, магазины, ремонт,
          услуги и многое другое.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="#search"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Search className="h-4 w-4" />
            Найти места
          </a>

          {!isAuthed ? (
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-xl border bg-background px-5 text-sm font-medium"
            >
              Зарегистрироваться
            </Link>
          ) : null}
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
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

      {/* KPI + charts */}
      <div className="mt-6">
        {analyticsLoading ? (
          <div className="grid gap-3 md:grid-cols-4">
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
        ) : analytics ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Kpi
              title="Карточек"
              value={analytics.totals.places}
              icon={<MapPin className="h-4 w-4" />}
            />
            <Kpi
              title="Отзывов"
              value={analytics.totals.reviews}
              icon={<MessageCircle className="h-4 w-4" />}
            />
            <Kpi
              title="Пользователей"
              value={analytics.totals.users}
              icon={<Users className="h-4 w-4" />}
            />
            <Kpi
              title="Компаний"
              value={analytics.totals.companies}
              icon={<Building2 className="h-4 w-4" />}
            />
          </div>
        ) : (
          <div className="rounded-2xl border bg-background p-5 text-sm text-muted-foreground">
            Аналитика временно недоступна
            {analyticsError ? `: ${analyticsError}` : "."}
          </div>
        )}

        {analytics?.topCities?.length ? (
          <div className="mt-4 rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">
                  Активность по городам
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Топ городов по количеству карточек
                </div>
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
          <div className="mt-4 rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">
                  Популярные категории
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Топ категорий по количеству карточек
                </div>
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
                    // прокрутим к поиску, чтобы было понятно что фильтр применился
                    const el = document.getElementById("search");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      {/* Категории-слайдер */}
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

      {/* Поиск */}
      <div
        id="search"
        className="mt-6 scroll-mt-24 rounded-2xl border bg-background p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="h-11 w-full rounded-xl border px-4"
            placeholder="Поиск по названию/адресу/описанию…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border px-4"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
            </button>

            <button
              type="button"
              className="h-11 rounded-xl bg-primary px-6 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              {loading ? "…" : "Найти"}
            </button>
          </div>
        </div>

        {/* Фильтры */}
        {showFilters ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {/* ✅ ГОРОДА ТОЛЬКО KZ */}
            <select
              className="h-11 rounded-xl border px-3"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Все города (KZ)</option>
              {KZ_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-xl border px-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Все категории</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-xl border px-3"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="rating_desc">Сначала высокий рейтинг</option>
              <option value="reviews_desc">Сначала больше отзывов</option>
              <option value="new_desc">Сначала новые</option>
              <option value="name_asc">По названию A→Z</option>
            </select>

            <button
              type="button"
              className="h-11 rounded-xl border px-4"
              onClick={resetFilters}
            >
              Сбросить
            </button>
          </div>
        ) : null}
      </div>

      {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

      {/* Карточки */}
      <div className="mt-6 grid gap-3">
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
          <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
            Ничего не найдено по этим условиям.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
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

function Kpi({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold">{nf.format(value)}</div>
        </div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-muted/30 text-muted-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
      <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted/50" />
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
