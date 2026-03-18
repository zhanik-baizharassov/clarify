"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/ui/UserAvatar";

type TabKey = "main" | "security";

type InitialVM = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
};

const NICK_RE = /^[a-zA-Z0-9_]+$/;

export default function ProfileEditForm({
  tab = "main",
  locked,
  initial,
}: {
  tab?: TabKey;
  locked: boolean;
  initial: InitialVM;
}) {
  const router = useRouter();
  const canEdit = tab === "security" ? true : !locked;

  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [email, setEmail] = useState(initial.email ?? "");

  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "security") setChangePassword(true);
  }, [tab]);

  const normalizedInitialEmail = initial.email.trim().toLowerCase();
  const normalizedNextEmail = email.trim().toLowerCase();
  const isEmailChanged = normalizedNextEmail !== normalizedInitialEmail;

  const saveLabel = useMemo(() => {
    if (tab === "security") return "Сохранить пароль";
    return canEdit ? "Сохранить (1 раз)" : "Сохранить";
  }, [tab, canEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!canEdit) return setErr("Редактирование профиля больше недоступно.");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const nn = nickname.trim();
    const cp = currentPassword.trim();

    if (tab === "main") {
      if (fn.length < 2) return setErr("Имя: минимум 2 символа");
      if (ln.length < 2) return setErr("Фамилия: минимум 2 символа");
      if (nn.length < 3) return setErr("Никнейм: минимум 3 символа");
      if (!NICK_RE.test(nn)) {
        return setErr("Никнейм: только латиница, цифры и _ (без пробелов)");
      }

      if (isEmailChanged && !cp) {
        return setErr("Для смены email введите текущий пароль.");
      }
    }

    if (tab === "security") {
      if (!changePassword) return setErr("Включите смену пароля.");
      if (!cp) return setErr("Введите текущий пароль.");
      if (password.length < 8) return setErr("Пароль: минимум 8 символов");
      if (!/[A-Z]/.test(password))
        return setErr("Пароль: нужна хотя бы 1 заглавная буква");
      if (!/[a-z]/.test(password))
        return setErr("Пароль: нужна хотя бы 1 строчная буква");
      if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");
      if (password !== password2) return setErr("Пароли не совпадают");
    } else {
      if (changePassword) {
        if (!cp) return setErr("Для смены пароля введите текущий пароль.");
        if (password.length < 8) return setErr("Пароль: минимум 8 символов");
        if (!/[A-Z]/.test(password))
          return setErr("Пароль: нужна хотя бы 1 заглавная буква");
        if (!/[a-z]/.test(password))
          return setErr("Пароль: нужна хотя бы 1 строчная буква");
        if (!/\d/.test(password))
          return setErr("Пароль: нужна хотя бы 1 цифра");
        if (password !== password2) return setErr("Пароли не совпадают");
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();

      fd.set("firstName", fn || initial.firstName || "");
      fd.set("lastName", ln || initial.lastName || "");
      fd.set("nickname", nn || initial.nickname || "");
      fd.set("email", email);

      if (cp) fd.set("currentPassword", cp);
      if (changePassword && password.trim()) fd.set("password", password);

      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось сохранить");

      setOk(tab === "security" ? "Пароль обновлён" : "Профиль сохранён");
      router.refresh();

      setCurrentPassword("");
      setPassword("");
      setPassword2("");
      setShowCurrentPassword(false);
      setShowPassword(false);
      setShowPassword2(false);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (tab === "security") {
    return (
      <form onSubmit={onSubmit} className="grid gap-4">
        <div>
          <div className="text-xl font-semibold">Безопасность</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Здесь можно сменить пароль аккаунта.
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Смена пароля</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Для смены пароля нужно сначала ввести текущий пароль.
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              onClick={() => setChangePassword((v) => !v)}
              disabled={loading || !canEdit}
            >
              {changePassword ? "Скрыть" : "Сменить пароль"}
            </button>
          </div>

          {changePassword ? (
            <div className="mt-4 grid gap-3">
              <Field label="Текущий пароль">
                <div className="relative">
                  <input
                    className="h-11 w-full rounded-xl border bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading || !canEdit}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    disabled={loading || !canEdit}
                    aria-label={
                      showCurrentPassword
                        ? "Скрыть текущий пароль"
                        : "Показать текущий пароль"
                    }
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Новый пароль" hint="Мин 8 символов, A-z и 0-9">
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || !canEdit}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loading || !canEdit}
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field label="Повторите пароль">
                  <div className="relative">
                    <input
                      className="h-11 w-full rounded-xl border bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                      type={showPassword2 ? "text" : "password"}
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      disabled={loading || !canEdit}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword2((v) => !v)}
                      disabled={loading || !canEdit}
                      aria-label={
                        showPassword2 ? "Скрыть пароль" : "Показать пароль"
                      }
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword2 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>
              </div>
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
          disabled={loading || !canEdit || !changePassword}
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Сохранение..." : saveLabel}
        </button>

        <div className="text-xs text-muted-foreground">
          Пароль можно менять в любое время. Для смены email в основной вкладке
          тоже потребуется текущий пароль.
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">Редактирование профиля</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Изменить основные данные можно только один раз.
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

      <div className="rounded-2xl border bg-background p-5">
        <div className="text-sm font-semibold">Системный аватар</div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <UserAvatar
            size="md"
            user={{
              firstName,
              lastName,
              nickname,
              email,
            }}
          />

          <div className="text-sm text-muted-foreground">
            Аватар формируется автоматически по вашим данным и не требует
            загрузки изображений.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5">
        <div className="text-sm font-semibold">Основные данные</div>

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
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !canEdit}
              autoComplete="email"
            />
          </Field>
        </div>

        <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
          <div className="text-sm font-semibold">Подтверждение личности</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Текущий пароль нужен только если вы меняете email.
          </div>

          <div className="mt-4">
            <Field label="Текущий пароль" hint="Обязателен только для смены email">
              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading || !canEdit}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  disabled={loading || !canEdit}
                  aria-label={
                    showCurrentPassword
                      ? "Скрыть текущий пароль"
                      : "Показать текущий пароль"
                  }
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Смена пароля находится во вкладке{" "}
          <span className="font-medium">«Безопасность»</span>.
        </div>
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
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}