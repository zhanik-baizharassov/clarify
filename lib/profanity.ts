const RU_BAD_ROOTS = [
  "хуй",
  "пизд",
  "бля",
  "еб",
  "ёб",
  "сука",
  "мудак",
];

const EN_BAD_ROOTS = ["fuck", "shit", "bitch", "cunt"];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "");
}

export function containsProfanity(input: string) {
  const n = normalize(input);
  if (!n) return false;

  return [...RU_BAD_ROOTS, ...EN_BAD_ROOTS].some((root) => n.includes(normalize(root)));
}

export function assertNoProfanity(input: string, fieldLabel: string) {
  if (containsProfanity(input)) {
    throw new Error(`Поле "${fieldLabel}" содержит недопустимые слова`);
  }
}