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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const trimmed = useMemo(() => text.trim(), [text]);
  const canSubmit = !disabled && !loading && trimmed.length >= 2;

  async function sendReply() {
    setLoading(true);
    setErr(null);

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (disabled) return;
    if (loading) return;

    if (trimmed.length < 2) {
      setErr("Ответ слишком короткий");
      return;
    }

    setConfirmOpen(true);
  }

  async function onConfirm() {
    if (loading) return;
    setConfirmOpen(false);
    await sendReply();
  }

  if (disabled) return null;

  return (
    <>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2">
        <textarea
          disabled={loading}
          className="min-h-[80px] rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          placeholder="Напишите официальный ответ компании..."
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

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Подтверждение ответа</h3>

            <p className="mt-3 text-sm text-muted-foreground">
              Будьте внимательны: официальный ответ нельзя будет изменить после
              отправки.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              После отправки этот отзыв исчезнет из неотвеченных и попадёт во
              вкладку отвеченных.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition hover:bg-muted/30"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Понятно, отправить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}