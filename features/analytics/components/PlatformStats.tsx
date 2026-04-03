"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, MessageCircle, Users } from "lucide-react";

type Analytics = {
  totals: { places: number; reviews: number; users: number; companies: number };
};

type ApiError = {
  error?: string;
};

const nf = new Intl.NumberFormat("ru-RU");

export default function PlatformStats() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/analytics/overview", {
          signal: ctrl.signal,
        });

        const json = await safeJson<Analytics | ApiError>(res);

        if (!res.ok) {
          setData(null);
          const errorMessage =
            json && "error" in json && typeof json.error === "string"
              ? json.error
              : "Не удалось загрузить статистику";

          setErr(errorMessage);
          return;
        }

        setData((json ?? null) as Analytics | null);
      } catch {
        if (ctrl.signal.aborted) return;
        setData(null);
        setErr("Не удалось загрузить статистику");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const stats = data
    ? [
        {
          title: "Карточек",
          value: data.totals.places,
          icon: <MapPin className="h-5 w-5" />,
          desc: "Уже доступны для поиска",
        },
        {
          title: "Отзывов",
          value: data.totals.reviews,
          icon: <MessageCircle className="h-5 w-5" />,
          desc: "Помогают выбирать увереннее",
        },
        {
          title: "Пользователей",
          value: data.totals.users,
          icon: <Users className="h-5 w-5" />,
          desc: "Уже делятся опытом на Clarify",
        },
        {
          title: "Компаний",
          value: data.totals.companies,
          icon: <Building2 className="h-5 w-5" />,
          desc: "Уже работают с репутацией в Clarify",
        },
      ]
    : [];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        ref={sectionRef}
        className="clarify-soft-section px-6 py-8 md:px-10 md:py-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="clarify-badge w-fit">Платформа в цифрах</div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
            Статистика Clarify
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Платформа растёт вместе с пользователями и компаниями — каждое новое
            место и каждый отзыв делают выбор более понятным.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : data ? (
            stats.map((item, index) => (
              <StatCard
                key={item.title}
                title={item.title}
                value={item.value}
                icon={item.icon}
                desc={item.desc}
                visible={visible}
                delay={index * 90}
              />
            ))
          ) : (
            <div className="clarify-empty-state sm:col-span-2 lg:col-span-4">
              <div className="px-6 py-8 text-sm text-muted-foreground">
                Статистика временно недоступна{err ? `: ${err}` : "."}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  desc,
  icon,
  visible,
  delay,
}: {
  title: string;
  value: number;
  desc: string;
  icon: ReactNode;
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className={[
        "clarify-card p-5 md:p-6 transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground md:text-base">{title}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            <AnimatedNumber value={value} start={visible} />
          </div>
        </div>

        <div className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
        {desc}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, start }: { value: number; start: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    let frame = 0;
    let startTs: number | null = null;
    const duration = 1200;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const progress = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [start, value]);

  return <>{nf.format(displayValue)}</>;
}

function StatSkeleton() {
  return (
    <div className="clarify-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
          <div className="mt-3 h-10 w-28 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-[16px] bg-primary-soft/70" />
      </div>
      <div className="mt-4 h-4 w-44 animate-pulse rounded bg-muted/50" />
    </div>
  );
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}