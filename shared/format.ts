/**
 * Выбирает форму слова по числу: pluralRu(3, ["отзыв", "отзыва", "отзывов"]) -> "отзыва".
 */
export function pluralRu(
  n: number,
  forms: readonly [one: string, few: string, many: string],
) {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;

  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatReviewsCount(n: number) {
  return `${n} ${pluralRu(n, ["отзыв", "отзыва", "отзывов"])}`;
}

const reviewDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Almaty",
});

export function formatReviewDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return reviewDateFormatter.format(date);
}
