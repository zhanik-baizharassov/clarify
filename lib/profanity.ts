// lib/profanity.ts
// Простая, но аккуратная фильтрация ненормативной лексики.
// Важно: проверяем по "токенам" (словам) и по шаблонам, чтобы не ловить ложные
// совпадения вроде "себя" (там есть "еб", но это нормальное слово).

function normalizeBase(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/ё/g, "е");
}

function tokenize(s: string) {
  const base = normalizeBase(s);
  // слова: латиница/кириллица/цифры
  return base.match(/[a-zа-я0-9]+/gu) ?? [];
}

// RU patterns (по токену)
const RU_PATTERNS: RegExp[] = [
  // сука / сучка / сучье
  /^(сука|суки|сучк[аиоеуы]?|сучье|сучья)$/u,

  // хуй и производные
  /^(хуй|хуе(в|м|н|р|с)?|хуя|хуйн(я|е|и)?|хуев(а|о|ы|ый|ая|ое|ые)?|хуеват(о|ый|ая)?)$/u,

  // пизд* и близкое
  /^(пизд[а-я]*|пиздец)$/u,

  // бля* / бляд*
  /^(бля|бляд[а-я]*|блять|блят(ь)?)$/u,

  // мудак* / мудил*
  /^(мудак[а-я]*|мудил[а-я]*|мудач[а-я]*)$/u,

  // еб* семья — ТОЛЬКО если слово начинается с (префикс)? + еб...
  // чтобы не ловить "себя", "лебедь", "гребля" и т.п.
  /^(?:за|про|по|вы|у|на|пере|до|от|об|раз|вз|с|под|при|со)?еб(?:а|о|у|е|и)?(?:н|т|л|ш|к|м|б|ц|ч|х|г)[а-я]*$/u,
];

// EN patterns (по токену)
const EN_PATTERNS: RegExp[] = [
  /^(fuck|fucking|fucker|shit|shitty|bitch|bitches|cunt|asshole|dick|motherfucker)[a-z0-9]*$/u,
];

export function containsProfanity(input: string) {
  const tokens = tokenize(input);
  for (const t of tokens) {
    if (t.length < 3) continue;

    // английские
    if (EN_PATTERNS.some((re) => re.test(t))) return true;

    // русские
    if (RU_PATTERNS.some((re) => re.test(t))) return true;
  }
  return false;
}

export function assertNoProfanity(input: string, fieldLabel: string) {
  if (containsProfanity(input)) {
    throw new Error(`Поле "${fieldLabel}" содержит недопустимые слова`);
  }
}