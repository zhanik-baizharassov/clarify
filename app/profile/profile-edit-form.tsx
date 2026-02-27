"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { containsProfanity } from "@/lib/profanity";

type Initial = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
};

// ✅ СЖАТИЕ АВАТАРА ДО ЗАГРУЗКИ (уменьшает длину avatarUrl в базе)
async function compressAvatar(file: File): Promise<File> {
  const MAX = 256; // размер аватара в px (256 обычно достаточно)

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      0.82, // качество (можно 0.75 для ещё меньшего размера)
    );
  });

  return new File([blob], "avatar.webp", { type: blob.type });
}

export default function ProfileEditForm({
  initial,
  locked,
}: {
  initial: Initial;
  locked: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [nickname, setNickname] = useState(initial.nickname);
  const [email, setEmail] = useState(initial.email);

  // avatar: только файл
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarClear, setAvatarClear] = useState(false); // удалить текущий аватар

  const [password, setPassword] = useState("");
  const [showPasswordBlock, setShowPasswordBlock] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const objectUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const previewUrl = useMemo(() => {
    if (objectUrl) return objectUrl;
    if (avatarClear) return "/avatar-placeholder.png";
    return initial.avatarUrl || "/avatar-placeholder.png";
  }, [objectUrl, avatarClear, initial.avatarUrl]);

  function validateClient(): string | null {
    if (locked) return "Редактирование заблокировано";
    if (firstName.trim().length < 2) return "Имя: минимум 2 символа";
    if (lastName.trim().length < 2) return "Фамилия: минимум 2 символа";

    const nn = nickname.trim();
    if (nn.length < 3) return "Никнейм: минимум 3 символа";
    if (nn.length > 20) return "Никнейм: максимум 20 символов";
    if (!/^[a-zA-Z0-9_]+$/.test(nn))
      return "Никнейм: только латиница, цифры и _ (без пробелов)";

    if (!email.trim()) return "Введите email";

    if (containsProfanity(firstName)) return 'Поле "Имя" содержит недопустимые слова';
    if (containsProfanity(lastName)) return 'Поле "Фамилия" содержит недопустимые слова';
    if (containsProfanity(nickname)) return 'Поле "Никнейм" содержит недопустимые слова';

    if (avatarFile) {
      const okTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!okTypes.includes(avatarFile.type))
        return "Аватар: разрешены только JPG / PNG / WEBP";
      const maxBytes = 1_000_000;
      if (avatarFile.size > maxBytes)
        return "Аватар: файл слишком большой (макс. 1MB)";
    }

    if (showPasswordBlock && password) {
      if (password.length < 8) return "Пароль: минимум 8 символов";
      if (!/[A-Z]/.test(password)) return "Пароль: нужна хотя бы 1 заглавная буква";
      if (!/[a-z]/.test(password)) return "Пароль: нужна хотя бы 1 строчная буква";
      if (!/\d/.test(password)) return "Пароль: нужна хотя бы 1 цифра";
    }

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const msg = validateClient();
    if (msg) return setErr(msg);

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("nickname", nickname.trim());
      fd.append("email", email.trim());

      if (showPasswordBlock && password) fd.append("password", password);
      if (avatarFile) fd.append("avatar", avatarFile);
      if (!avatarFile && avatarClear) fd.append("avatarClear", "1");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось сохранить профиль");

      setPassword("");
      setAvatarFile(null);
      setAvatarClear(false);
      if (fileRef.current) fileRef.current.value = "";

      setOk("Сохранено. Профиль заблокирован для дальнейших изменений.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Редактирование профиля</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            Изменить данные можно только <b>один раз</b>.
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center rounded-full border px-3 py-1 text-sm",
            locked
              ? "bg-muted/40 text-muted-foreground"
              : "bg-black text-white border-black",
          ].join(" ")}
        >
          {locked ? "Заблокировано" : "Доступно (1 раз)"}
        </span>
      </div>

      {locked ? (
        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          Профиль уже был изменён ранее — редактирование заблокировано.
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          После успешного сохранения форма станет недоступной.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        {/* Avatar */}
        <div className="rounded-xl border p-4">
          <div className="text-sm font-medium">Аватар</div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <img
              src={previewUrl}
              alt="avatar preview"
              className="h-16 w-16 rounded-xl border object-cover"
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={locked || loading}
              onChange={async (e) => {
                const raw = e.target.files?.[0] ?? null;
                if (!raw) return;

                setErr(null);
                try {
                  // ✅ ключевая часть: сжимаем/уменьшаем до webp
                  const compressed = await compressAvatar(raw);
                  setAvatarFile(compressed);
                  setAvatarClear(false);
                } catch {
                  // если что-то пошло не так — используем оригинал
                  setAvatarFile(raw);
                  setAvatarClear(false);
                }
              }}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={locked || loading}
                onClick={() => fileRef.current?.click()}
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-60"
              >
                Выбрать фото
              </button>

              <button
                type="button"
                disabled={locked || loading || (!initial.avatarUrl && !avatarFile)}
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarClear(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-60"
              >
                Удалить фото
              </button>

              {avatarFile ? (
                <button
                  type="button"
                  disabled={locked || loading}
                  onClick={() => {
                    setAvatarFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="h-10 rounded-md border px-3 text-sm disabled:opacity-60"
                >
                  Сбросить выбор
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Форматы: JPG/PNG/WEBP. Размер: до 1MB. (Файл будет уменьшен перед отправкой.)
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-4 rounded-xl border p-4">
          <div className="text-sm font-medium">Основные данные</div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Имя</span>
              <input
                disabled={locked || loading}
                className="h-10 rounded-md border px-3 disabled:opacity-60"
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Фамилия</span>
              <input
                disabled={locked || loading}
                className="h-10 rounded-md border px-3 disabled:opacity-60"
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Никнейм</span>
              <input
                disabled={locked || loading}
                className="h-10 rounded-md border px-3 disabled:opacity-60"
                placeholder="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">Email</span>
              <input
                disabled={locked || loading}
                className="h-10 rounded-md border px-3 disabled:opacity-60"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">Безопасность</div>

            <button
              type="button"
              disabled={locked || loading}
              onClick={() => setShowPasswordBlock((v) => !v)}
              className="h-9 rounded-md border px-3 text-sm disabled:opacity-60"
            >
              {showPasswordBlock ? "Не менять пароль" : "Сменить пароль"}
            </button>
          </div>

          {showPasswordBlock ? (
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">
                  Новый пароль (необязательно)
                </span>
                <div className="flex gap-2">
                  <input
                    disabled={locked || loading}
                    className="h-10 flex-1 rounded-md border px-3 disabled:opacity-60"
                    placeholder="Введите новый пароль"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={locked || loading}
                    onClick={() => setShowPassword((v) => !v)}
                    className="h-10 rounded-md border px-3 text-sm disabled:opacity-60"
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </label>

              <div className="text-xs text-muted-foreground">
                Требования: минимум 8 символов, 1 заглавная, 1 строчная, 1 цифра.
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              Пароль не изменится, если не включать режим смены пароля.
            </div>
          )}
        </div>

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {ok}
          </div>
        ) : null}

        <button
          disabled={locked || loading}
          className="h-11 rounded-xl bg-black px-4 text-white disabled:opacity-50"
        >
          {loading ? "Сохранение..." : "Сохранить (1 раз)"}
        </button>
      </form>
    </section>
  );
}