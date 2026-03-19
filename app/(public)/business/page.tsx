import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ShieldCheck,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Для бизнеса",
  description:
    "Clarify для бизнеса: официальный профиль компании, управление филиалами, ответы на отзывы и подтверждение карточек мест в Казахстане.",
  alternates: {
    canonical: "/business",
  },
  openGraph: {
    title: "Для бизнеса — Clarify",
    description:
      "Официальный профиль компании, ответы на отзывы, управление филиалами и подтверждение карточек мест на Clarify.",
    url: "/business",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary",
    title: "Для бизнеса — Clarify",
    description:
      "Официальный профиль компании, ответы на отзывы, управление филиалами и подтверждение карточек мест на Clarify.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const nextSteps = [
  {
    step: "01",
    title: "Работайте с отзывами официально",
    description:
      "После подключения компания может отвечать от имени бизнеса, а для пользователя это выглядит как более понятный и официальный диалог.",
  },
  {
    step: "02",
    title: "Держите филиалы в одном кабинете",
    description:
      "Когда у бизнеса несколько точек, Clarify помогает собрать их в одной системе и не смешивать отзывы и карточки разных филиалов.",
  },
  {
    step: "03",
    title: "Поддерживайте порядок в присутствии",
    description:
      "Карточки, отзывы, сценарии подтверждения и права доступа выстраиваются в более чистую структуру, без дублей и лишней путаницы.",
  },
];

export default function BusinessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[36px] border bg-gradient-to-br from-accent/70 via-background to-secondary/45 px-6 py-8 shadow-sm md:px-8 md:py-10 lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-accent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-secondary/70 blur-2xl"
        />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Clarify для компаний и филиалов
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Управляйте присутствием компании в Clarify официально
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Clarify помогает бизнесу выстроить понятное присутствие на
            платформе: подключить компанию, связать её с карточками мест и
            работать с отзывами и филиалами в одном кабинете.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
            >
              Зарегистрировать компанию
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <Link
              href="/company"
              className="inline-flex h-12 items-center justify-center rounded-2xl border bg-background/80 px-5 text-sm font-medium text-foreground backdrop-blur transition hover:bg-background"
            >
              Уже есть кабинет
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Официальные ответы компании
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Подтверждение карточек
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 backdrop-blur">
              <Store className="h-3.5 w-3.5 text-primary" />
              Работа с филиалами
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Что компания делает после подключения
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Когда кабинет уже подключён, Clarify становится рабочим
            инструментом: помогает отвечать на отзывы, поддерживать порядок в
            карточках и держать филиалы в одной системе.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {nextSteps.map((item) => (
            <article
              key={item.step}
              className="relative overflow-hidden rounded-[28px] border bg-gradient-to-b from-accent/30 to-background p-5"
            >
              <div
                aria-hidden
                className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
              />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-primary/10 text-sm font-semibold text-primary">
                  {item.step}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mt-6 overflow-hidden rounded-[36px] border bg-gradient-to-br from-primary/10 via-accent/40 to-secondary/40 px-6 py-8 shadow-sm md:px-8 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-10 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-secondary/60 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Для компаний, которые хотят выглядеть официально
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Подключите компанию к Clarify и выстройте понятное присутствие на
              платформе
            </h2>

            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Создайте бизнес-аккаунт, пройдите сценарий подключения и начните
              официально работать с отзывами и филиалами без лишней путаницы.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
            >
              Начать регистрацию
            </Link>

            <Link
              href="/company"
              className="inline-flex h-12 items-center justify-center rounded-2xl border bg-background/80 px-5 text-sm font-medium text-foreground backdrop-blur transition hover:bg-background"
            >
              Уже есть кабинет
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}