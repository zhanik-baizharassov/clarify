// lib/address.ts
import { assertKzCity } from "@/lib/kz";

export type AddressCheckResult = {
  lat: number;
  lng: number;
};

function norm(s: string) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function normLower(s: string) {
  return norm(s).toLowerCase();
}

// Достаём "номер дома" из строки: 34, 34а, 34A, 34/1, 34-1, 34к1 и т.п.
function extractHouseNumber(address: string): string | null {
  const a = normLower(address);

  // ищем самый "явный" номер: цифры + опционально буква/суффикс/дробь
  // примеры: 34, 34а, 34a, 34/1, 34-1, 34к1
  const m =
    a.match(/\b(\d{1,5}\s*(?:[a-zа-яё]{1,3})?\s*(?:[\/-]\s*\d{1,3})?)\b/i) ??
    null;

  if (!m) return null;

  return normalizeHouseNumber(m[1]);
}

function normalizeHouseNumber(h: string) {
  return normLower(h)
    .replace(/\s+/g, "")
    .replace(/ё/g, "е")
    .replace(/корпус/g, "к")
    .replace(/строение/g, "с")
    .toUpperCase();
}

// Вытащим ключевые слова улицы (без типа улицы и без цифр)
function streetKeywords(address: string): string[] {
  const a = normLower(address)
    .replace(/\d/g, " ")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ");

  const stop = new Set([
    "ул",
    "улица",
    "пр",
    "проспект",
    "пр-т",
    "просп",
    "площадь",
    "пл",
    "мкр",
    "микрорайон",
    "дом",
    "д",
    "корпус",
    "к",
    "строение",
    "с",
  ]);

  return a
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((w) => w.length >= 3)
    .filter((w) => !stop.has(w));
}

async function geocodeNominatimStrict(params: {
  query: string;
  desiredHouse: string;
  kw: string[];
}): Promise<AddressCheckResult | null> {
  const base =
    process.env.NOMINATIM_BASE_URL ??
    "https://nominatim.openstreetmap.org/search";

  const u = new URL(base);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("limit", "8");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("countrycodes", "kz");
  u.searchParams.set("q", params.query);

  const email = process.env.NOMINATIM_EMAIL;
  if (email) u.searchParams.set("email", email);

  const userAgent =
    process.env.APP_USER_AGENT ??
    "review-kz/1.0 (contact: NOMINATIM_EMAIL not set)";
  const referer = process.env.APP_ORIGIN ?? "http://localhost:3000";

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(u.toString(), {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "accept-language": "ru",
        "user-agent": userAgent,
        referer,
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error(
          "Адрес: сервис проверки перегружен (лимит запросов). Подождите 1–2 минуты и попробуйте снова.",
        );
      }
      if (res.status === 403) {
        throw new Error(
          "Адрес: сервис проверки отклонил запрос (403). Добавь APP_USER_AGENT и NOMINATIM_EMAIL в .env.local.",
        );
      }
      throw new Error("Адрес: сервис проверки временно недоступен");
    }

    const rows = (await res.json().catch(() => [])) as any[];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Ищем строгий матч:
    for (const r of rows) {
      const lat = Number(r?.lat);
      const lng = Number(r?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const addr = r?.address ?? {};
      const houseRaw =
        addr.house_number ?? addr["house_number"] ?? r?.house_number ?? null;

      if (!houseRaw) continue;
      const gotHouse = normalizeHouseNumber(String(houseRaw));

      // ✅ строгий матч номера дома
      if (gotHouse !== params.desiredHouse) continue;

      // ✅ примитивная проверка улицы: keyword должен встречаться в road/pedestrian/display_name
      const roadText = normLower(
        String(addr.road ?? addr.pedestrian ?? addr.footway ?? r?.display_name ?? ""),
      );

      if (params.kw.length) {
        const okStreet = params.kw.some((k) => roadText.includes(k));
        if (!okStreet) continue;
      }

      return { lat, lng };
    }

    return null;
  } catch (e: any) {
    if (String(e?.name) === "AbortError") {
      throw new Error("Адрес: проверка заняла слишком много времени, попробуйте ещё раз");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function geocodePhotonStrict(params: {
  query: string;
  desiredHouse: string;
  kw: string[];
}): Promise<AddressCheckResult | null> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", params.query);
  u.searchParams.set("limit", "8");
  u.searchParams.set("lang", "ru");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(u.toString(), { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json().catch(() => null)) as any;
    const feats = data?.features;
    if (!Array.isArray(feats) || feats.length === 0) return null;

    for (const f of feats) {
      const props = f?.properties ?? {};
      const cc = String(props?.countrycode ?? "").toUpperCase();
      if (cc !== "KZ") continue;

      const hn = props?.housenumber ? normalizeHouseNumber(String(props.housenumber)) : null;
      if (!hn) continue;

      // ✅ строгий матч номера дома
      if (hn !== params.desiredHouse) continue;

      const name = normLower(String(props?.name ?? props?.street ?? ""));
      if (params.kw.length) {
        const okStreet = params.kw.some((k) => name.includes(k));
        if (!okStreet) continue;
      }

      const coords = f?.geometry?.coordinates; // [lng, lat]
      if (!coords || coords.length < 2) continue;

      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      return { lat, lng };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function validateKzAddress(params: {
  city: string;
  address: string;
}): Promise<AddressCheckResult> {
  const city = norm(params.city);
  const address = norm(params.address);

  assertKzCity(city, "Город");

  if (address.length < 5) throw new Error("Адрес: минимум 5 символов");

  const rawHouse = extractHouseNumber(address);
  if (!rawHouse) {
    throw new Error("Адрес: укажите номер дома (например «Сейфуллина 34»)");
  }
  const desiredHouse = normalizeHouseNumber(rawHouse);

  const kw = streetKeywords(address);

  const query = `${address}, ${city}, Казахстан`;

  // 1) строгий Nominatim
  const nom = await geocodeNominatimStrict({ query, desiredHouse, kw }).catch((e) => {
    return { __err: e as Error } as any;
  });
  if (nom && !("__err" in nom)) return nom as AddressCheckResult;

  // 2) строгий fallback Photon
  const ph = await geocodePhotonStrict({ query, desiredHouse, kw });
  if (ph) return ph;

  if (nom && "__err" in nom && nom.__err?.message) {
    // если Nominatim дал понятную ошибку (403/429), покажем её
    throw nom.__err;
  }

  // иначе — не найдено строго по номеру дома
  throw new Error(
    "Адрес: не найден с таким номером дома. Проверь улицу и номер (например «Сейфуллина 34»).",
  );
}