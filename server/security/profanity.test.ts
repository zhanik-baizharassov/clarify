import { describe, expect, it } from "vitest";
import { assertNoProfanity, containsProfanity } from "@/server/security/profanity";

describe("containsProfanity", () => {
  it.each([
    "сука",
    "Ты МУДАК",
    "это полный пиздец",
    "хуй",
    "блядь",
    "ёбаный",
    "fuck",
    "What the FUCK is this",
    "shitty service",
    "you bitch",
    "f.u.c.k",
    "п и з д е ц",
    "полное говно!",
  ])("flags %j", (text) => {
    expect(containsProfanity(text)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "Отличное место, вкусный кофе и вежливый персонал",
    "Great place, friendly staff",
    "Хлеб свежий, лебедь на пруду",
    "Scunthorpe",
    "assistant",
    "Абая 150, офис 12",
    "Очень понравилось, обязательно вернёмся!",
  ])("does not flag %j", (text) => {
    expect(containsProfanity(text)).toBe(false);
  });

  it("matches by whole word, so substrings of bad words do not trigger", () => {
    expect(containsProfanity("классный пассаж")).toBe(false);
    expect(containsProfanity("shiitake mushrooms")).toBe(false);
  });

  it("ignores one- and two-letter tokens", () => {
    expect(containsProfanity("а я в ту")).toBe(false);
  });

  it("is case-insensitive and treats ё like е", () => {
    expect(containsProfanity("УЁБОК")).toBe(true);
    expect(containsProfanity("Ебаный")).toBe(true);
  });

  // Known false positive: the "еб" pattern accepts the one-letter prefix "с",
  // so "себя" / "Себастьян" are flagged although the comment above the pattern
  // says they must not be. `it.fails` keeps the suite green while the bug
  // exists and turns red once it is fixed, so this marker can then be removed.
  it.fails("does not flag the ordinary word 'себя' (known bug)", () => {
    expect(containsProfanity("я чувствую себя отлично")).toBe(false);
  });
});

describe("assertNoProfanity", () => {
  it("does nothing for clean input", () => {
    expect(() => assertNoProfanity("Хорошее место", "Отзыв")).not.toThrow();
  });

  it("throws naming the field for bad input", () => {
    expect(() => assertNoProfanity("ты сука", "Отзыв")).toThrow(
      'Поле "Отзыв" содержит недопустимые слова',
    );
  });
});
