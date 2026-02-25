"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BusinessSignupPage() {
  const r = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/company-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName, companyName, email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Ошибка");
      r.push("/business");
      r.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Регистрация компании</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input className="h-10 rounded-md border px-3" placeholder="Ваше имя" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <input className="h-10 rounded-md border px-3" placeholder="Название компании" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <input className="h-10 rounded-md border px-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="h-10 rounded-md border px-3" placeholder="Пароль (мин 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        <button disabled={loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
          {loading ? "..." : "Создать бизнес-аккаунт"}
        </button>
      </form>
    </main>
  );
}