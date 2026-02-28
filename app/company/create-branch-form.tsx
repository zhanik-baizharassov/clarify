"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KZ_CITIES, keepKzPhoneInput, normalizeKzPhone } from "@/lib/kz";

type Category = { id: string; name: string };

type TimeOption = { label: string; value: string };

function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map((x) => Number(x));
  return hh * 60 + mm;
}

function buildTimeOptions(stepMin = 30): TimeOption[] {
  const out: TimeOption[] = [];
  for (let m = 0; m < 24 * 60; m += stepMin) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const v = `${hh}:${mm}`;
    out.push({ label: v, value: v });
  }
  return out;
}

export default function CreateBranchForm({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState<string>(KZ_CITIES[0] ?? "Алматы");

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+7");

  const timeOptions = useMemo(() => buildTimeOptions(30), []);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");

  const workHours = useMemo(
    () => `${openTime}–${closeTime}`,
    [openTime, closeTime],
  );

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!categoryId) return setErr("Категория: выберите категорию");
    if (!city) return setErr("Город: выберите город из списка Казахстана");

    if (address.trim().length < 5) return setErr("Адрес: минимум 5 символов");

    let phoneNorm = "";
    try {
      phoneNorm = normalizeKzPhone(phone, "Телефон");
    } catch (e: any) {
      return setErr(e?.message ?? "Телефон: некорректный формат");
    }

    if (toMinutes(openTime) >= toMinutes(closeTime)) {
      return setErr("Время работы: значение «С» должно быть раньше, чем «До»");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/company/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          city, // уже валидный KZ город из списка
          address: address.trim(),
          phone: phoneNorm,
          workHours, // "09:00–21:00"
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось создать филиал");

      setAddress("");
      setPhone("+7");
      setOpenTime("09:00");
      setCloseTime("21:00");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl border p-5">
      <div className="text-sm font-medium">
        Создать филиал (карточку для отзывов)
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Категория</span>
        <select
          className="h-11 rounded-xl border px-3"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Город (только KZ)</span>
        <select
          className="h-11 rounded-xl border px-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          {KZ_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Адрес</span>
        <input
          className="h-11 rounded-xl border px-3"
          placeholder="Например: пр-т Абая 10"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">
          Телефон (+7XXXXXXXXXX)
        </span>
        <input
          className="h-11 rounded-xl border px-3"
          placeholder="+7XXXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(keepKzPhoneInput(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
        />
      </label>

      <div className="grid gap-2 rounded-xl border p-4">
        <div className="text-xs text-muted-foreground">Время работы</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">С</span>
            <select
              className="h-11 rounded-xl border px-3"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            >
              {timeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">До</span>
            <select
              className="h-11 rounded-xl border px-3"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            >
              {timeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="text-xs text-muted-foreground">
          Итог: <span className="font-medium text-foreground">{workHours}</span>
        </div>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <button
        disabled={loading}
        className="h-11 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {" "}
        {loading ? "Создание..." : "Создать филиал"}
      </button>
    </form>
  );
}
