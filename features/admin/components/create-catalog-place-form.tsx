"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KzAddressSuggestInput from "@/components/forms/KzAddressSuggestInput";
import {
  KZ_CITIES,
  keepKzPhoneInput,
  normalizeKzPhone,
} from "@/shared/kz/kz";

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

export default function CreateCatalogPlaceForm({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();

  const timeOptions = useMemo(() => buildTimeOptions(30), []);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [city, setCity] = useState<string>(KZ_CITIES[0] ?? "Алматы");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+7");

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
    if (!categoryId) {
      setErr("Категория: выберите категорию");
      return;
    }

    const title = name.trim();
    if (title.length < 2) {
      setErr("Название места: минимум 2 символа");
      return;
    }

    if (!city) {
      setErr("Город: выберите город из списка Казахстана");
      return;
    }

    const addr = address.trim();
    if (addr.length < 5) {
      setErr("Адрес: минимум 5 символов");
      return;
    }
    if (!/\d/.test(addr)) {
      setErr("Адрес: укажите номер дома (например «Сейфуллина 34»)");
      return;
    }

    let phoneNorm = "";
    try {
      phoneNorm = normalizeKzPhone(phone, "Телефон");
    } catch (e: any) {
      setErr(e?.message ?? "Телефон: некорректный формат");
      return;
    }

    if (toMinutes(weekdayOpenTime) >= toMinutes(weekdayCloseTime)) {
      setErr("Будние дни: значение «С» должно быть раньше, чем «До»");
      return;
    }

    if (
      !weekendClosed &&
      toMinutes(weekendOpenTime) >= toMinutes(weekendCloseTime)
    ) {
      setErr("Выходные дни: значение «С» должно быть раньше, чем «До»");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
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

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось создать карточку");
      }

      setSuccess(`Карточка создана: ${data?.name ?? title}`);
      setName("");
      setAddress("");
      setPhone("+7");
      setWeekdayOpenTime("09:00");
      setWeekdayCloseTime("21:00");
      setWeekendClosed(false);
      setWeekendOpenTime("10:00");
      setWeekendCloseTime("18:00");
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
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Эта форма создаёт{" "}
        <span className="font-medium text-foreground">каталожную карточку</span>{" "}
        без привязки к компании. Позже её можно будет передать бизнесу через
        claim-flow.
      </div>

      <section className="rounded-2xl border bg-background p-5">
        <div className="mb-4">
          <div className="text-base font-semibold">Основные данные</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Название, категория, город, адрес и телефон.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Название места</span>
            <input
              disabled={loading}
              className="h-11 rounded-xl border px-3 disabled:opacity-60"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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

          <label className="grid gap-1 md:col-span-2 xl:col-span-2">
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
        </div>
      </section>

      <section className="rounded-2xl border bg-background p-5">
        <div className="mb-4">
          <div className="text-base font-semibold">Время работы</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Укажи график для будней и выходных.
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <div className="mb-3 text-sm font-medium">Будние дни</div>

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

          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
              <div className="mt-3 text-xs text-muted-foreground">
                Для выходных установлен режим:{" "}
                <span className="font-medium text-foreground">выходной</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          Итог:{" "}
          <span className="font-medium text-foreground">{workHoursSummary}</span>
        </div>
      </section>

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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4">
        <div className="text-sm text-muted-foreground">
          После создания карточка сразу появится в каталоге.
        </div>

        <button
          disabled={loading || !categories.length}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать карточку"}
        </button>
      </div>
    </form>
  );
}