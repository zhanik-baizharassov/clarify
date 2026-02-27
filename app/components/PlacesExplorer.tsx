"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        // ✅ твой формат: { items: categories }
        const list = Array.isArray(data?.items) ? (data.items as Category[]) : [];
        setCategories(list);
      } catch {
        setCategories([]);
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
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Отзывы и сортировка мест</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ищи по всем сферам: еда, магазины, сервисы, ремонт и т.д.
      </p>

      {/* Поиск */}
      <div className="mt-6 rounded-xl border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="h-10 w-full rounded-md border px-3"
            placeholder="Поиск по названию/адресу/описанию…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 rounded-md border px-4"
              onClick={() => setShowFilters((v) => !v)}
            >
              Фильтры
            </button>

            <button
              type="button"
              className="h-10 rounded-md bg-black px-6 text-white disabled:opacity-50"
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
            <input
              className="h-10 rounded-md border px-3"
              placeholder="Город (например: Алматы)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <select
              className="h-10 rounded-md border px-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Все категории</option>

              {/* ✅ как у тебя было: показываем только подкатегории */}
              {subCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border px-3"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="rating_desc">Сначала высокий рейтинг</option>
              <option value="reviews_desc">Сначала больше отзывов</option>
              <option value="new_desc">Сначала новые</option>
              <option value="name_asc">По названию A→Z</option>
            </select>

            <button type="button" className="h-10 rounded-md border px-4" onClick={resetFilters}>
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
            className="rounded-xl border p-5 hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold">{p.name}</div>
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
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Ничего не найдено по этим условиям.
          </div>
        ) : null}
      </div>
    </main>
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