import { assertKzCity } from "@/shared/kz/kz";

export type AddressCheckResult = {
  lat: number;
  lng: number;
  normalizedAddress: string;
  provider: "2gis";
};

const VALIDATION_CACHE_TTL_MS = 10 * 60_000;
const MAX_VALIDATION_CACHE_SIZE = 300;

type ValidationCacheEntry = {
  expiresAt: number;
  value: AddressCheckResult;
};

const validationCache = new Map<string, ValidationCacheEntry>();
const validationInflight = new Map<string, Promise<AddressCheckResult | null>>();

function norm(s: string) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function normLower(s: string) {
  return norm(s).toLowerCase();
}

function normalizeHouseToken(value: string) {
  return norm(value)
    .replace(/\s+/g, "")
    .replace(/ё/gi, "е")
    .toUpperCase();
}

// Сначала ищем явное "дом 111" / "д. 111".
// Если нет — берём ПОСЛЕДНИЙ числовой блок, а не первый.
// Это важно для адресов вроде "мкр Самал-2, дом 111".
function extractDesiredHouse(address: string): string | null {
  const a = norm(address);

  const explicit =
    a.match(
      /(?:^|[\s,;])(?:дом|д\.?)\s*([0-9]{1,5}[A-Za-zА-Яа-яЁё]?(?:[/-][0-9]{1,4})?)/iu,
    ) ?? null;

  if (explicit?.[1]) {
    return normalizeHouseToken(explicit[1]);
  }

  const all = Array.from(
    a.matchAll(/\b([0-9]{1,5}[A-Za-zА-Яа-яЁё]?(?:[/-][0-9]{1,4})?)\b/gu),
  );

  if (!all.length) return null;

  return normalizeHouseToken(all[all.length - 1][1]);
}

function leadingDigits(value: string) {
  const m = value.match(/^\d+/);
  return m?.[0] ?? "";
}

function houseScore(inputHouse: string, candidateHouse: string) {
  const a = normalizeHouseToken(inputHouse);
  const b = normalizeHouseToken(candidateHouse);

  if (a === b) return 5;

  const aDigits = leadingDigits(a);
  const bDigits = leadingDigits(b);

  if (aDigits && bDigits && aDigits === bDigits) {
    return 2;
  }

  return 0;
}

function streetKeywords(address: string): string[] {
  const a = normLower(address)
    .replace(/\d/g, " ")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ");

  const stop = new Set([
    "ул",
    "улица",
    "пр",
    "пр-т",
    "просп",
    "проспект",
    "пл",
    "площадь",
    "бул",
    "бульвар",
    "пер",
    "переулок",
    "ш",
    "шоссе",
    "наб",
    "набережная",
    "мкр",
    "микрорайон",
    "м-н",
    "дом",
    "д",
    "корпус",
    "к",
    "строение",
    "с",
    "район",
    "р-н",
  ]);

  return a
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 3)
    .filter((w) => !stop.has(w));
}

function getValidationCacheKey(city: string, address: string) {
  return `${normLower(city)}::${normLower(address)}`;
}

function cleanupValidationCache(now = Date.now()) {
  for (const [key, entry] of validationCache) {
    if (entry.expiresAt <= now) {
      validationCache.delete(key);
    }
  }

  while (validationCache.size > MAX_VALIDATION_CACHE_SIZE) {
    const oldestKey = validationCache.keys().next().value;
    if (!oldestKey) break;
    validationCache.delete(oldestKey);
  }
}

