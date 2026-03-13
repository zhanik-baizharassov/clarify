"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function getDefaultDateTimeLocal(hoursAhead = 24) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toDateTimeLocalValue(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return getDefaultDateTimeLocal();
  }

  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toUtcIsoFromDateTimeLocal(value: string) {
  if (!value) {
    throw new Error("Укажите дату и время блокировки");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата блокировки");
  }

  return date.toISOString();
}

function isBlockActive(blockedUntil?: string | null) {
  if (!blockedUntil) return false;

  const ts = new Date(blockedUntil).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

export default function CompanyModerationActions({
  companyId,
  blockedUntil,
}: {
  companyId: string;
  blockedUntil?: string | null;
}) {
  const router = useRouter();

  const [datetime, setDatetime] = useState(
    blockedUntil && isBlockActive(blockedUntil)
      ? toDateTimeLocalValue(blockedUntil)
      : getDefaultDateTimeLocal(),
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isBlocked = isBlockActive(blockedUntil);

  async function runAction(action: "block" | "unblock") {
    setLoading(true);
    setMsg(null);

    try {
      const payload =
        action === "block"
          ? {
              action,
              blockedUntil: toUtcIsoFromDateTimeLocal(datetime),
              reason: reason.trim() || undefined,
            }
          : { action };

      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось выполнить действие");
      }

      setMsg(
        action === "block"
          ? "Компания временно заблокирована"
          : "Блокировка компании снята",
      );
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-sm font-semibold">Управление компанией</div>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Заблокировать до</span>
          <input
            type="datetime-local"
            className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            disabled={loading}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">
            Причина блокировки (необязательно)
          </span>
          <input
            className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder=""
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAction("block")}
            disabled={loading || !datetime}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Сохраняем..." : "Заблокировать"}
          </button>

          <button
            type="button"
            onClick={() => runAction("unblock")}
            disabled={loading || !isBlocked}
            className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
          >
            Разблокировать
          </button>
        </div>

        {msg ? (
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}