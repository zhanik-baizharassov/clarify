"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim()) return setErr("Введите email");
    if (password.length < 8) return setErr("Пароль должен быть минимум 8 символов");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });

      // ✅ безопасное чтение ответа (даже если сервер вернул не-JSON)
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error ?? "Ошибка регистрации");
      }

      router.push("/");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-center">Регистрация</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          className="h-10 rounded-md border px-3"
          placeholder="Имя (необязательно)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <input
          className="h-10 rounded-md border px-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          className="h-10 rounded-md border px-3"
          placeholder="Пароль (мин 8 символов)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button
          disabled={loading}
          className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать аккаунт"}
        </button>
      </form>
    </main>
  );
}