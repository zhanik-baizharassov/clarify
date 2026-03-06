"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, MessageCircle, Users } from "lucide-react";

type Analytics = {
  totals: { places: number; reviews: number; users: number; companies: number };
};

const nf = new Intl.NumberFormat("ru-RU");

export default function PlatformStats() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch("/api/analytics/overview", {
          cache: "no-store",
          signal: ctrl.signal,
        });

        const json = await safeJson(res);

        if (!res.ok) {
          setData(null);
          setErr((json as any)?.error ?? "Не удалось загрузить статистику");
          return;
        }

        setData(json as Analytics);
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

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div className="grid gap-2 md:grid-cols-3 md:items-end">
          {/* левый “пустой” слот (если не нужен — оставляем пустым) */}
          <div />

          {/* центр */}
          <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">
            Статистика Clarify
          </h2>

          {/* правый слот под действия (пока пустой) */}
          <div className="flex justify-end" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : data ? (
            <>
              <StatCard
                title="Карточек"
                value={data.totals.places}
                icon={<MapPin className="h-5 w-5" />}
                desc="Мест в каталоге"
              />
              <StatCard
                title="Отзывов"
                value={data.totals.reviews}
                icon={<MessageCircle className="h-5 w-5" />}
                desc="Опубликованные отзывы"
              />
              <StatCard
                title="Пользователей"
                value={data.totals.users}
                icon={<Users className="h-5 w-5" />}
                desc="Cтолько пользователей уже с Clarify"
              />
              <StatCard
                title="Компаний"
                value={data.totals.companies}
                icon={<Building2 className="h-5 w-5" />}
                desc="Столько компаний уже пользуются Clarify"
              />
            </>
          ) : (
            <div className="rounded-2xl border bg-background p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
              Статистика временно недоступна{err ? `: ${err}` : "."}
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
}: {
  title: string;
  value: number;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground md:text-base">
            {title}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {nf.format(value)}
          </div>
        </div>

        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/30 text-muted-foreground">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground md:text-base">
        {desc}
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border bg-background p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
          <div className="mt-3 h-10 w-28 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-muted/40" />
      </div>
      <div className="mt-4 h-4 w-44 animate-pulse rounded bg-muted/50" />
    </div>
  );
}

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
