"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import { keepKzPhoneInput } from "@/lib/kz";

export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("+7");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (firstName.trim().length < 2) return setErr("Имя: минимум 2 символа");
    if (lastName.trim().length < 2) return setErr("Фамилия: минимум 2 символа");
    if (nickname.trim().length < 2) return setErr("Никнейм: минимум 2 символа");
    if (!/^[a-zA-Z0-9_.-]+$/.test(nickname.trim())) return setErr("Ник: только латиница/цифры/._-");
    if (!email.trim()) return setErr("Введите email");

    if (password.length < 8) return setErr("Пароль: минимум 8 символов");
    if (!/[A-Z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 заглавная буква");
    if (!/[a-z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 строчная буква");
    if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Ошибка регистрации");

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы оставлять отзывы и видеть профиль."
      bottomHint={
        <div className="flex items-center justify-between gap-3">
          <div>
            Уже есть аккаунт?{" "}
            <Link className="text-foreground underline underline-offset-4" href={`/login?next=${encodeURIComponent(next)}`}>
              Войти
            </Link>
          </div>
          <Link className="hover:underline" href="/business">
            Для бизнеса →
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Имя">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Например: Жанибек"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            disabled={loading}
          />
        </Field>

        <Field label="Фамилия">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Например: Байжарассов"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            disabled={loading}
          />
        </Field>

        <Field label="Никнейм" hint="Только латиница/цифры/._- (пример: zhanik02)">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="zhanik02"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
        </Field>

        <Field label="Телефон" hint="Формат: +7XXXXXXXXXX (только KZ оператор)">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="+77011234567"
            value={phone}
            onChange={(e) => setPhone(keepKzPhoneInput(e.target.value))}
            autoComplete="tel"
            inputMode="tel"
            disabled={loading}
          />
        </Field>

        <Field label="Email">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </Field>

        <Field label="Пароль" hint="Мин 8 символов, A-z и 0-9">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </Field>

        {err ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать аккаунт"}
        </button>
      </form>
    </AuthShell>
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
    <label className="grid gap-1">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}