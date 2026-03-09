"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, SendHorizontal, Sparkles, Star } from "lucide-react";

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
  const activeRatingMeta = RATING_META[rating];
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
          text: trimmedText,
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[5, 4, 3, 2, 1].map((value) => {
            const isActive = rating === value;
            const meta = RATING_META[value];

            return (
              <button
                key={value}
                type="button"
                disabled={loading}
                onClick={() => setRating(value)}
                className={[
                  "rounded-2xl border p-4 text-left transition duration-200",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20",
                  "disabled:opacity-60",
                  isActive ? "border-primary bg-primary/10 shadow-sm" : "bg-background",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-2xl font-semibold">{value}</div>
                  <Star
                    className={[
                      "h-4 w-4 transition",
                      isActive ? "fill-current text-primary" : "text-muted-foreground",
                    ].join(" ")}
                  />
                </div>
                <div className="mt-2 text-sm font-medium">{meta.short}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="text-sm font-semibold">{activeRatingMeta.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {activeRatingMeta.desc}
          </div>
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

        <div className="rounded-2xl border bg-background p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[160px] w-full resize-y bg-transparent p-1 outline-none disabled:opacity-60"
            placeholder="Например: обслуживание было быстрым, персонал вежливым, но в зале было шумно..."
            disabled={loading}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>Минимум 5 символов.</span>
            <span className={textLength >= 5 ? "text-primary" : ""}>
              {textLength} символов
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
                  isActive ? "border-primary bg-primary/10 text-primary" : "bg-background",
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
        disabled={!canSubmit}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        <SendHorizontal className="h-4 w-4" />
        {loading ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}