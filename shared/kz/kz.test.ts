import { describe, expect, it } from "vitest";
import {
  KZ_CITIES,
  KZ_CITY_CENTERS,
  KZ_CITY_META,
  KZ_MOBILE_CODES,
  assertKzCity,
  cityFromSlug,
  cityPath,
  distanceKm,
  isKzCity,
  isPointNearCity,
  keepKzPhoneInput,
  normalizeCity,
  normalizeKzPhone,
} from "@/shared/kz/kz";

describe("distanceKm", () => {
  it("is zero for identical points", () => {
    expect(distanceKm([43.238, 76.945], [43.238, 76.945])).toBe(0);
  });

  it("is symmetric", () => {
    const a = KZ_CITY_CENTERS["Алматы"];
    const b = KZ_CITY_CENTERS["Астана"];
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it("gives a plausible Almaty - Astana distance (~970 km)", () => {
    const d = distanceKm(KZ_CITY_CENTERS["Алматы"], KZ_CITY_CENTERS["Астана"]);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1050);
  });

  it("one degree of latitude is about 111 km", () => {
    const d = distanceKm([50, 70], [51, 70]);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe("isPointNearCity", () => {
  it("accepts the city centre", () => {
    const [lat, lng] = KZ_CITY_CENTERS["Алматы"];
    expect(isPointNearCity("Алматы", lat, lng)).toBe(true);
  });

  it("accepts a point ~10 km away", () => {
    const [lat, lng] = KZ_CITY_CENTERS["Алматы"];
    expect(isPointNearCity("Алматы", lat + 0.09, lng)).toBe(true);
  });

  it("rejects a point ~100 km away", () => {
    const [lat, lng] = KZ_CITY_CENTERS["Алматы"];
    expect(isPointNearCity("Алматы", lat + 0.9, lng)).toBe(false);
  });

  it("rejects the centre of another city", () => {
    const [lat, lng] = KZ_CITY_CENTERS["Астана"];
    expect(isPointNearCity("Алматы", lat, lng)).toBe(false);
  });

  it("uses a 60 km default radius and honours a custom one", () => {
    const [lat, lng] = KZ_CITY_CENTERS["Астана"];
    // 0.45 deg latitude ~ 50 km, 0.6 deg ~ 67 km.
    expect(isPointNearCity("Астана", lat + 0.45, lng)).toBe(true);
    expect(isPointNearCity("Астана", lat + 0.6, lng)).toBe(false);
    expect(isPointNearCity("Астана", lat + 0.6, lng, 80)).toBe(true);
  });
});

describe("city tables", () => {
  it("has 20 cities without duplicates", () => {
    expect(KZ_CITIES).toHaveLength(20);
    expect(new Set(KZ_CITIES).size).toBe(KZ_CITIES.length);
  });

  it("KZ_CITY_META is complete and well-formed for every city", () => {
    expect(Object.keys(KZ_CITY_META).sort()).toEqual([...KZ_CITIES].sort());
    for (const city of KZ_CITIES) {
      const meta = KZ_CITY_META[city];
      expect(meta.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(meta.locative.startsWith("в ")).toBe(true);
    }
  });

  it("slugs are unique", () => {
    const slugs = KZ_CITIES.map((c) => KZ_CITY_META[c].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("KZ_CITY_CENTERS has a plausible Kazakhstan coordinate for every city", () => {
    expect(Object.keys(KZ_CITY_CENTERS).sort()).toEqual([...KZ_CITIES].sort());
    for (const city of KZ_CITIES) {
      const [lat, lng] = KZ_CITY_CENTERS[city];
      expect(lat).toBeGreaterThan(40);
      expect(lat).toBeLessThan(56);
      expect(lng).toBeGreaterThan(46);
      expect(lng).toBeLessThan(88);
    }
  });

  it("cityFromSlug round-trips for every city", () => {
    for (const city of KZ_CITIES) {
      expect(cityFromSlug(KZ_CITY_META[city].slug)).toBe(city);
    }
  });

  it("cityFromSlug returns null for unknown slugs", () => {
    expect(cityFromSlug("moscow")).toBeNull();
    expect(cityFromSlug("")).toBeNull();
    expect(cityFromSlug("ALMATY")).toBeNull();
  });

  it("cityPath builds the catalog URL", () => {
    expect(cityPath("Алматы")).toBe("/catalog/almaty");
    expect(cityPath("Усть-Каменогорск")).toBe("/catalog/ust-kamenogorsk");
  });
});

describe("normalizeCity / isKzCity / assertKzCity", () => {
  it("normalizes whitespace", () => {
    expect(normalizeCity("  Усть-Каменогорск ")).toBe("Усть-Каменогорск");
    expect(normalizeCity("Нур   Султан")).toBe("Нур Султан");
  });

  it("recognises listed cities only", () => {
    expect(isKzCity(" Алматы ")).toBe(true);
    expect(isKzCity("Москва")).toBe(false);
    expect(isKzCity("алматы")).toBe(false);
  });

  it("assertKzCity returns the normalized city", () => {
    expect(assertKzCity("  Астана ")).toBe("Астана");
  });

  it("assertKzCity throws for empty input with the field name", () => {
    expect(() => assertKzCity("   ", "Город")).toThrow("Город: выберите город");
    expect(() => assertKzCity("", "Город доставки")).toThrow(
      "Город доставки: выберите город",
    );
  });

  it("assertKzCity throws for a city outside the list", () => {
    expect(() => assertKzCity("Москва")).toThrow(
      "выберите город из списка Казахстана",
    );
  });
});

describe("normalizeKzPhone", () => {
  const codes = [
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
  ];

  it("exposes exactly the expected operator codes", () => {
    expect([...KZ_MOBILE_CODES]).toEqual(codes);
  });

  it.each(codes)("accepts operator code %s", (code) => {
    expect(normalizeKzPhone(`+7${code}1234567`)).toBe(`+7${code}1234567`);
  });

  it("strips spaces, brackets and dashes", () => {
    expect(normalizeKzPhone("+7 (701) 123-45-67")).toBe("+77011234567");
    expect(normalizeKzPhone("  +7 777 000 00 00 ")).toBe("+77770000000");
  });

  it.each(["703", "704", "710", "800", "495", "900"])(
    "rejects unknown operator code %s",
    (code) => {
      expect(() => normalizeKzPhone(`+7${code}1234567`)).toThrow(
        "код оператора",
      );
    },
  );

  it("rejects numbers that do not start with +7", () => {
    expect(() => normalizeKzPhone("87011234567")).toThrow("начинаться с +7");
    expect(() => normalizeKzPhone("+37011234567")).toThrow("начинаться с +7");
    expect(() => normalizeKzPhone("")).toThrow("начинаться с +7");
  });

  it("rejects wrong lengths", () => {
    expect(() => normalizeKzPhone("+770112345")).toThrow("11 цифр");
    expect(() => normalizeKzPhone("+770112345678")).toThrow("11 цифр");
    expect(() => normalizeKzPhone("+7")).toThrow("11 цифр");
  });

  it("uses a custom field label in errors", () => {
    expect(() => normalizeKzPhone("12345", "Контактный телефон")).toThrow(
      "Контактный телефон:",
    );
  });
});

describe("keepKzPhoneInput", () => {
  it("keeps +7 and at most 10 digits", () => {
    expect(keepKzPhoneInput("")).toBe("+7");
    expect(keepKzPhoneInput("7701")).toBe("+7701");
    expect(keepKzPhoneInput("+7 (701) 123-45-67 99")).toBe("+77011234567");
  });
});
