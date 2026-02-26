"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReplyForm({ reviewId, disabled }: { reviewId: string; disabled?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (text.trim().length < 2) return setErr("Ответ слишком короткий");

    setLoading(true);
    try {
      const res = await fetch("/api/review-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, text: text.trim() }),
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
        className="min-h-[80px] rounded-md border p-3 text-sm disabled:opacity-60"
        placeholder={disabled ? "Вы уже отвечали на этот отзыв" : "Напишите официальный ответ компании..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {err ? <div className="text-sm text-red-600">{err}</div> : null}
      <button disabled={disabled || loading} className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50">
        {loading ? "Отправка..." : "Ответить"}
      </button>
    </form>
  );
}