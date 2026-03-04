"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reviewId: string;
  disabled?: boolean;
};

export default function ReplyForm({ reviewId, disabled }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const trimmed = useMemo(() => text.trim(), [text]);
  const canSubmit = !disabled && !loading && trimmed.length >= 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (disabled) return;
    if (loading) return;

    if (trimmed.length < 2) {
      setErr("Ответ слишком короткий");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/review-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, text: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отправить ответ");

      setText("");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2">
      <textarea
        disabled={disabled || loading}
        className="min-h-[80px] rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        placeholder={
          disabled
            ? "Вы уже отвечали на этот отзыв"
            : "Напишите официальный ответ компании..."
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <button
        disabled={!canSubmit}
        className="h-11 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Отправка..." : "Ответить"}
      </button>
    </form>
  );
}