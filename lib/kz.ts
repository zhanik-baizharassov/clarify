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

export function assertKzCity(v: string, field = "Город") {
  const c = normalizeCity(v);
  if (!isKzCity(c)) throw new Error(`${field}: допустимы только города Казахстана`);
  return c;
}

/**
 * KZ мобильные операторы (как ты указал):
 * +7 (700|701|702|705|706|775|778) XXXXXXX
 */
export const KZ_MOBILE_CODES = ["700", "701", "702", "705", "706", "775", "778"] as const;

export function normalizePhone(input: string) {
  // убираем пробелы, скобки, дефисы и т.п.
  return (input ?? "").trim().replace(/[^\d+]/g, "");
}

export function isKzMobilePhone(input: string) {
  const v = normalizePhone(input);

  // строго +7 и ровно 10 цифр после (итого 11 цифр без "+")
  if (!/^\+7\d{10}$/.test(v)) return false;

  const code = v.slice(2, 5);
  return (KZ_MOBILE_CODES as readonly string[]).includes(code);
}

export function assertKzMobilePhone(input: string) {
  const v = normalizePhone(input);

  // единый текст ошибки как ты просил
  if (!/^\+7\d{10}$/.test(v)) {
    throw new Error("Введите казахстанский номер");
  }

  const code = v.slice(2, 5);
  if (!(KZ_MOBILE_CODES as readonly string[]).includes(code)) {
    throw new Error("Введите казахстанский номер");
  }

  return v; // нормализованный формат: +7XXXXXXXXXX
}