"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  placeId: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | null;
  retryAfterSec?: number;
};

function formatDurationFromSeconds(totalSec: number) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} мин ${seconds} с` : `${minutes} мин`;
  }

  return `${seconds} с`;
}

export default function ClaimPlaceButton({
  placeId,
  status,
  retryAfterSec = 0,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(retryAfterSec);

  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isRejectedCooldown = status === "REJECTED" && cooldownSec > 0;

  useEffect(() => {
    setCooldownSec(retryAfterSec);
  }, [retryAfterSec]);

  useEffect(() => {
    if (cooldownSec <= 0) return;

    const t = setInterval(() => {
      setCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [cooldownSec]);

  useEffect(() => {
    if (status === "PENDING" || status === "APPROVED") {
      setSuccess(null);
    }
  }, [status]);

  async function handleClaim() {
    if (loading || isPending || isApproved || isRejectedCooldown) return;

    setErr(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429 && typeof data?.retryAfterSec === "number") {
          setCooldownSec(data.retryAfterSec);
        }

        throw new Error(data?.error ?? "Не удалось отправить заявку");
      }

      setSuccess(
        "Заявка отправлена. После проверки карточку можно будет привязать к вашей компании.",
      );
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {status === "PENDING" ? (
        <div className="rounded-lg border bg-primary/5 p-4 text-sm text-primary">
          Вы уже отправили заявку на эту карточку. Она ожидает проверки.
        </div>
      ) : null}

      {status === "APPROVED" ? (
        <div className="rounded-lg border bg-primary/5 p-4 text-sm text-primary">
          Заявка уже была одобрена. Если карточка ещё не привязана, проверьте
          админское решение или обратитесь к администратору.
        </div>
      ) : null}

      {status === "REJECTED" ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          {cooldownSec > 0
            ? `Предыдущая заявка была отклонена. Повторная отправка станет доступна через ${formatDurationFromSeconds(
                cooldownSec,
              )}.`
            : "Предыдущая заявка была отклонена. Вы можете отправить новую заявку повторно."}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border bg-primary/5 p-4 text-sm text-primary">
          {success}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading || isPending || isApproved || isRejectedCooldown}
        onClick={handleClaim}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? "Отправка..."
          : isPending
            ? "Заявка уже отправлена"
            : isApproved
              ? "Заявка уже одобрена"
              : isRejectedCooldown
                ? `Доступно через ${formatDurationFromSeconds(cooldownSec)}`
                : status === "REJECTED"
                  ? "Отправить заявку повторно"
                  : "Заявить права на карточку"}
      </button>
    </div>
  );
}