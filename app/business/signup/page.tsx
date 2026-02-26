"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BusinessSignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/company";

  const [companyName, setCompanyName] = useState("");
  const [bin, setBin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (companyName.trim().length < 2) return setErr("Введите название компании");
    if (!/^\d{12}$/.test(bin.trim())) return setErr("БИН должен состоять из 12 цифр");
    if (phone.trim().length < 5) return setErr("Введите номер телефона");
    if (!email.trim()) return setErr("Введите email");
    if (address.trim().length < 5) return setErr("Введите адрес (мин 5 символов)");

    if (password.length < 8) return setErr("Пароль минимум 8 символов");
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

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

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
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-center">Регистрация компании</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          className="h-10 rounded-md border px-3"
          placeholder="Название компании"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <input
          className="h-10 rounded-md border px-3"
          placeholder="БИН (12 цифр)"
          value={bin}
          onChange={(e) => setBin(e.target.value)}
          inputMode="numeric"
        />

        <input
          className="h-10 rounded-md border px-3"
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
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
          placeholder="Адрес"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <input
          className="h-10 rounded-md border px-3"
          placeholder="Пароль (мин 8, A-z, 0-9)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button disabled={loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
          {loading ? "Создание..." : "Создать бизнес-аккаунт"}
        </button>
      </form>
    </main>
  );
}