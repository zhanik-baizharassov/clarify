import { NextResponse } from "next/server";
import {
  consumeRateLimit,
  createRateLimitResponse,
  getRequestIp,
} from "@/server/security/rate-limit";
import { assertKzCity } from "@/shared/kz/kz";

export const runtime = "nodejs";

const SUGGEST_CACHE_TTL_MS = 60_000;
const MAX_SUGGEST_CACHE_SIZE = 300;

function norm(s: string | null | undefined) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

type SuggestItem = {
  value: string;
  label: string;
  lat: number | null;
  lng: number | null;
};

type SuggestCacheEntry = {
  expiresAt: number;
  items: SuggestItem[];
};

const suggestCache = new Map<string, SuggestCacheEntry>();
const suggestInflight = new Map<string, Promise<SuggestItem[]>>();

class SuggestHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getSuggestCacheKey(city: string, q: string) {
  return `${city.toLowerCase()}::${q.toLowerCase()}`;
}

function cleanupSuggestCache(now = Date.now()) {
  for (const [key, entry] of suggestCache) {
    if (entry.expiresAt <= now) {
      suggestCache.delete(key);
    }
  }

  while (suggestCache.size > MAX_SUGGEST_CACHE_SIZE) {
    const oldestKey = suggestCache.keys().next().value;
    if (!oldestKey) break;
    suggestCache.delete(oldestKey);
  }
}

function readSuggestCache(cacheKey: string): SuggestItem[] | null {
  const entry = suggestCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    suggestCache.delete(cacheKey);
    return null;
  }

  return entry.items;
}

function writeSuggestCache(cacheKey: string, items: SuggestItem[]) {
  cleanupSuggestCache();
  suggestCache.set(cacheKey, {
    expiresAt: Date.now() + SUGGEST_CACHE_TTL_MS,
    items,
  });
}

async function fetchSuggestItems(params: {
  city: string;
  q: string;
  apiKey: string;
  cacheKey: string;
}): Promise<SuggestItem[]> {
  const cached = readSuggestCache(params.cacheKey);
  if (cached) return cached;

  const inflight = suggestInflight.get(params.cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    const url = new URL("https://catalog.api.2gis.com/3.0/suggests");
    url.searchParams.set("q", `${params.city} ${params.q}`);
    url.searchParams.set("suggest_type", "address");
    url.searchParams.set("type", "building");
    url.searchParams.set("fields", "items.point");
    url.searchParams.set("key", params.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new SuggestHttpError(
            500,
            "2GIS отклонил запрос. Проверьте API key.",
          );
        }

        if (res.status === 429) {
          throw new SuggestHttpError(
            429,
            "2GIS временно ограничил запросы. Попробуйте позже.",
          );
        }

        throw new SuggestHttpError(502, "2GIS Suggest временно недоступен.");
      }

      const data = (await res.json().catch(() => null)) as
        | {
            result?: {
              items?: Array<{
                name?: string;
                full_name?: string;
                address_name?: string;
                point?: {
                  lat?: number;
                  lon?: number;
                };
              }>;
            };
          }
        | null;

      const rawItems = Array.isArray(data?.result?.items)
        ? data.result.items
        : [];

      const seen = new Set<string>();
      const items: SuggestItem[] = [];

      for (const item of rawItems) {
        const addressName = norm(item?.address_name);
        const fullName = norm(item?.full_name);
        const name = norm(item?.name);

        const value = addressName || name || fullName;
        const label = fullName || addressName || name;

        if (!value || !label) continue;
        if (seen.has(value.toLowerCase())) continue;

        seen.add(value.toLowerCase());

        const lat =
          typeof item?.point?.lat === "number" ? item.point.lat : null;
        const lng =
          typeof item?.point?.lon === "number" ? item.point.lon : null;

        items.push({
          value,
          label,
          lat,
          lng,
        });

        if (items.length >= 6) break;
      }

      writeSuggestCache(params.cacheKey, items);

      return items;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SuggestHttpError(
          504,
          "2GIS слишком долго отвечает. Попробуйте ещё раз.",
        );
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  })();

  suggestInflight.set(params.cacheKey, promise);

  try {
    return await promise;
  } finally {
    suggestInflight.delete(params.cacheKey);
  }
}

export async function GET(req: Request) {
  try {
    const ip = getRequestIp(req);

    const rateLimit = await consumeRateLimit({
      scope: "address:suggest:ip",
      key: ip,
      limit: 30,
      windowSec: 60,
    });

    if (!rateLimit.ok) {
      return createRateLimitResponse(
        rateLimit,
        "Слишком много запросов к подсказкам адреса. Попробуйте позже.",
        { items: [] },
      );
    }

    const { searchParams } = new URL(req.url);

    const q = norm(searchParams.get("q"));
    const cityRaw = norm(searchParams.get("city"));

    if (!q || q.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const city = assertKzCity(cityRaw, "Город");

    const apiKey = process.env.TWOGIS_GEOCODER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Не настроен TWOGIS_GEOCODER_API_KEY" },
        { status: 500 },
      );
    }

    const cacheKey = getSuggestCacheKey(city, q);
    const items = await fetchSuggestItems({
      city,
      q,
      apiKey,
      cacheKey,
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    if (err instanceof SuggestHttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    if (err instanceof Error && err.message.includes("Город")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Не удалось получить подсказки адреса" },
      { status: 500 },
    );
  }
}