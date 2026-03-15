"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KzAddressSuggestInput from "@/components/forms/KzAddressSuggestInput";
import { KZ_CITIES, keepKzPhoneInput, normalizeKzPhone } from "@/shared/kz/kz";

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

  const timeOptions = useMemo(() => buildTimeOptions(30), []);

  const [weekdayOpenTime, setWeekdayOpenTime] = useState("09:00");
  const [weekdayCloseTime, setWeekdayCloseTime] = useState("21:00");

  const [weekendClosed, setWeekendClosed] = useState(false);
  const [weekendOpenTime, setWeekendOpenTime] = useState("10:00");
  const [weekendCloseTime, setWeekendCloseTime] = useState("18:00");

  const workHoursSummary = useMemo(() => {
    const weekdays = `Пн–Пт ${weekdayOpenTime}–${weekdayCloseTime}`;
    const weekends = weekendClosed
      ? "Сб–Вс выходной"
      : `Сб–Вс ${weekendOpenTime}–${weekendCloseTime}`;

    return `${weekdays} • ${weekends}`;
  }, [
    weekdayOpenTime,
    weekdayCloseTime,
    weekendClosed,
    weekendOpenTime,
    weekendCloseTime,
  ]);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState<string>(KZ_CITIES[0] ?? "Алматы");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+7");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!categories.length) {
      return setErr(
        "Сейчас нет доступных активных категорий для создания филиала.",
      );
    }
    if (!categoryId) return setErr("Категория: выберите категорию");
    if (!city) return setErr("Город: выберите город из списка Казахстана");

    const addr = address.trim();
    if (addr.length < 5) return setErr("Адрес: минимум 5 символов");
    if (!/\d/.test(addr)) {
      return setErr("Адрес: укажите номер дома (например «Сейфуллина 34»)");
    }

    let phoneNorm = "";
    try {
      phoneNorm = normalizeKzPhone(phone, "Телефон");
    } catch (e: any) {
      return setErr(e?.message ?? "Телефон: некорректный формат");
    }

    if (toMinutes(weekdayOpenTime) >= toMinutes(weekdayCloseTime)) {
      return setErr("Будние дни: значение «С» должно быть раньше, чем «До»");
    }

    if (
      !weekendClosed &&
      toMinutes(weekendOpenTime) >= toMinutes(weekendCloseTime)
    ) {
      return setErr("Выходные дни: значение «С» должно быть раньше, чем «До»");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/company/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          city,
          address: addr,
          phone: phoneNorm,
          weekdayOpen: weekdayOpenTime,
          weekdayClose: weekdayCloseTime,
          weekendClosed,
          weekendOpen: weekendClosed ? null : weekendOpenTime,
          weekendClose: weekendClosed ? null : weekendCloseTime,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось создать филиал");

      setAddress("");
      setPhone("+7");
      setWeekdayOpenTime("09:00");
      setWeekdayCloseTime("21:00");
      setWeekendClosed(false);
      setWeekendOpenTime("10:00");
      setWeekendCloseTime("18:00");
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

      {!categories.length ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Сейчас нет доступных активных категорий для создания филиала. Если
          администратор снова активирует категорию, она появится в списке.
        </div>
      ) : null}

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
        <span className="text-xs text-muted-foreground">Город (только KZ)</span>
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
          Для лучшего результата введите улицу и номер дома.
        </span>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-muted-foreground">
          Телефон (+7XXXXXXXXXX)
        </span>
        <input
          disabled={loading}
          className="h-11 rounded-xl border px-3 disabled:opacity-60"
          placeholder="+7XXXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(keepKzPhoneInput(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
        />
      </label>

      <div className="grid gap-4 rounded-xl border p-4">
        <div className="text-xs text-muted-foreground">Время работы</div>

        <div className="grid gap-3 rounded-xl border p-4">
          <div className="text-sm font-medium">Будние дни</div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">С</span>
              <select
                disabled={loading}
                className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
                value={weekdayOpenTime}
                onChange={(e) => setWeekdayOpenTime(e.target.value)}
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
                disabled={loading}
                className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
                value={weekdayCloseTime}
                onChange={(e) => setWeekdayCloseTime(e.target.value)}
              >
                {timeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium">Выходные дни</div>

            <button
              type="button"
              disabled={loading}
              onClick={() => setWeekendClosed((prev) => !prev)}
              className={[
                "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition",
                weekendClosed
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted/30",
                loading ? "opacity-60" : "",
              ].join(" ")}
            >
              {weekendClosed
                ? "По выходным не работаем"
                : "Указать время выходных"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-muted-foreground">С</span>
              <select
                disabled={loading || weekendClosed}
                className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
                value={weekendOpenTime}
                onChange={(e) => setWeekendOpenTime(e.target.value)}
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
                disabled={loading || weekendClosed}
                className="h-11 rounded-xl border bg-background px-3 text-foreground [color-scheme:dark] disabled:opacity-60"
                value={weekendCloseTime}
                onChange={(e) => setWeekendCloseTime(e.target.value)}
              >
                {timeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {weekendClosed ? (
            <div className="text-xs text-muted-foreground">
              Для выходных установлен режим:{" "}
              <span className="font-medium text-foreground">выходной</span>
            </div>
          ) : null}
        </div>

        <div className="text-xs text-muted-foreground">
          Итог:{" "}
          <span className="font-medium text-foreground">
            {workHoursSummary}
          </span>
        </div>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <button
        disabled={loading || !categories.length}
        className="h-11 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Создание..." : "Создать филиал"}
      </button>
    </form>
  );
}
