"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (firstName.trim().length < 2) return setErr("Введите имя (мин 2 символа)");
    if (lastName.trim().length < 2) return setErr("Введите фамилию (мин 2 символа)");
    if (nickname.trim().length < 2) return setErr("Введите никнейм (мин 2 символа)");
    if (!/^[a-zA-Z0-9_.-]+$/.test(nickname.trim())) return setErr("Ник: только латиница/цифры/._-");
    if (phone.trim().length < 5) return setErr("Введите номер телефона");
    if (!email.trim()) return setErr("Введите email");

    if (password.length < 8) return setErr("Пароль минимум 8 символов");
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

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

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
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-center">Регистрация</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input className="h-10 rounded-md border px-3" placeholder="Имя"
          value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />

        <input className="h-10 rounded-md border px-3" placeholder="Фамилия"
          value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />

        <input className="h-10 rounded-md border px-3" placeholder="Никнейм (латиница/цифры/._-)"
          value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" />

        <input className="h-10 rounded-md border px-3" placeholder="Телефон"
          value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />

        <input className="h-10 rounded-md border px-3" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

        <input className="h-10 rounded-md border px-3" placeholder="Пароль (мин 8, A-z, 0-9)"
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button disabled={loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
          {loading ? "Создание..." : "Создать аккаунт"}
        </button>
      </form>
    </main>
  );
}