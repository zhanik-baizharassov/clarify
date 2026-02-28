"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import { keepKzPhoneInput } from "@/lib/kz";

export default function BusinessSignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/company";

  const [companyName, setCompanyName] = useState("");
  const [bin, setBin] = useState("");
  const [phone, setPhone] = useState("+7");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (companyName.trim().length < 2) return setErr("Название компании: минимум 2 символа");
    if (!/^\d{12}$/.test(bin.trim())) return setErr("БИН должен состоять из 12 цифр");
    if (!email.trim()) return setErr("Введите email");
    if (address.trim().length < 5) return setErr("Адрес: минимум 5 символов");

    if (password.length < 8) return setErr("Пароль: минимум 8 символов");
    if (!/[A-Z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 заглавная буква");
    if (!/[a-z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 строчная буква");
    if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/company-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          bin: bin.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Ошибка регистрации компании");

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
      title="Регистрация компании"
      subtitle="Создайте бизнес-аккаунт, чтобы добавлять филиалы и отвечать на отзывы."
      bottomHint={
        <div className="flex items-center justify-between gap-3">
          <div>
            Уже есть бизнес-аккаунт?{" "}
            <Link className="text-foreground underline underline-offset-4" href={`/login?next=${encodeURIComponent(next)}`}>
              Войти
            </Link>
          </div>
          <Link className="hover:underline" href="/signup">
            Я пользователь →
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Название компании">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Например: iSpace"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
          />
        </Field>

        <Field label="БИН" hint="12 цифр">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="123456789012"
            value={bin}
            onChange={(e) => setBin(e.target.value.replace(/\D/g, "").slice(0, 12))}
            inputMode="numeric"
            disabled={loading}
          />
        </Field>

        <Field label="Телефон" hint="Только KZ: +7XXXXXXXXXX">
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
            placeholder="company@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </Field>

        <Field label="Адрес" hint="Казахстан">
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Алматы, Самал-2, дом 111"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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
          {loading ? "Создание..." : "Создать бизнес-аккаунт"}
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