"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";

const ROTATING_WORDS = [
  "кофейне",
  "автосервисе",
  "аптеке",
  "барбершопе",
  "ресторане",
  "клинике",
];

/** Swaps the highlighted word of the headline every couple of seconds. */
export function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Start rotating only after the page has settled: replacing the element
    // during load would keep resetting the browser's LCP measurement.
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setIndex((i) => (i + 1) % ROTATING_WORDS.length);
      }, 2600);
    }, 4500);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <span className="block min-h-[1.2em]" aria-hidden>
      <span key={index} className="word-swap text-gradient-brand inline-block">
        {ROTATING_WORDS[index]}
      </span>
    </span>
  );
}

const PLACEHOLDERS = [
  "Кофейня в Алматы",
  "Автосервис в Астане",
  "Аптека рядом с домом",
  "Барбершоп в Шымкенте",
  "Доставка суши",
];

/**
 * Cycles placeholder phrases (delete, then type the next) while the field is
 * empty and unfocused. The first phrase is rendered statically so the page is
 * complete without JS and with reduced motion.
 */
function useTypewriterPlaceholder(paused: boolean) {
  const [text, setText] = useState(PLACEHOLDERS[0]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let phrase = 0;
    let chars = PLACEHOLDERS[0].length;
    let deleting = true;
    let timer = 0;

    const tick = () => {
      const full = PLACEHOLDERS[phrase];

      if (!deleting) {
        chars += 1;
        setText(full.slice(0, chars));
        if (chars === full.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1800);
          return;
        }
        timer = window.setTimeout(tick, 70);
      } else {
        chars -= 1;
        setText(full.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          phrase = (phrase + 1) % PLACEHOLDERS.length;
          timer = window.setTimeout(tick, 350);
          return;
        }
        timer = window.setTimeout(tick, 35);
      }
    };

    timer = window.setTimeout(tick, 1800);
    return () => window.clearTimeout(timer);
  }, [paused]);

  return text;
}

export function HeroSearch({
  popular = [],
}: {
  popular?: Array<{ name: string; slug: string }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const typed = useTypewriterPlaceholder(focused || q.length > 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = q.trim();
    router.push(value ? `/explore?q=${encodeURIComponent(value)}` : "/explore");
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        role="search"
        className="group flex items-center gap-2 rounded-[22px] border bg-card p-2 shadow-[var(--shadow-elevated)] transition focus-within:border-primary focus-within:shadow-[var(--shadow-hover)]"
      >
        <Search className="ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground transition group-focus-within:text-primary sm:block" />

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Поиск мест и компаний"
          placeholder={focused ? "Название, адрес или описание" : typed}
          className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-[color:var(--text-secondary)] sm:px-1 sm:text-lg"
        />

        <button type="submit" className="clarify-button-primary shrink-0">
          Найти
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      {popular.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">Популярное:</span>
          {popular.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${encodeURIComponent(c.slug)}`}
              className="clarify-chip min-h-9 px-3.5 text-[13px]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
