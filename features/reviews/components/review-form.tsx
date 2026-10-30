"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, SendHorizontal, Sparkles, Star } from "lucide-react";
import { errorMessage } from "@/shared/errors";

type Tag = { id: string; name: string; slug: string };

type Props = {
  placeSlug: string;
  tags: Tag[];
};

const RATING_META: Record<
  number,
  { title: string; desc: string; short: string }
> = {
  5: {
    title: "Отлично",
    desc: "Всё понравилось, можно смело рекомендовать другим.",
    short: "Супер",
  },
  4: {
    title: "Хорошо",
    desc: "Впечатление в целом хорошее, но были мелкие нюансы.",
    short: "Хорошо",
  },
  3: {
    title: "Нормально",
    desc: "Средний опыт: были и плюсы, и заметные минусы.",
    short: "Нормально",
  },
  2: {
    title: "Плохо",
    desc: "Ожидания не оправдались, есть серьёзные недостатки.",
    short: "Плохо",
  },
  1: {
    title: "Очень плохо",
    desc: "Сервис или качество оставили крайне плохое впечатление.",
    short: "Плохо",
  },
};

function clampRating(v: number) {
  if (!Number.isFinite(v)) return 5;
  return Math.min(5, Math.max(1, Math.trunc(v)));
}

export default function ReviewForm({ placeSlug, tags }: Props) {
  const router = useRouter();

  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = useMemo(() => text.trim(), [text]);

  const selectedSlugs = useMemo(
    () => tags.filter((t) => selected[t.slug]).map((t) => t.slug),
    [selected, tags],
  );

  const canSubmit = !loading && rating !== null && trimmedText.length >= 5;
  const shownRating = hoverRating ?? rating;
  const activeRatingMeta = shownRating ? RATING_META[shownRating] : null;
  const textLength = text.length;

  function toggleTag(slug: string) {
    setSelected((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (loading) return;

    if (rating === null) {
      setError("Выберите оценку от 1 до 5.");
      return;
    }

    if (trimmedText.length < 5) {
      setError("Текст отзыва слишком короткий (минимум 5 символов).");
      return;
    }

    const safeRating = clampRating(rating);

    let navigating = false;
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeSlug,
          rating: safeRating,
          text: trimmedText,
          tagSlugs: selectedSlugs,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отправить отзыв");

      // Keep the form disabled until navigation unmounts it; re-enabling it
      // here would allow a second click that fails with a 409 duplicate.
      navigating = true;
      router.push(`/place/${placeSlug}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Ошибка"));
    } finally {
      if (!navigating) setLoading(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Оценка</div>
            <div className="text-xs text-muted-foreground">
              Выберите общую оценку впечатления
            </div>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Оценка"
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const isFilled = shownRating !== null && value <= shownRating;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} из 5 — ${RATING_META[value].title}`}
                disabled={loading}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(null)}
                className="rounded-xl p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <Star
                  className={[
                    "h-9 w-9 transition sm:h-10 sm:w-10",
                    isFilled
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>

        <div
          className="min-h-[76px] rounded-2xl border bg-muted/20 p-4"
          aria-live="polite"
        >
          {activeRatingMeta ? (
            <>
              <div className="text-sm font-semibold">
                {shownRating} из 5 · {activeRatingMeta.title}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {activeRatingMeta.desc}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Нажмите на звезду, чтобы выбрать оценку.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Отзыв</div>
            <div className="text-xs text-muted-foreground">
              Напишите честно и по делу: что понравилось, что не понравилось и почему
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/60">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[160px] w-full resize-y bg-transparent p-1 outline-none disabled:opacity-60"
            placeholder="Например: обслуживание было быстрым, персонал вежливым, но в зале было шумно..."
            maxLength={5000}
            disabled={loading}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>Минимум 5 символов.</span>
            <span className={textLength >= 5 ? "text-primary" : ""}>
              {textLength} / 5000
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Полезный отзыв обычно содержит:
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
            <li>что именно понравилось или не понравилось;</li>
            <li>как вёл себя персонал и насколько быстро обслужили;</li>
            <li>что можно улучшить, если опыт был неидеальным.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Причины и теги</div>
            <div className="text-xs text-muted-foreground">
              Можно отметить несколько подходящих тегов
            </div>
          </div>

          <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            Выбрано: <span className="font-medium text-foreground">{selectedSlugs.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const isActive = !!selected[t.slug];

            return (
              <button
                key={t.id}
                type="button"
                disabled={loading}
                onClick={() => toggleTag(t.slug)}
                aria-pressed={isActive}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20",
                  "disabled:opacity-60",
                  isActive ? "border-primary bg-primary/10 text-primary" : "bg-card",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-2.5 w-2.5 rounded-full transition",
                    isActive ? "bg-primary" : "bg-muted-foreground/40",
                  ].join(" ")}
                />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="clarify-button-primary w-full sm:w-auto"
      >
        <SendHorizontal className="h-4 w-4" />
        {loading ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}