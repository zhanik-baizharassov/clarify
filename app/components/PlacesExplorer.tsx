"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KZ_CITIES } from "@/lib/kz";

type Category = { id: string; name: string; slug: string; parentId: string | null };
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
  topCities: { city: string; places: number; avgRating: number; reviews: number }[];
  topCategories: { id: string; name: string; places: number }[];
};

export default function PlacesExplorer() {
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
      try {
        const [catsRes, aRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/analytics/overview", { cache: "no-store" }),
        ]);

        const catsData = await catsRes.json().catch(() => null);
        const list = Array.isArray(catsData?.items) ? (catsData.items as Category[]) : [];
        setCategories(list);

        const aData = await aRes.json().catch(() => null);
        if (aRes.ok) setAnalytics(aData as Analytics);
      } catch {
        setCategories([]);
        setAnalytics(null);
      }
    })();
  }, []);

  const subCategories = useMemo(
    () => categories.filter((c) => c.parentId !== null),
    [categories]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/places?${queryString}`, { cache: "no-store" });
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
      {/* KPI + charts */}
      {analytics ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Kpi title="Карточек" value={analytics.totals.places} />
          <Kpi title="Отзывов" value={analytics.totals.reviews} />
          <Kpi title="Пользователей" value={analytics.totals.users} />
          <Kpi title="Компаний" value={analytics.totals.companies} />
        </div>
      ) : null}

      {analytics?.topCities?.length ? (
        <div className="mt-4 rounded-2xl border p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Активность по городам</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Топ городов по количеству карточек
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <MiniBarChart rows={analytics.topCities.map((c) => ({ label: c.city, value: c.places }))} />
          </div>
        </div>
      ) : null}

      {/* Категории-слайдер */}
      {subCategories.length ? (
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">Категории</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Chip
              active={!categoryId}
              onClick={() => setCategoryId("")}
              text="Все"
            />
            {subCategories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setShowFilters(true);
                }}
                text={c.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Поиск */}
      <div className="mt-6 rounded-2xl border p-5">
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
              className="h-11 rounded-xl border px-4"
              onClick={() => setShowFilters((v) => !v)}
            >
              Фильтры
            </button>

            <button
              type="button"
              className="h-11 rounded-xl bg-black px-6 text-white disabled:opacity-50"
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
              {subCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
                <div className="text-xl font-bold">{Number(p.avgRating).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{p.ratingCount} отзывов</div>
              </div>
            </div>
          </Link>
        ))}

        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            Ничего не найдено по этим условиям.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{Intl.NumberFormat("ru-RU").format(value)}</div>
    </div>
  );
}

function Chip({ text, active, onClick }: { text: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
        active ? "bg-black text-white border-black" : "bg-background hover:bg-muted/40",
      ].join(" ")}
    >
      {text}
    </button>
  );
}

function MiniBarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="grid gap-2">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">{r.label}</div>
            <div className="font-medium">{r.value}</div>
          </div>
          <div className="h-2 rounded-full bg-muted/40">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
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