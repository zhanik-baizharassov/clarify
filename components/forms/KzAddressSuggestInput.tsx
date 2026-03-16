"use client";

import { useEffect, useRef, useState } from "react";

type SuggestItem = {
  value: string;
  label: string;
  lat: number | null;
  lng: number | null;
};

const CLIENT_SUGGEST_CACHE_TTL_MS = 60_000;
const MAX_CLIENT_SUGGEST_CACHE_SIZE = 200;

type ClientSuggestCacheEntry = {
  expiresAt: number;
  items: SuggestItem[];
};

const clientSuggestCache = new Map<string, ClientSuggestCacheEntry>();

function getClientSuggestCacheKey(city: string, q: string) {
  return `${city.trim().toLowerCase()}::${q.trim().toLowerCase()}`;
}

function cleanupClientSuggestCache(now = Date.now()) {
  for (const [key, entry] of clientSuggestCache) {
    if (entry.expiresAt <= now) {
      clientSuggestCache.delete(key);
    }
  }

  while (clientSuggestCache.size > MAX_CLIENT_SUGGEST_CACHE_SIZE) {
    const oldestKey = clientSuggestCache.keys().next().value;
    if (!oldestKey) break;
    clientSuggestCache.delete(oldestKey);
  }
}

function readClientSuggestCache(cacheKey: string): SuggestItem[] | null {
  const entry = clientSuggestCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    clientSuggestCache.delete(cacheKey);
    return null;
  }

  return entry.items;
}

function writeClientSuggestCache(cacheKey: string, items: SuggestItem[]) {
  cleanupClientSuggestCache();
  clientSuggestCache.set(cacheKey, {
    expiresAt: Date.now() + CLIENT_SUGGEST_CACHE_TTL_MS,
    items,
  });
}

export default function KzAddressSuggestInput({
  city,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  city: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (disabled) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setLocalError(null);
      return;
    }

    const q = value.trim();
    const cityValue = city.trim();

    if (!cityValue || q.length < 3) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setLocalError(null);
      return;
    }

    const cacheKey = getClientSuggestCacheKey(cityValue, q);
    const cached = readClientSuggestCache(cacheKey);

    if (cached) {
      setItems(cached);
      setOpen(true);
      setLoading(false);
      setLocalError(null);
      return;
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setLocalError(null);

      try {
        const res = await fetch(
          `/api/address/suggest?q=${encodeURIComponent(q)}&city=${encodeURIComponent(cityValue)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: ctrl.signal,
          },
        );

        const data = await res.json().catch(() => ({}));
        if (ctrl.signal.aborted) return;

        if (!res.ok) {
          throw new Error(
            data?.error ?? "Не удалось загрузить подсказки адреса",
          );
        }

        const nextItems = Array.isArray(data?.items) ? data.items : [];
        writeClientSuggestCache(cacheKey, nextItems);

        setItems(nextItems);
        setOpen(true);
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setItems([]);
        setOpen(false);
        setLocalError(e?.message ?? "Ошибка подсказок адреса");
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(t);
  }, [city, value, disabled]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function selectItem(item: SuggestItem) {
    onChange(item.value);
    setItems([]);
    setOpen(false);
    setLocalError(null);
  }

  const showEmpty =
    open &&
    !loading &&
    value.trim().length >= 3 &&
    items.length === 0 &&
    !localError;

  return (
    <div className="relative">
      <input
        disabled={disabled}
        className="h-11 w-full rounded-xl border px-3 disabled:opacity-60"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
        autoComplete="street-address"
      />

      {loading ? (
        <div className="mt-1 text-xs text-muted-foreground">
          Ищем подсказки 2GIS...
        </div>
      ) : null}

      {localError ? (
        <div className="mt-1 text-xs text-destructive">{localError}</div>
      ) : null}

      {showEmpty ? (
        <div className="mt-1 text-xs text-muted-foreground">
          Подсказки не найдены. Можно продолжить ввод вручную.
        </div>
      ) : null}

      {open && items.length > 0 ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border bg-background p-2 shadow-lg">
          {items.map((item, index) => (
            <button
              key={`${item.value}-${index}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-muted/40"
            >
              <div className="text-sm font-medium">{item.value}</div>
              {item.label !== item.value ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.label}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}