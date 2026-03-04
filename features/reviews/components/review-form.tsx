"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Tag = { id: string; name: string; slug: string };

type Props = {
  placeSlug: string;
  tags: Tag[];
};

function clampRating(v: number) {
  if (!Number.isFinite(v)) return 5;
  return Math.min(5, Math.max(1, Math.trunc(v)));
}

export default function ReviewForm({ placeSlug, tags }: Props) {
  const router = useRouter();

  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = useMemo(() => text.trim(), [text]);

  const selectedSlugs = useMemo(
    () => tags.filter((t) => selected[t.slug]).map((t) => t.slug),
    [selected, tags],
  );

  const canSubmit = !loading && trimmedText.length >= 5;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (loading) return;

    if (trimmedText.length < 5) {
      setError("Текст отзыва слишком короткий (минимум 5 символов).");
      return;
    }

    const safeRating = clampRating(rating);

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeSlug,
          rating: safeRating,
          text: trimmedText, // ✅ отправляем очищенный текст
          tagSlugs: selectedSlugs,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отправить отзыв");

      router.push(`/place/${placeSlug}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Оценка</span>
        <select
          value={rating}
          onChange={(e) => setRating(clampRating(Number(e.target.value)))}
          className="h-10 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          disabled={loading}
        >
          {[5, 4, 3, 2, 1].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Отзыв</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[120px] rounded-md border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          placeholder="Например: быстро обслужили, но было грязно..."
          disabled={loading}
        />
        <div className="text-xs text-muted-foreground">
          Минимум 5 символов.
        </div>
      </label>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Причины (теги)</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs disabled:opacity-60"
            >
              <input
                type="checkbox"
                checked={!!selected[t.slug]}
                disabled={loading}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [t.slug]: e.target.checked,
                  }))
                }
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        disabled={!canSubmit}
        className="h-11 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}