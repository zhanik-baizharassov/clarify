"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClaimAction = "APPROVE" | "REJECT";

function getConfirmText(action: ClaimAction) {
  if (action === "APPROVE") {
    return "Подтвердить заявку? Карточка будет привязана к этой компании, а остальные pending-заявки на это место будут автоматически отклонены.";
  }

  return "Отклонить заявку?";
}

export default function ClaimReviewActions({
  claimId,
}: {
  claimId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<ClaimAction | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleAction(action: ClaimAction) {
    if (loading) return;

    const confirmed = window.confirm(getConfirmText(action));
    if (!confirmed) return;

    setErr(null);
    setLoading(action);

    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось обработать заявку");
      }

      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border bg-background p-4">
      <div className="text-sm font-medium">Решение по заявке</div>

      <div className="text-sm text-muted-foreground">
        При одобрении карточка будет привязана к компании, а остальные pending-заявки
        на это место автоматически отклонятся.
      </div>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!!loading}
          onClick={() => handleAction("APPROVE")}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading === "APPROVE" ? "Одобрение..." : "Одобрить"}
        </button>

        <button
          type="button"
          disabled={!!loading}
          onClick={() => handleAction("REJECT")}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-destructive/30 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-50"
        >
          {loading === "REJECT" ? "Отклонение..." : "Отклонить"}
        </button>
      </div>
    </div>
  );
}