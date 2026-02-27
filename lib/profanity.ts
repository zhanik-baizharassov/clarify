// lib/profanity.ts
// Расширяемая фильтрация ненормативной лексики (RU/EN).
// Проверяем только по токенам (словам), чтобы избежать ложных срабатываний.

function normalizeBase(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/ё/g, "е");
}

function tokenize(s: string) {
  const base = normalizeBase(s);
  return base.match(/[a-zа-я0-9]+/gu) ?? [];
}

const RU_BAD_WORDS = new Set([
  "сука","сучка", "сучье", "мудак",
  "мудила", "ублюдок","уебище",
  "пидор","пидорас","пидорасина",
  "педераст","ебаная","ебанная",
  "сукка", "сперма", "сука",
  "мразь", "тварь",  "ебырь",
  "бля", "блядь", "блять",
  "хуй", "пизда", "пиздец",
  "говно", "жоп", "жопа",
  "сран", "срать","дроч",
  "залуп", "шлюх", "анал",
  "анус", "член", "писюн",
  "долбо", "дебил", "идиот", 
  "кретин", "параша", "ёб", "уеб", 
  "уёб", "ебан", "гон", "гондон",
  "врун","балабол","гамункул",
  "хуесос","лох","лошара",
  "хуйло", "хер", "санина",
  "трепло", "котакбас",
]);

const EN_BAD_WORDS = new Set([
  "fuck", "fucking", "fucker",
  "shit", "shitty", "bitch",
  "bitches", "cunt", "asshole",
  "dick", "motherfucker", "whore",
  "slut", "anal", "anus", "suka",
  "blyad", "blyat", "pidor",
  "chlen", "gnida", "debil",
  "govno", "ueba", "ueban",
  "hui", "shluha", "gondon",
  "pizda", "pizdec", "jopa",
  "balabol", "dolba", "sperm",
  "uebok", "pisun", "huesos",
  "loh", "lox", "huilo",
  "kotakbac", "kotakbas", "kotakbass",
]);

// ===== 2) ШАБЛОНЫ (семейства слов) =====
// Тут удобно ловить формы/склонения.
const RU_PATTERNS: RegExp[] = [
  // хуй + формы
  /^(хуй|ху[яеёи]([вмнрс])?|хуйн(я|е|и)?|хуев(а|о|ы|ый|ая|ое|ые)?|хуеват(о|ый|ая)?)$/u,

  // пизд* / пиздец
  /^(пизд[а-я]*|пиздец)$/u,

  // бля* / бляд*
  /^(бля|бляд[а-я]*|блять)$/u,

  // еб* (только если начинается с префикса+еб..., чтобы не ловить "себя", "лебедь")
  /^(?:за|про|по|вы|у|на|пере|до|от|об|раз|вз|с|под|при|со)?еб(?:а|о|у|е|и)?[а-я]*$/u,

  // пидор* / пидорас* / педераст*
  /^(пидор[а-я]*|пидорас[а-я]*|педераст[а-я]*)$/u,

  // ублюд*
  /^(ублюд[а-я]*)$/u,

  // уебище/уеб*
  /^(уеб[а-я]*|уебище)$/u,
];

const EN_PATTERNS: RegExp[] = [
  // fuck*
  /^fuck[a-z0-9]*$/u,
  // shit*
  /^shit[a-z0-9]*$/u,
  // bitch*
  /^bitch[a-z0-9]*$/u,
  // cunt*
  /^cunt[a-z0-9]*$/u,
  // asshole / dick / whore / motherfucker
  /^(asshole|dick|whore|motherfucker)[a-z0-9]*$/u,
];

function squashed(s: string) {
  return normalizeBase(s).replace(/[^a-zа-я0-9]+/gu, "");
}

export function containsProfanity(input: string) {
  const tokens = tokenize(input);

  for (const t of tokens) {
    if (t.length < 3) continue;

    if (RU_BAD_WORDS.has(t) || EN_BAD_WORDS.has(t)) return true;
    if (RU_PATTERNS.some((re) => re.test(t))) return true;
    if (EN_PATTERNS.some((re) => re.test(t))) return true;
  }

  // второй проход для "f.u.c.k" → "fuck"
  const sq = squashed(input);
  if (sq.length >= 3) {
    if (EN_BAD_WORDS.has(sq) || EN_PATTERNS.some((re) => re.test(sq))) return true;
    if (RU_BAD_WORDS.has(sq) || RU_PATTERNS.some((re) => re.test(sq))) return true;
  }

  return false;
}

export function assertNoProfanity(input: string, fieldLabel: string) {
  if (containsProfanity(input)) {
    throw new Error(`Поле "${fieldLabel}" содержит недопустимые слова`);
  }
}