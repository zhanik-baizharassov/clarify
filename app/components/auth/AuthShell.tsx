"use client";

import Link from "next/link";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthShell({
  title,
  subtitle,
  children,
  bottomHint,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bottomHint?: React.ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-muted/50 via-background to-background">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-2 md:items-start">
        {/* Левая витрина */}
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <span className="font-medium">KZ</span>
              <span>Отзывы по Казахстану</span>
            </div>

            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
              Нам важно ваше мнение
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              Настоящие отзывы разных мест только от пользователей. Фильтры по городам Казахстана и категориям.
            </p>

            <div className="mt-6 grid gap-3">
              <Feature
                icon={<MapPin className="h-4 w-4" />}
                title="Только Казахстан"
                text="Города — только из списка KZ"
              />
              <Feature
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Модерация"
                text="Проверка слов и данных на сервере"
              />
              <Feature
                icon={<Sparkles className="h-4 w-4" />}
                title="Удобно"
                text="Быстрый поиск, сортировка и категории"
              />
            </div>

            <div className="mt-8 rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">Совет</div>
              <div className="mt-1">
                Если что-то не проходит валидацию — ошибка скажет, что именно исправить.
              </div>
            </div>
          </div>
        </aside>

        {/* Правая карточка */}
        <section className="rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>

            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              На главную
            </Link>
          </div>

          <div className="mt-6">{children}</div>

          {bottomHint ? (
            <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">{bottomHint}</div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4">
      <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/40">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}