// shared/places-import-template.ts
// Column definitions, header aliases, the downloadable template and the
// CSV -> request-rows mapping for the admin places import (client/server-safe).

import { parseCsv, toCsv } from "@/shared/csv";

export const IMPORT_COLUMNS = [
  "name",
  "category",
  "city",
  "address",
  "phone",
  "description",
  "website",
  "work_hours",
  "lat",
  "lng",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_REQUIRED_COLUMNS: readonly ImportColumn[] = [
  "name",
  "category",
  "city",
  "address",
];

export const IMPORT_MAX_ROWS_PER_REQUEST = 200;

const ALIASES: Record<string, ImportColumn> = {
  name: "name",
  название: "name",
  category: "category",
  категория: "category",
  city: "city",
  город: "city",
  address: "address",
  адрес: "address",
  phone: "phone",
  телефон: "phone",
  description: "description",
  описание: "description",
  website: "website",
  site: "website",
  сайт: "website",
  work_hours: "work_hours",
  workhours: "work_hours",
  часы_работы: "work_hours",
  часыработы: "work_hours",
  lat: "lat",
  latitude: "lat",
  широта: "lat",
  lng: "lng",
  lon: "lng",
  longitude: "lng",
  долгота: "lng",
};

/** Maps a header cell (any case, spaces/hyphens, BOM) to a canonical column, or null. */
export function canonicalColumn(header: string): ImportColumn | null {
  const key = String(header ?? "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? ALIASES[key.replace(/_/g, "")] ?? null;
}

/** Renames alias keys of one request row to canonical column names. */
export function canonicalizeRecord(
  data: Record<string, unknown>,
): Partial<Record<ImportColumn, string>> {
  const out: Partial<Record<ImportColumn, string>> = {};
  for (const [k, v] of Object.entries(data)) {
    const col = canonicalColumn(k);
    if (!col || out[col] !== undefined) continue;
    out[col] = v == null ? "" : String(v);
  }
  return out;
}

const TEMPLATE_ROWS: string[][] = [
  [...IMPORT_COLUMNS],
  [
    "Кофейня «Пример»",
    "Кафе",
    "Алматы",
    "проспект Абая 10",
    "+77011234567",
    "Уютная кофейня в центре города",
    "https://example.kz",
    "Пн–Пт 09:00–21:00 • Сб–Вс 10:00–18:00",
    "43.2389",
    "76.9453",
  ],
  [
    "Кофейня «Образец»",
    "Кофейни",
    "Астана",
    "улица Кенесары 40",
    "+77051234567",
    "",
    "",
    "Ежедневно 10:00–22:00",
    "",
    "",
  ],
];

/** Template text (with BOM so Excel opens it as UTF-8; ";" is what Russian Excel expects). */
export const PLACES_IMPORT_TEMPLATE_CSV = "﻿" + toCsv(TEMPLATE_ROWS, ";");

export type ImportRequestRow = {
  line: number;
  data: Partial<Record<ImportColumn, string>>;
};

export type ParsedImportFile =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Rows ready to be sent to the API. */
      rows: ImportRequestRow[];
      /** Rows that are broken before they even reach the server. */
      localErrors: { line: number; error: string }[];
      ignoredHeaders: string[];
    };

/** Parses CSV text into request rows; does no business validation. */
export function parseImportFile(text: string): ParsedImportFile {
  const parsed = parseCsv(text);

  if (parsed.unterminatedQuote) {
    return {
      ok: false,
      error:
        "В файле не закрыта кавычка. Проверьте поля с кавычками и сохраните файл заново.",
    };
  }

  const [headerRecord, ...body] = parsed.records;
  if (!headerRecord) {
    return { ok: false, error: "Файл пустой: нет строки заголовков." };
  }

  const columns = headerRecord.cells.map(canonicalColumn);
  const ignoredHeaders = headerRecord.cells.filter(
    (h, i) => columns[i] === null && h.trim() !== "",
  );

  const missing = IMPORT_REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `В заголовке нет обязательных столбцов: ${missing.join(", ")}. Скачайте шаблон и сверьтесь с ним.`,
    };
  }

  const rows: ImportRequestRow[] = [];
  const localErrors: { line: number; error: string }[] = [];

  for (const rec of body) {
    const extra = rec.cells.slice(columns.length).some((c) => c.trim() !== "");
    if (extra) {
      localErrors.push({
        line: rec.line,
        error:
          "Больше значений, чем столбцов в заголовке. Возможно, в поле с запятой или точкой с запятой нет кавычек.",
      });
      continue;
    }

    const data: Partial<Record<ImportColumn, string>> = {};
    columns.forEach((col, i) => {
      if (col && data[col] === undefined) data[col] = (rec.cells[i] ?? "").trim();
    });
    rows.push({ line: rec.line, data });
  }

  return { ok: true, rows, localErrors, ignoredHeaders };
}
