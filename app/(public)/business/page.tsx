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
      <section className="clarify-hero relative overflow-hidden px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-48 w-48 rounded-full bg-warm-accent/70 blur-3xl"
        />

        <div className="relative max-w-3xl">
          <div className="clarify-badge-premium w-fit">
            <Building2 className="h-3.5 w-3.5" />
            Clarify для бизнеса
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.08]">
            Управляйте присутствием компании в Clarify официально
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Clarify помогает бизнесу выстроить понятное присутствие на
            платформе: подключить компанию, связать её с карточками мест и
            работать с отзывами и филиалами в одном кабинете.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/business/signup" className="clarify-button-primary">
              Зарегистрировать компанию
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link href="/company" className="clarify-button-secondary">
              Уже есть кабинет
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <TrustPill premium icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              Официальные ответы компаний
            </TrustPill>
            <TrustPill icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Подтвержденное присутствие бизнеса
            </TrustPill>
            <TrustPill icon={<Store className="h-3.5 w-3.5" />}>
              Работа с филиалами
            </TrustPill>
          </div>
        </div>
      </section>

      <section className="clarify-section mt-6 px-6 py-8 md:px-8 md:py-10">
        <div className="max-w-2xl">
          <div className="clarify-badge w-fit">Подключение бизнеса</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
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
            <article key={item.step} className="clarify-card p-5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-sm font-semibold text-primary">
                {item.step}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="clarify-focus-section relative mt-6 overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-8 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-warm-accent/70 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="clarify-badge-premium w-fit">
              <BadgeCheck className="h-3.5 w-3.5" />
              Для официального присутствия бизнеса
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
            <Link href="/business/signup" className="clarify-button-primary">
              Начать регистрацию
            </Link>

            <Link href="/company" className="clarify-button-secondary">
              Уже есть кабинет
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustPill({
  children,
  icon,
  premium,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  premium?: boolean;
}) {
  return (
    <span className={premium ? "clarify-badge-premium" : "clarify-badge"}>
      {icon}
      {children}
    </span>
  );
}