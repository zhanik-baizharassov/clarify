// lib/kz.ts

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
  if (!c) throw new Error(`${field}: выберите город`);
  if (!isKzCity(c)) throw new Error(`${field}: выберите город из списка Казахстана`);
  return c;
}

/**
 * KZ мобильные операторы:
 * +7 (700|701|702|705|706|775|778) XXXXXXX
 */
export const KZ_MOBILE_CODES = ["700", "701", "702", "705", "706", "775", "778"] as const;
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
    throw new Error(`${fieldLabel}: номер должен содержать 11 цифр в формате +7XXXXXXXXXX`);
  }

  const code = digits.slice(1, 4); // 3 цифры после "7"
  if (!KZ_MOBILE_SET.has(code)) {
    throw new Error(
      `${fieldLabel}: введите казахстанский номер. Допустимые коды: ${KZ_MOBILE_CODES.join(", ")}`
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