"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { containsProfanity } from "@/lib/profanity";

export default function ProfileEditForm({
  initial,
  locked,
}: {
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  locked: boolean;
}) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (locked) return;

    if (firstName.trim().length < 2) return setErr("Имя: минимум 2 символа");
    if (lastName.trim().length < 2) return setErr("Фамилия: минимум 2 символа");
    if (!email.trim()) return setErr("Введите email");

    if (containsProfanity(firstName)) return setErr('Поле "Имя" содержит недопустимые слова');
    if (containsProfanity(lastName)) return setErr('Поле "Фамилия" содержит недопустимые слова');

    if (password) {
      if (password.length < 8) return setErr("Пароль: минимум 8 символов");
      if (!/[A-Z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 заглавная буква");
      if (!/[a-z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 строчная буква");
      if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          avatarUrl: avatarUrl.trim(),
          password: password || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось сохранить профиль");

      setPassword("");
      setOk("Сохранено. Профиль заблокирован для дальнейших изменений.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border p-5">
      <div className="text-sm font-medium">Редактирование профиля</div>

      <div className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">
        Важно: изменить данные можно только <b>один раз</b>. После сохранения форма будет заблокирована.
      </div>

      {locked ? (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
          Профиль уже был изменён ранее — редактирование заблокировано.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <input
          disabled={locked || loading}
          className="h-10 rounded-md border px-3 disabled:opacity-60"
          placeholder="Имя"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          disabled={locked || loading}
          className="h-10 rounded-md border px-3 disabled:opacity-60"
          placeholder="Фамилия"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          disabled={locked || loading}
          className="h-10 rounded-md border px-3 disabled:opacity-60"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          disabled={locked || loading}
          className="h-10 rounded-md border px-3 disabled:opacity-60"
          placeholder="Фото (URL, можно оставить пустым)"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
        <input
          disabled={locked || loading}
          className="h-10 rounded-md border px-3 disabled:opacity-60"
          placeholder="Новый пароль (необязательно)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

        <button disabled={locked || loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
          {loading ? "Сохранение..." : "Сохранить (1 раз)"}
        </button>
      </form>
    </div>
  );
}