import { describe, expect, it } from "vitest";
import { formatReviewDate, formatReviewsCount, pluralRu } from "@/shared/format";

const FORMS = ["отзыв", "отзыва", "отзывов"] as const;

describe("pluralRu", () => {
  const cases: Array<[number, string]> = [
    [0, "отзывов"],
    [1, "отзыв"],
    [2, "отзыва"],
    [4, "отзыва"],
    [5, "отзывов"],
    [11, "отзывов"],
    [12, "отзывов"],
    [13, "отзывов"],
    [14, "отзывов"],
    [21, "отзыв"],
    [22, "отзыва"],
    [25, "отзывов"],
    [101, "отзыв"],
    [111, "отзывов"],
  ];

  it.each(cases)("picks the right form for %i", (n, expected) => {
    expect(pluralRu(n, FORMS)).toBe(expected);
  });

  it("treats negative numbers by absolute value", () => {
    expect(pluralRu(-1, FORMS)).toBe("отзыв");
    expect(pluralRu(-12, FORMS)).toBe("отзывов");
  });

  it("truncates fractions", () => {
    expect(pluralRu(2.9, FORMS)).toBe("отзыва");
  });
});

describe("formatReviewsCount", () => {
  it("prefixes the number to the plural form", () => {
    expect(formatReviewsCount(0)).toBe("0 отзывов");
    expect(formatReviewsCount(1)).toBe("1 отзыв");
    expect(formatReviewsCount(3)).toBe("3 отзыва");
    expect(formatReviewsCount(12)).toBe("12 отзывов");
    expect(formatReviewsCount(21)).toBe("21 отзыв");
  });
});

describe("formatReviewDate", () => {
  it("formats a Date in Russian", () => {
    const out = formatReviewDate(new Date("2024-06-15T12:00:00Z"));
    expect(out).toContain("15");
    expect(out).toContain("июня");
    expect(out).toContain("2024");
  });

  it("accepts ISO strings", () => {
    expect(formatReviewDate("2024-06-15T12:00:00Z")).toBe(
      formatReviewDate(new Date("2024-06-15T12:00:00Z")),
    );
  });

  it("uses the Asia/Almaty time zone (UTC+5) for the day boundary", () => {
    // 20:00 UTC on 4 March is already 5 March 01:00 in Almaty.
    const out = formatReviewDate("2024-03-04T20:00:00Z");
    expect(out).toContain("5");
    expect(out).toContain("марта");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatReviewDate("not a date")).toBe("");
    expect(formatReviewDate(new Date("nope"))).toBe("");
    expect(formatReviewDate("")).toBe("");
  });
});