function readValidationCache(cacheKey: string): AddressCheckResult | null {
  const entry = validationCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    validationCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function writeValidationCache(
  cacheKey: string,
  value: AddressCheckResult,
) {
  cleanupValidationCache();
  validationCache.set(cacheKey, {
    expiresAt: Date.now() + VALIDATION_CACHE_TTL_MS,
    value,
  });
}

async function geocode2gis(params: {
  city: string;
  address: string;
  desiredHouse: string;
  kw: string[];
}): Promise<AddressCheckResult | null> {
  const key = process.env.TWOGIS_GEOCODER_API_KEY;
  if (!key) {
    throw new Error(
      "Адрес: не настроен ключ 2GIS. Добавьте TWOGIS_GEOCODER_API_KEY в .env.local",
    );
  }

  const url = new URL("https://catalog.api.2gis.com/3.0/items/geocode");
  url.searchParams.set("q", `${params.address}, ${params.city}, Казахстан`);
  url.searchParams.set("fields", "items.point");
  url.searchParams.set("page_size", "5");
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Адрес: 2GIS отклонил запрос. Проверьте TWOGIS_GEOCODER_API_KEY.",
        );
      }

      if (res.status === 429) {
        throw new Error(
          "Адрес: 2GIS временно ограничил запросы. Попробуйте ещё раз чуть позже.",
        );
      }

      throw new Error("Адрес: сервис 2GIS временно недоступен.");
    }

    const data = (await res.json().catch(() => null)) as
      | {
          result?: {
            items?: Array<{
              type?: string;
              name?: string;
              address_name?: string;
              full_name?: string;
              point?: { lat?: number; lon?: number };
            }>;
          };
        }
      | null;

    const items = data?.result?.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    let best:
      | (AddressCheckResult & {
          score: number;
        })
      | null = null;

    for (const item of items) {
      const lat = Number(item?.point?.lat);
      const lng = Number(item?.point?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const addressName = norm(String(item?.address_name ?? ""));
      const fullName = norm(String(item?.full_name ?? ""));
      const display = addressName || fullName || norm(params.address);
      const text = normLower(`${addressName} ${fullName} ${item?.name ?? ""}`);

      let score = 0;

      if (item?.type === "building") score += 4;

      const candidateHouse = extractDesiredHouse(display);
      if (candidateHouse) {
        score += houseScore(params.desiredHouse, candidateHouse);
      }

      if (params.kw.length > 0 && params.kw.some((k) => text.includes(k))) {
        score += 2;
      }

      if (text.includes(normLower(params.city))) {
        score += 1;
      }

      const candidate: AddressCheckResult & { score: number } = {
        lat,
        lng,
        normalizedAddress: display,
        provider: "2gis",
        score,
      };

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }

    if (!best) return null;

    // Принимаем только если:
    // - либо найдено хорошее building-совпадение,
    // - либо в целом адрес совпал достаточно уверенно.
    if (best.score >= 6) {
      return {
        lat: best.lat,
        lng: best.lng,
        normalizedAddress: best.normalizedAddress,
        provider: "2gis",
      };
    }

    return null;
  } catch (e: any) {
    if (String(e?.name) === "AbortError") {
      throw new Error(
        "Адрес: 2GIS слишком долго отвечает, попробуйте ещё раз.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCachedGeocode2gis(params: {
  city: string;
  address: string;
  desiredHouse: string;
  kw: string[];
}): Promise<AddressCheckResult | null> {
  const cacheKey = getValidationCacheKey(params.city, params.address);

  const cached = readValidationCache(cacheKey);
  if (cached) return cached;

  const inflight = validationInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = geocode2gis(params);

  validationInflight.set(cacheKey, promise);

  try {
    const result = await promise;

    if (result) {
      writeValidationCache(cacheKey, result);
    }

    return result;
  } finally {
    validationInflight.delete(cacheKey);
  }
}

export async function validateKzAddress(params: {
  city: string;
  address: string;
}): Promise<AddressCheckResult> {
  const city = norm(params.city);
  const address = norm(params.address);

  assertKzCity(city, "Город");

  if (address.length < 5) {
    throw new Error("Адрес: минимум 5 символов");
  }

  const desiredHouse = extractDesiredHouse(address);
  if (!desiredHouse) {
    throw new Error(
      "Адрес: укажите номер дома (например «Сейфуллина 34» или «Абиша Кекилбайулы 151»).",
    );
  }

  const kw = streetKeywords(address);

  const result = await getCachedGeocode2gis({
    city,
    address,
    desiredHouse,
    kw,
  });

  if (!result) {
    throw new Error(
      "Адрес: 2GIS не смог уверенно подтвердить этот адрес. Проверьте улицу и номер дома.",
    );
  }

  return result;
}