"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KzAddressSuggestInput from "@/components/forms/KzAddressSuggestInput";
import { KZ_CITIES, keepKzPhoneInput } from "@/shared/kz/kz";

type Category = { id: string; name: string };

export default function CreateCatalogPlaceForm({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState<string>(KZ_CITIES[0] ?? "Алматы");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);

    if (loading) return;
    if (!categories.length) {
      setErr("Категории не загружены. Обновите страницу.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId,
          city,
          address,
          phone,
          website,
          workHours,
          description,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось создать карточку");
      }

      setSuccess(`Карточка создана: ${data?.name ?? name}`);
      setName("");
      setAddress("");
      setPhone("");
      setWebsite("");
      setWorkHours("");
      setDescription("");
      setCategoryId(categories[0]?.id ?? "");
      setCity(KZ_CITIES[0] ?? "Алматы");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-2xl border p-5">
      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Эта форма создаёт{" "}
        <span className="font-medium text-foreground">каталожную карточку</span>{" "}
        без привязки к компании. Позже такую карточку можно будет передать
        бизнесу через claim-flow.
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Название места</span>
        <input
          disabled={loading}
          className="h-11 rounded-xl border px-3 disabled:opacity-60"
          placeholder="Например: Coffee Boom Dostyk"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Категория</span>
          <select
            disabled={loading || !categories.length}
            className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
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
          <span className="text-xs text-muted-foreground">Город</span>
          <select
            disabled={loading}
            className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
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
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">Адрес</span>
        <KzAddressSuggestInput
          city={city}
          value={address}
          onChange={setAddress}
          disabled={loading}
          placeholder="Начните вводить адрес и выберите подсказку 2GIS"
        />
        <span className="text-xs text-muted-foreground">
          Лучше выбирать адрес из подсказок, чтобы карточка точнее прошла проверку.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">
            Телефон (необязательно)
          </span>
          <input
            disabled={loading}
            className="h-11 rounded-xl border px-3 disabled:opacity-60"
            placeholder="+7XXXXXXXXXX"
            value={phone}
            onChange={(e) => {
              const next = e.target.value;
              setPhone(next ? keepKzPhoneInput(next) : "");
            }}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">
            Сайт (необязательно)
          </span>
          <input
            disabled={loading}
            className="h-11 rounded-xl border px-3 disabled:opacity-60"
            placeholder="https://example.kz"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">
          График работы (необязательно)
        </span>
        <input
          disabled={loading}
          className="h-11 rounded-xl border px-3 disabled:opacity-60"
          placeholder="Например: Пн–Пт 09:00–18:00 • Сб–Вс выходной"
          value={workHours}
          onChange={(e) => setWorkHours(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">
          Описание (необязательно)
        </span>
        <textarea
          disabled={loading}
          className="min-h-[110px] rounded-xl border px-3 py-3 disabled:opacity-60"
          placeholder="Короткое описание места для каталога..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {success}
        </div>
      ) : null}

      <button
        disabled={loading || !categories.length}
        className="h-11 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Создание..." : "Создать карточку"}
      </button>
    </form>
  );
}