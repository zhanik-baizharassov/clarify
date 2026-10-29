import { describe, it, expect } from "vitest";
import {
  buildCategoryLookup,
  buildPlaceSlug,
  placeKey,
  slugifyAscii,
  validateImportRow,
} from "./places-import";

const lookup = buildCategoryLookup([
  { id: "c1", name: "Кафе", slug: "cafe", isActive: true },
  { id: "c2", name: "Барбершоп", slug: "barbershop", isActive: true },
  { id: "c3", name: "Старая", slug: "old", isActive: false },
]);

const good = {
  name: "Кофейня Пример",
  category: "Кафе",
  city: "Алматы",
  address: "проспект Абая 10",
};

async function check(patch: Record<string, string>, base = good) {
  return validateImportRow({ ...base, ...patch }, lookup);
}

async function errorOf(patch: Record<string, string>) {
  const r = await check(patch);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.error;
}

describe("validateImportRow", () => {
  it("accepts a minimal row", async () => {
    const r = await check({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.place).toEqual({
        name: "Кофейня Пример",
        categoryId: "c1",
        city: "Алматы",
        address: "проспект Абая 10",
        phone: null,
        description: null,
        website: null,
        workHours: null,
        lat: null,
        lng: null,
      });
    }
  });

  it("accepts a full row and normalises phone, website, coordinates", async () => {
    const r = await check({
      phone: "8 (701) 123-45-67",
      description: "Уютно",
      website: "example.kz",
      work_hours: "Пн–Пт 09:00–21:00 • Сб–Вс выходной",
      lat: "43,2389",
      lng: "76.9453",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.place.phone).toBe("+77011234567");
      expect(r.place.website).toBe("https://example.kz/");
      expect(r.place.lat).toBe(43.2389);
      expect(r.place.lng).toBe(76.9453);
      expect(r.place.workHours).toBe("Пн–Пт 09:00–21:00 • Сб–Вс выходной");
    }
  });

  it("resolves the category by slug and by name, case-insensitively", async () => {
    for (const category of ["cafe", "CAFE", "кафе", " КАФЕ "]) {
      const r = await check({ category });
      expect(r.ok && r.place.categoryId).toBe("c1");
    }
    const r2 = await check({ category: "Барбершоп" });
    expect(r2.ok && r2.place.categoryId).toBe("c2");
  });

  it("accepts Russian header aliases", async () => {
    const r = await validateImportRow(
      {
        название: "Место",
        категория: "кафе",
        город: "Астана",
        адрес: "улица Кенесары 40",
        телефон: "+77051234567",
        сайт: "https://a.kz",
        часы_работы: "24/7",
        широта: "51.17",
        долгота: "71.45",
      },
      lookup,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects unknown and inactive categories", async () => {
    expect(await errorOf({ category: "Нет такой" })).toContain("не найдена");
    expect(await errorOf({ category: "old" })).toContain("отключена");
    expect(await errorOf({ category: "" })).toContain("Категория");
  });

  it("rejects bad name, city, address", async () => {
    expect(await errorOf({ name: "a" })).toContain("Название");
    expect(await errorOf({ name: "x".repeat(121) })).toContain("Название");
    expect(await errorOf({ city: "Москва" })).toContain("Город");
    expect(await errorOf({ city: "" })).toContain("Город");
    expect(await errorOf({ address: "проспект Абая" })).toContain("номер дома");
    expect(await errorOf({ address: "ул 1" })).toContain("минимум 5");
    expect(await errorOf({ address: "" })).toContain("Адрес");
  });

  it("rejects bad phone, website, description, work hours", async () => {
    expect(await errorOf({ phone: "123" })).toContain("Телефон");
    expect(await errorOf({ phone: "+77991234567" })).toContain("Телефон");
    expect(await errorOf({ website: "ftp://example.kz" })).toContain("Сайт");
    expect(await errorOf({ website: "javascript:alert(1)" })).toContain("Сайт");
    expect(await errorOf({ website: "localhost" })).toContain("Сайт");
    expect(await errorOf({ description: "x".repeat(1001) })).toContain("Описание");
    expect(await errorOf({ work_hours: "x".repeat(121) })).toContain("Часы работы");
  });

  it("validates the coordinate pair and distance from the city", async () => {
    expect(await errorOf({ lat: "43.2" })).toContain("широту, и долготу");
    expect(await errorOf({ lat: "abc", lng: "76.9" })).toContain("Широта");
    expect(await errorOf({ lat: "95", lng: "76.9" })).toContain("Широта");
    // Astana coordinates for an Almaty card
    expect(await errorOf({ lat: "51.17", lng: "71.45" })).toContain("далеко");
  });

  it("rejects profanity", async () => {
    expect(await errorOf({ name: "Хуйня" })).toContain("недопустимые слова");
  });

  it("reports several problems of one row at once", async () => {
    const e = await errorOf({ city: "Москва", phone: "1", name: "" });
    expect(e).toContain("Название");
    expect(e).toContain("Город");
    expect(e).toContain("Телефон");
  });
});

describe("helpers", () => {
  it("placeKey separates fields", () => {
    expect(placeKey("a", "b", "c")).not.toBe(placeKey("a", "bc", ""));
  });

  it("builds slugs like the single-create route", () => {
    expect(slugifyAscii("Кофейня Пример-Алматы")).toBe("kofeynya-primer-almaty");
    expect(slugifyAscii("!!!")).toBe("place");
    expect(buildPlaceSlug("Кафе", "Алматы", "abcdef12-0000", 36)).toBe(
      "kafe-almaty-10-abcdef",
    );
  });
});
