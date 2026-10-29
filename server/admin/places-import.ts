// server/admin/places-import.ts
// Pure validation / mapping for the admin CSV places import. No Next.js or
// database imports so it can be unit-tested; the route does the I/O.

import { validateKzAddress } from "@/server/address/validate";
import { assertNoProfanity } from "@/server/security/profanity";
import { assertKzCity, normalizeKzPhone } from "@/shared/kz/kz";
import { canonicalizeRecord } from "@/shared/places-import-template";

export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 1000;
export const WORK_HOURS_MAX = 120;
export const WEBSITE_MAX = 200;

export type CategoryRef = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type CategoryLookup = Map<string, CategoryRef>;

export type ImportPlaceData = {
  name: string;
  categoryId: string;
  city: string;
  address: string;
  phone: string | null;
  description: string | null;
  website: string | null;
  workHours: string | null;
  lat: number | null;
  lng: number | null;
};

export type RowValidation =
  | { ok: true; place: ImportPlaceData }
  | { ok: false; error: string };

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase().replace(/ё/g, "е");
}

/** Slug and name of every category (active or not) -> category; slug wins over name. */
export function buildCategoryLookup(categories: CategoryRef[]): CategoryLookup {
  const map: CategoryLookup = new Map();
  for (const c of categories) map.set(norm(c.name), c);
  for (const c of categories) map.set(norm(c.slug), c);
  return map;
}

/** Same key the unique index / existing admin route use: city + address + name. */
export function placeKey(city: string, address: string, name: string) {
  return JSON.stringify([city, address, name]);
}

function parseCoordinate(raw: string, label: string, min: number, max: number) {
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${label}: укажите число от ${min} до ${max} (например 43.2389)`);
  }
  return n;
}

function normalizeWebsite(raw: string) {
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Сайт: некорректный адрес");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Сайт: допустимы только http:// и https:// ссылки");
  }
  if (!url.hostname.includes(".")) {
    throw new Error("Сайт: некорректный адрес");
  }
  const value = url.toString();
  if (value.length > WEBSITE_MAX) {
    throw new Error(`Сайт: слишком длинная ссылка (максимум ${WEBSITE_MAX} символов)`);
  }
  return value;
}

/** Lenient phone input for spreadsheets: 8XXXXXXXXXX / 7XXXXXXXXXX become +7XXXXXXXXXX. */
function toPhone(raw: string) {
  const compact = raw.replace(/[()\s-]/g, "");
  const normalized = /^[78]\d{10}$/.test(compact) ? `+7${compact.slice(1)}` : raw;
  return normalizeKzPhone(normalized, "Телефон");
}

/**
 * Validates one CSV row (all problems of the row are reported at once).
 * `data` may use canonical or Russian header names.
 */
export async function validateImportRow(
  data: Record<string, unknown>,
  categories: CategoryLookup,
): Promise<RowValidation> {
  const raw = canonicalizeRecord(data);
  const errors: string[] = [];

  const collect = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Некорректное значение");
      return undefined;
    }
  };

  const name = collect(() => {
    const v = (raw.name ?? "").trim().replace(/\s+/g, " ");
    if (v.length < 2) throw new Error("Название: минимум 2 символа");
    if (v.length > NAME_MAX) throw new Error("Название слишком длинное");
    assertNoProfanity(v, "Название места");
    return v;
  });

  const category = collect(() => {
    const v = (raw.category ?? "").trim();
    if (!v) throw new Error("Категория обязательна");
    const found = categories.get(norm(v));
    if (!found) throw new Error(`Категория «${v}» не найдена (укажите название или slug)`);
    if (!found.isActive) throw new Error(`Категория «${found.name}» отключена`);
    return found;
  });

  const city = collect(() => assertKzCity(raw.city ?? "", "Город"));

  const phone = collect(() => {
    const v = (raw.phone ?? "").trim();
    return v ? toPhone(v) : null;
  });

  const description = collect(() => {
    const v = (raw.description ?? "").trim();
    if (!v) return null;
    if (v.length > DESCRIPTION_MAX) {
      throw new Error(`Описание слишком длинное (максимум ${DESCRIPTION_MAX} символов)`);
    }
    assertNoProfanity(v, "Описание");
    return v;
  });

  const website = collect(() => {
    const v = (raw.website ?? "").trim();
    return v ? normalizeWebsite(v) : null;
  });

  const workHours = collect(() => {
    const v = (raw.work_hours ?? "").trim().replace(/\s+/g, " ");
    if (!v) return null;
    if (v.length > WORK_HOURS_MAX) {
      throw new Error(`Часы работы: максимум ${WORK_HOURS_MAX} символов`);
    }
    return v;
  });

  const coords = collect(() => {
    const latRaw = (raw.lat ?? "").trim();
    const lngRaw = (raw.lng ?? "").trim();
    if (!latRaw && !lngRaw) return null;
    if (!latRaw || !lngRaw) {
      throw new Error("Координаты: укажите и широту, и долготу (или оставьте обе пустыми)");
    }
    return {
      lat: parseCoordinate(latRaw, "Широта", -90, 90),
      lng: parseCoordinate(lngRaw, "Долгота", -180, 180),
    };
  });

  // Address (and the pin check) only make sense once the city is valid.
  let address: string | undefined;
  let lat: number | null = null;
  let lng: number | null = null;
  if (city) {
    const checked = await collectAsync(async () => {
      const a = (raw.address ?? "").trim();
      if (a.length > 200) throw new Error("Адрес слишком длинный");
      assertNoProfanity(a, "Адрес");
      return validateKzAddress({
        city,
        address: a,
        lat: coords?.lat,
        lng: coords?.lng,
      });
    }, errors);
    if (checked) {
      address = checked.normalizedAddress;
      lat = checked.lat;
      lng = checked.lng;
    }
  } else if (!(raw.address ?? "").trim()) {
    errors.push("Адрес: минимум 5 символов");
  }

  if (
    errors.length > 0 ||
    !name ||
    !category ||
    !city ||
    !address ||
    phone === undefined ||
    description === undefined ||
    website === undefined ||
    workHours === undefined
  ) {
    return { ok: false, error: errors.join("; ") || "Некорректная строка" };
  }

  return {
    ok: true,
    place: {
      name,
      categoryId: category.id,
      city,
      address,
      phone,
      description,
      website,
      workHours,
      lat,
      lng,
    },
  };
}

async function collectAsync<T>(fn: () => Promise<T>, errors: string[]) {
  try {
    return await fn();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Некорректное значение");
    return undefined;
  }
}

// --- slug (same scheme as app/api/admin/places/route.ts) --------------------

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ә: "a",
  ө: "o", ү: "u", ұ: "u", қ: "k", ғ: "g", ң: "n", і: "i", һ: "h",
};

function translitRuKz(s: string) {
  return s
    .split("")
    .map((ch) => {
      const low = ch.toLowerCase();
      const tr = TRANSLIT[low];
      if (tr === undefined) return ch;
      return ch === low ? tr : tr.toUpperCase();
    })
    .join("");
}

export function slugifyAscii(s: string) {
  const base = translitRuKz(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return base || "place";
}

/** `<name-city>-<time36>-<random6>`: identical shape to the single-create route. */
export function buildPlaceSlug(name: string, city: string, uuid: string, now = Date.now()) {
  return `${slugifyAscii(`${name}-${city}`)}-${now.toString(36)}-${uuid.slice(0, 6)}`;
}
