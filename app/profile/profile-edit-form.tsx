// app/profile/profile-edit-form.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type InitialVM = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
};

const NICK_RE = /^[a-zA-Z0-9_]+$/; // ✅ как в твоём API /api/profile
const MAX_CLIENT_MB = 1; // под твой серверный лимит 1MB

async function resizeToFile(
  file: File,
  maxSide = 512,
  quality = 0.86,
): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    i.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas не поддерживается");

  ctx.drawImage(img, 0, 0, tw, th);

  const outType =
    file.type === "image/png" ? "image/png" : "image/jpeg"; // jpeg лучше ужимает
  const ext = outType === "image/png" ? "png" : "jpg";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Не удалось обработать фото"))),
      outType,
      outType === "image/jpeg" ? quality : undefined,
    );
  });

  // size-check (мягкий, но полезный)
  if (blob.size > MAX_CLIENT_MB * 1024 * 1024) {
    // всё равно попробуем отправить — сервер тоже проверит,
    // но лучше сразу предупредить
    throw new Error(`Аватар: файл больше ${MAX_CLIENT_MB}MB`);
  }

  const nameBase = (file.name || "avatar").replace(/\.[^.]+$/, "");
  return new File([blob], `${nameBase}.${ext}`, { type: outType });
}

export default function ProfileEditForm({
  locked,
  initial,
}: {
  locked: boolean;
  initial: InitialVM;
}) {
  const router = useRouter();
  const canEdit = !locked;

  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [email] = useState(initial.email);

  // avatar
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial.avatarUrl ?? null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarClear, setAvatarClear] = useState(false);

  // password
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // чтобы не текли objectURL
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const saveLabel = useMemo(
    () => (canEdit ? "Сохранить (1 раз)" : "Сохранить"),
    [canEdit],
  );

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/^image\/(png|jpeg|jpg|webp)$/.test(f.type)) {
      setErr("Аватар: поддерживаются JPG/PNG/WEBP");
      return;
    }

    setErr(null);
    setOk(null);
    setAvatarClear(false);

    try {
      const resized = await resizeToFile(f, 512, 0.86);

      // превью через blob url
      const url = URL.createObjectURL(resized);
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);

      setAvatarFile(resized);
      setAvatarPreview(url);
    } catch (e: any) {
      setErr(e?.message ?? "Не удалось обработать изображение");
      setAvatarFile(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onRemoveAvatar() {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarClear(true);
    setErr(null);
    setOk(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!canEdit) return setErr("Редактирование профиля больше недоступно.");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const nn = nickname.trim();

    if (fn.length < 2) return setErr("Имя: минимум 2 символа");
    if (ln.length < 2) return setErr("Фамилия: минимум 2 символа");
    if (nn.length < 3) return setErr("Никнейм: минимум 3 символа");
    if (!NICK_RE.test(nn))
      return setErr("Никнейм: только латиница, цифры и _ (без пробелов)");

    if (changePassword) {
      if (password.length < 8) return setErr("Пароль: минимум 8 символов");
      if (!/[A-Z]/.test(password))
        return setErr("Пароль: нужна хотя бы 1 заглавная буква");
      if (!/[a-z]/.test(password))
        return setErr("Пароль: нужна хотя бы 1 строчная буква");
      if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");
      if (password !== password2) return setErr("Пароли не совпадают");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("firstName", fn);
      fd.set("lastName", ln);
      fd.set("nickname", nn);

      // ✅ ВАЖНО: API ожидает email (обязательное поле Schema)
      fd.set("email", email);

      if (changePassword && password.trim()) fd.set("password", password);

      // ✅ как в API: avatarClear = "1"
      if (avatarClear) fd.set("avatarClear", "1");

      // ✅ как в API: avatar = File
      if (avatarFile) fd.set("avatar", avatarFile);

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось сохранить профиль");

      setOk("Профиль сохранён");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Редактирование профиля</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Изменить данные можно только один раз.
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
          <span
            className={[
              "inline-flex h-2 w-2 rounded-full",
              canEdit ? "bg-emerald-500" : "bg-muted-foreground/50",
            ].join(" ")}
          />
          <span className="text-muted-foreground">
            {canEdit ? "Доступно (1 раз)" : "Недоступно"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        После успешного сохранения форма станет недоступной.
      </div>

      {/* Avatar */}
      <div className="rounded-2xl border bg-background p-5">
        <div className="text-sm font-semibold">Аватар</div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border bg-muted/30">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="avatar"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={onPickAvatar}
              disabled={loading || !canEdit}
            />

            <button
              type="button"
              className="inline-flex h-11 items-center rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              onClick={() => fileRef.current?.click()}
              disabled={loading || !canEdit}
            >
              Выбрать фото
            </button>

            <button
              type="button"
              className="inline-flex h-11 items-center rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              onClick={onRemoveAvatar}
              disabled={
                loading || !canEdit || (!avatarPreview && !initial.avatarUrl)
              }
            >
              Удалить фото
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Форматы: JPG/PNG/WEBP. Лимит: до 1MB.
        </div>
      </div>

      {/* Основные данные */}
      <div className="rounded-2xl border bg-background p-5">
        <div className="text-sm font-semibold">Основные данные</div>

        {/* ✅ FIX: grid + gap => поля не накладываются */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Имя">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading || !canEdit}
              autoComplete="given-name"
            />
          </Field>

          <Field label="Фамилия">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading || !canEdit}
              autoComplete="family-name"
            />
          </Field>

          <Field label="Никнейм" hint="Только латиница/цифры/_">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading || !canEdit}
              autoComplete="username"
            />
          </Field>

          <Field label="Email">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              value={email}
              disabled
              autoComplete="email"
            />
          </Field>
        </div>
      </div>

      {/* Безопасность */}
      <div className="rounded-2xl border bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Безопасность</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Пароль не изменится, если не включать режим смены пароля.
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-11 items-center rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
            onClick={() => setChangePassword((v) => !v)}
            disabled={loading || !canEdit}
          >
            {changePassword ? "Отменить" : "Сменить пароль"}
          </button>
        </div>

        {changePassword ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Новый пароль" hint="Мин 8 символов, A-z и 0-9">
              <input
                className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !canEdit}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Повторите пароль">
              <input
                className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading || !canEdit}
                autoComplete="new-password"
              />
            </Field>
          </div>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700">
          {ok}
        </div>
      ) : null}

      <button
        disabled={loading || !canEdit}
        className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
      >
        {loading ? "Сохранение..." : saveLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}