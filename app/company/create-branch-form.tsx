"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

export default function CreateBranchForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState("Алматы");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!categoryId) return setErr("Выберите категорию");
    if (city.trim().length < 2) return setErr("Введите город");
    if (address.trim().length < 5) return setErr("Введите адрес");
    if (phone.trim().length < 5) return setErr("Введите телефон");
    if (workHours.trim().length < 2) return setErr("Введите время работы");

    setLoading(true);
    try {
      const res = await fetch("/api/company/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          city: city.trim(),
          address: address.trim(),
          phone: phone.trim(),
          workHours: workHours.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось создать филиал");

      setAddress("");
      setPhone("");
      setWorkHours("");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl border p-5">
      <div className="text-sm font-medium">Создать филиал (карточку для отзывов)</div>

      <select className="h-10 rounded-md border px-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input className="h-10 rounded-md border px-3" placeholder="Город" value={city} onChange={(e) => setCity(e.target.value)} />
      <input className="h-10 rounded-md border px-3" placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
      <input className="h-10 rounded-md border px-3" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input
        className="h-10 rounded-md border px-3"
        placeholder="Время работы (например: 09:00–21:00)"
        value={workHours}
        onChange={(e) => setWorkHours(e.target.value)}
      />

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <button disabled={loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
        {loading ? "Создание..." : "Создать филиал"}
      </button>
    </form>
  );
}