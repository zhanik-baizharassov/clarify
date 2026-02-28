"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim()) return setErr("Введите email");
    if (!password) return setErr("Введите пароль");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось войти");

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
      title="Войти"
      subtitle="Доступ к профилю, отзывам и кабинету компании."
      bottomHint={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            Нет аккаунта?{" "}
            <Link className="text-foreground underline underline-offset-4" href={`/signup?next=${encodeURIComponent(next)}`}>
              Регистрация
            </Link>
          </div>
          <Link className="hover:underline" href="/business/signup">
            Регистрация компании →
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Пароль</span>
          <input
            className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>

        {err ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </AuthShell>
  );
}