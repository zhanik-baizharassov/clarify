"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Tag = { id: string; name: string; slug: string };

export default function ReviewForm({
  placeSlug,
  tags,
}: {
  placeSlug: string;
  tags: Tag[];
}) {
  const router = useRouter();

  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlugs = useMemo(
    () => tags.filter((t) => selected[t.slug]).map((t) => t.slug),
    [selected, tags]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (text.trim().length < 5) {
      setError("Текст отзыва слишком короткий (минимум 5 символов).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeSlug,
          rating,
          text,
          tagSlugs: selectedSlugs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Не удалось отправить отзыв");
      }

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
          onChange={(e) => setRating(Number(e.target.value))}
          className="h-10 rounded-md border px-3"
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
          className="min-h-[120px] rounded-md border p-3"
          placeholder="Например: быстро обслужили, но было грязно..."
        />
      </label>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Причины (теги)</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
            >
              <input
                type="checkbox"
                checked={!!selected[t.slug]}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [t.slug]: e.target.checked }))
                }
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <button
        disabled={loading}
        className="h-10 rounded-md bg-black px-4 text-white disabled:opacity-50"
      >
        {loading ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}