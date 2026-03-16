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
type Variant = "hero" | "catalog";
type LoadMode = "replace" | "append";

type PlacesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const nf = new Intl.NumberFormat("ru-RU");
const DEFAULT_LIMIT = 24;
const AUTO_SEARCH_DEBOUNCE_MS = 350;

const EMPTY_META: PlacesMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

function parsePlacesMeta(
  raw: any,
  requestedPage: number,
  itemCount: number,
): PlacesMeta {
  const page =
    typeof raw?.page === "number" && raw.page > 0 ? raw.page : requestedPage;

  const limit =
    typeof raw?.limit === "number" && raw.limit > 0
      ? raw.limit
      : DEFAULT_LIMIT;

  const total =
    typeof raw?.total === "number" && raw.total >= 0 ? raw.total : itemCount;

  const totalPages =
    typeof raw?.totalPages === "number" && raw.totalPages >= 0
      ? raw.totalPages
      : total > 0
        ? Math.ceil(total / limit)
        : 0;

  const hasNextPage =
    typeof raw?.hasNextPage === "boolean" ? raw.hasNextPage : page < totalPages;

  const hasPrevPage =
    typeof raw?.hasPrevPage === "boolean" ? raw.hasPrevPage : page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(variant === "catalog");
  const [meta, setMeta] = useState<PlacesMeta>(EMPTY_META);

  const placesAbortRef = useRef<AbortController | null>(null);
  const skipNextAutoSearchRef = useRef(false);

  const buildQueryString = useCallback(
    (
      override?: Partial<{
        q: string;
        city: string;
        categoryId: string;
        sort: SortKey;
        page: number;
        limit: number;
      }>,
    ) => {
      const p = new URLSearchParams();

      const q0 = (override?.q ?? q).trim();
      const city0 = (override?.city ?? city).trim();
      const categoryId0 = (override?.categoryId ?? categoryId).trim();
      const sort0 = override?.sort ?? sort;
      const page0 = override?.page ?? 1;
      const limit0 = override?.limit ?? DEFAULT_LIMIT;

      if (q0) p.set("q", q0);
      if (city0) p.set("city", city0);
      if (categoryId0) p.set("categoryId", categoryId0);
      if (sort0) p.set("sort", sort0);

      p.set("page", String(page0));
      p.set("limit", String(limit0));

      return p.toString();
    },
    [q, city, categoryId, sort],
  );

  const loadPlaces = useCallback(
    async ({
      qs,
      mode,
      requestedPage,
    }: {
      qs: string;
      mode: LoadMode;
      requestedPage: number;
    }) => {
      placesAbortRef.current?.abort();
      const ctrl = new AbortController();
      placesAbortRef.current = ctrl;

      setErr(null);

      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch(`/api/places?${qs}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });

        if (ctrl.signal.aborted) return;

        const data = await safeJson(res);
        if (!res.ok) {
          throw new Error((data as any)?.error ?? "Не удалось загрузить места");
        }

        const nextItems = Array.isArray((data as any)?.items)
          ? ((data as any).items as PlaceCard[])
          : [];

        const nextMeta = parsePlacesMeta(
          (data as any)?.meta,
          requestedPage,
          nextItems.length,
        );

        setMeta(nextMeta);
        setItems((prev) =>
          mode === "append" ? [...prev, ...nextItems] : nextItems,
        );
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setErr(e?.message ?? "Ошибка");

        if (mode === "replace") {
          setItems([]);
          setMeta(EMPTY_META);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const catsRes = await fetch("/api/categories", {
          cache: "no-store",
          signal: ctrl.signal,
        });

        if (ctrl.signal.aborted) return;

        const catsData = await safeJson(catsRes);
        const list =
          catsRes.ok && Array.isArray((catsData as any)?.items)
            ? ((catsData as any).items as Category[])
            : [];

        setCategories(list);
      } catch {
        if (ctrl.signal.aborted) return;
        setCategories([]);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const allCategories = useMemo(() => categories, [categories]);

  useEffect(() => {
    if (variant !== "hero" || hasInteracted) return;

    if (q.trim() || city || categoryId || sort !== "rating_desc") {
      setHasInteracted(true);
    }
  }, [variant, hasInteracted, q, city, categoryId, sort]);

  useEffect(() => {
    if (!hasInteracted) return;

    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      setHasSearched(true);

      const qs = buildQueryString({
        page: 1,
        limit: DEFAULT_LIMIT,
      });

      void loadPlaces({
        qs,
        mode: "replace",
        requestedPage: 1,
      });
    }, AUTO_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [hasInteracted, q, city, categoryId, sort, buildQueryString, loadPlaces]);

  useEffect(() => {
    return () => {
      placesAbortRef.current?.abort();
    };
  }, []);

  async function onSearchClick() {
    skipNextAutoSearchRef.current = true;
    setHasInteracted(true);
    setHasSearched(true);

    const qs = buildQueryString({
      page: 1,
      limit: DEFAULT_LIMIT,
    });

    await loadPlaces({
      qs,
      mode: "replace",
      requestedPage: 1,
    });
  }

  async function onLoadMore() {
    if (loading || loadingMore || !meta.hasNextPage) return;

    const nextPage = meta.page + 1;
    const qs = buildQueryString({
      page: nextPage,
      limit: meta.limit || DEFAULT_LIMIT,
    });

    await loadPlaces({
      qs,
      mode: "append",
      requestedPage: nextPage,
    });
  }

  async function resetFilters() {
    skipNextAutoSearchRef.current = true;

    setQ("");
    setCity("");
    setCategoryId("");
    setSort("rating_desc");
    setHasInteracted(true);
    setHasSearched(true);

    const qs = buildQueryString({
      q: "",
      city: "",
      categoryId: "",
      sort: "rating_desc",
      page: 1,
      limit: DEFAULT_LIMIT,
    });

    await loadPlaces({
      qs,
      mode: "replace",
      requestedPage: 1,
    });
  }

  return (
    <section
      id="explore"
      className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-72 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
      />

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
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">KZ</span>
                <span>Отзывы только от верифицированных пользователей</span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Нам важно ваше мнение!
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                Clarify помогает выбирать места по реальным отзывам и рейтингу,
                а компаниям — получать прозрачную обратную связь и отвечать
                официально.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#search"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:w-auto"
                >
                  <Search className="h-4 w-4" />
                  Найти места
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
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Доверие к отзывам"
              desc="Верификация через OTP снижает спам и повышает качество"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <FeatureCard
              title="Чистый контент"
              desc="Модерация и проверки на сервере поддерживают порядок"
              icon={<SlidersHorizontal className="h-4 w-4" />}
            />
            <FeatureCard
              title="Диалог с компанией"
              desc="Компании отвечают на отзывы официально — всё прозрачно"
              icon={<MessageCircle className="h-4 w-4" />}
            />
          </div>

          <div id="search" className="mt-8 scroll-mt-24">
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
              loading={loading || loadingMore}
              err={err}
              onSearch={onSearchClick}
              onReset={resetFilters}
            />
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
            loading={loading || loadingMore}
            err={err}
            onSearch={onSearchClick}
            onReset={resetFilters}
          />
        </div>
      )}

      {allCategories.length ? (
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">Категории</div>

          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Chip
                active={!categoryId}
                onClick={() => {
                  setHasInteracted(true);
                  setCategoryId("");
                }}
                text="Все"
              />
              {allCategories.map((c) => (
                <Chip
                  key={c.id}
                  active={categoryId === c.id}
                  onClick={() => {
                    setHasInteracted(true);
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

      {hasSearched && !err ? (
        <div className="mt-6 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>Найдено: {nf.format(meta.total)}</div>
          {items.length > 0 ? (
            <div>
              Показано: {nf.format(items.length)}
              {meta.total > 0 ? ` из ${nf.format(meta.total)}` : ""}
            </div>
          ) : null}
        </div>
      ) : null}

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

        {!loading && !loadingMore && items.length === 0 ? (
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

      {hasSearched && items.length > 0 && meta.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading || loadingMore}
            className="inline-flex h-11 items-center justify-center rounded-2xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
          >
            {loadingMore ? "Загружаем…" : "Показать ещё"}
          </button>
        </div>
      ) : null}
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
              className="h-12 rounded-2xl border bg-background px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark] sm:h-14"
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
              className="h-12 rounded-2xl border bg-background px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark] sm:h-14"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
            >
              <option value="">Все категории</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-2xl border bg-background px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark] sm:h-14"
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

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}