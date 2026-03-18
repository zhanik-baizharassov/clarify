export type AvatarIdentity = {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  email?: string | null;
};

export type AvatarTheme = {
  bg: string;
  text: string;
  border: string;
};

const AVATAR_THEMES: AvatarTheme[] = [
  {
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/25",
  },
  {
    bg: "bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/25",
  },
  {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/25",
  },
  {
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/25",
  },
  {
    bg: "bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/25",
  },
  {
    bg: "bg-cyan-500/15",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/25",
  },
  {
    bg: "bg-fuchsia-500/15",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/25",
  },
  {
    bg: "bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/25",
  },
];

function firstChar(value?: string | null) {
  const clean = String(value ?? "").trim();
  return clean ? Array.from(clean)[0] : "";
}

function firstTwoChars(value?: string | null) {
  const clean = String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "");

  return Array.from(clean).slice(0, 2).join("");
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function getAvatarInitials(user: AvatarIdentity) {
  const first = firstChar(user.firstName);
  const last = firstChar(user.lastName);

  const full = `${first}${last}`.trim();
  if (full) return full.toUpperCase();

  const nick = firstTwoChars(user.nickname);
  if (nick) return nick.toUpperCase();

  const emailLocal = String(user.email ?? "").split("@")[0] ?? "";
  const emailChars = firstTwoChars(emailLocal);
  if (emailChars) return emailChars.toUpperCase();

  return "CL";
}

export function getAvatarSeed(user: AvatarIdentity) {
  return (
    String(user.email ?? "").trim().toLowerCase() ||
    String(user.nickname ?? "").trim().toLowerCase() ||
    `${String(user.firstName ?? "").trim()} ${String(user.lastName ?? "").trim()}`.trim().toLowerCase() ||
    "clarify-user"
  );
}

export function getAvatarTheme(user: AvatarIdentity): AvatarTheme {
  const seed = getAvatarSeed(user);
  const index = hashString(seed) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
}