//shared/kz/kz.ts

export const KZ_CITIES = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Караганда",
  "Актобе",
  "Тараз",
  "Павлодар",
  "Усть-Каменогорск",
  "Семей",
  "Костанай",
  "Кызылорда",
  "Атырау",
  "Уральск",
  "Актау",
  "Петропавловск",
  "Туркестан",
  "Кокшетау",
  "Талдыкорган",
  "Жезказган",
  "Рудный",
] as const;

export type KzCity = (typeof KZ_CITIES)[number];

export function normalizeCity(v: string) {
  return (v ?? "").trim().replace(/\s+/g, " ");
}

export function isKzCity(v: string) {
  const c = normalizeCity(v);
  return (KZ_CITIES as readonly string[]).includes(c);
}

export function assertKzCity(v: string, field = "Город"): KzCity {
  const c = normalizeCity(v);
  if (!c) throw new Error(`${field}: выберите город`);
  if (!isKzCity(c))
    throw new Error(`${field}: выберите город из списка Казахстана`);
  return c as KzCity;
}

/**
 * KZ мобильные операторы:
 * +7 (700|701|702|705|706|775|778) XXXXXXX
 */
export const KZ_MOBILE_CODES = [
  "700",
  "701",
  "702",
  "705",
  "706",
  "707",
  "708",
  "747",
  "771",
  "775",
  "776",
  "777",
  "778",
] as const;
const KZ_MOBILE_SET = new Set<string>(KZ_MOBILE_CODES);

// Нормализация: убираем пробелы/скобки/дефисы, приводим к "+7XXXXXXXXXX"
export function normalizeKzPhone(input: string, fieldLabel = "Телефон") {
  const raw = String(input ?? "").trim();

  // убираем пробелы/скобки/дефисы, оставляем + и цифры
  const s = raw.replace(/[()\s-]/g, "").replace(/(?!^\+)[^\d]/g, "");

  if (!s.startsWith("+7")) {
    throw new Error(`${fieldLabel}: номер должен начинаться с +7`);
  }

  const digits = s.replace(/\D/g, ""); // только цифры
  // ожидаем 11 цифр: 7 + 10 цифр номера
  if (digits.length !== 11) {
    throw new Error(
      `${fieldLabel}: номер должен содержать 11 цифр в формате +7XXXXXXXXXX`,
    );
  }

  const code = digits.slice(1, 4); // 3 цифры после "7"
  if (!KZ_MOBILE_SET.has(code)) {
    throw new Error(
      `${fieldLabel}: после +7 код оператора должен быть ${KZ_MOBILE_CODES.join(", ")}`,
    );
  }

  return `+7${digits.slice(1)}`;
}

// Для client input: держим "+7" и максимум 10 цифр после неё
export function keepKzPhoneInput(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const rest = digits.startsWith("7") ? digits.slice(1) : digits;
  return `+7${rest.slice(0, 10)}`;
}


/** Approximate city centres as [lat, lng]; used to centre maps and sanity-check pins. */
export const KZ_CITY_CENTERS: Record<KzCity, readonly [number, number]> = {
  Алматы: [43.238, 76.945],
  Астана: [51.169, 71.449],
  Шымкент: [42.315, 69.587],
  Караганда: [49.806, 73.085],
  Актобе: [50.283, 57.167],
  Тараз: [42.9, 71.378],
  Павлодар: [52.287, 76.967],
  "Усть-Каменогорск": [49.948, 82.628],
  Семей: [50.411, 80.227],
  Костанай: [53.214, 63.625],
  Кызылорда: [44.853, 65.509],
  Атырау: [47.107, 51.917],
  Уральск: [51.233, 51.367],
  Актау: [43.65, 51.15],
  Петропавловск: [54.867, 69.15],
  Туркестан: [43.298, 68.252],
  Кокшетау: [53.285, 69.378],
  Талдыкорган: [45.017, 78.373],
  Жезказган: [47.783, 67.769],
  Рудный: [52.967, 63.133],
};

/** Distance in km between two lat/lng points (haversine). */
export function distanceKm(
  a: readonly [number, number],
  b: readonly [number, number],
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** True when the point lies within `maxKm` of the selected city's centre. */
export function isPointNearCity(
  city: KzCity,
  lat: number,
  lng: number,
  maxKm = 60,
) {
  return distanceKm(KZ_CITY_CENTERS[city], [lat, lng]) <= maxKm;
}


/** URL slug and the prepositional form ("в Алматы") for every supported city. */
export const KZ_CITY_META: Record<KzCity, { slug: string; locative: string }> = {
  Алматы: { slug: "almaty", locative: "в Алматы" },
  Астана: { slug: "astana", locative: "в Астане" },
  Шымкент: { slug: "shymkent", locative: "в Шымкенте" },
  Караганда: { slug: "karaganda", locative: "в Караганде" },
  Актобе: { slug: "aktobe", locative: "в Актобе" },
  Тараз: { slug: "taraz", locative: "в Таразе" },
  Павлодар: { slug: "pavlodar", locative: "в Павлодаре" },
  "Усть-Каменогорск": { slug: "ust-kamenogorsk", locative: "в Усть-Каменогорске" },
  Семей: { slug: "semey", locative: "в Семее" },
  Костанай: { slug: "kostanay", locative: "в Костанае" },
  Кызылорда: { slug: "kyzylorda", locative: "в Кызылорде" },
  Атырау: { slug: "atyrau", locative: "в Атырау" },
  Уральск: { slug: "uralsk", locative: "в Уральске" },
  Актау: { slug: "aktau", locative: "в Актау" },
  Петропавловск: { slug: "petropavlovsk", locative: "в Петропавловске" },
  Туркестан: { slug: "turkestan", locative: "в Туркестане" },
  Кокшетау: { slug: "kokshetau", locative: "в Кокшетау" },
  Талдыкорган: { slug: "taldykorgan", locative: "в Талдыкоргане" },
  Жезказган: { slug: "zhezkazgan", locative: "в Жезказгане" },
  Рудный: { slug: "rudny", locative: "в Рудном" },
};

export function cityFromSlug(slug: string): KzCity | null {
  const found = (KZ_CITIES as readonly KzCity[]).find(
    (city) => KZ_CITY_META[city].slug === slug,
  );
  return found ?? null;
}

export function cityPath(city: KzCity) {
  return `/catalog/${KZ_CITY_META[city].slug}`;
}
