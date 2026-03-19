import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  FileCheck2,
  MessageCircleReply,
  ShieldCheck,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Для бизнеса",
  description:
    "Clarify для бизнеса: регистрируйте компанию, управляйте карточками и филиалами, отвечайте на отзывы и работайте с репутацией в Казахстане.",
  alternates: {
    canonical: "/business",
  },
  openGraph: {
    title: "Для бизнеса — Clarify",
    description:
      "Регистрация компании, управление карточками и филиалами, официальные ответы на отзывы и развитие репутации бизнеса в Clarify.",
    url: "/business",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary",
    title: "Для бизнеса — Clarify",
    description:
      "Регистрация компании, управление карточками и филиалами, официальные ответы на отзывы и развитие репутации бизнеса в Clarify.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const benefits = [
  {
    icon: <MessageCircleReply className="h-5 w-5" />,
    title: "Официальные ответы на отзывы",
    description:
      "Компания может отвечать на отзывы от имени бизнеса и выстраивать прозрачную коммуникацию с клиентами.",
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Управление филиалами",
    description:
      "Добавляйте филиалы, отслеживайте отзывы по точкам и работайте с карточками мест из одного кабинета.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Claim и подтверждение карточек",
    description:
      "Если карточка вашего бизнеса уже есть в каталоге, можно подать заявку на получение управления.",
  },
];

const steps = [
  {
    step: "01",
    title: "Создайте бизнес-аккаунт",
    description:
      "Зарегистрируйте компанию, чтобы получить доступ к бизнес-функциям платформы.",
  },
  {
    step: "02",
    title: "Подтвердите карточку или добавьте филиал",
    description:
      "Подайте заявку на существующую карточку в каталоге или создайте новую карточку филиала через кабинет.",
  },
  {
    step: "03",
    title: "Работайте с отзывами",
    description:
      "Отвечайте на отзывы пользователей, повышайте доверие и следите за репутацией бизнеса.",
  },
];

const features = [
  "Официальный статус ответа компании на отзывы",
  "Управление филиалами из одного кабинета",
  "Claim-заявки на карточки бизнеса из каталога",
  "Просмотр отзывов по филиалам",
  "Раздел бизнес-аналитики как будущая точка роста",
  "Прозрачная модерация и правила платформы",
];

export default function BusinessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Решение для компаний и филиалов
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Clarify для бизнеса
          </h1>

          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
            Подключайте компанию к Clarify, управляйте карточками мест,
            добавляйте филиалы и отвечайте на отзывы пользователей официально.
            Это помогает укреплять доверие, улучшать коммуникацию с клиентами и
            работать с репутацией бизнеса в одном кабинете.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Зарегистрировать компанию
            </Link>

            <Link
              href="/company"
              className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/30"
            >
              Открыть кабинет компании
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Официальные ответы компании
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Платформа с модерацией
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <Store className="h-3.5 w-3.5 text-primary" />
              Работа с филиалами
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {benefits.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border bg-background p-5"
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/20 text-primary">
              {item.icon}
            </div>

            <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border bg-background p-6 md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Как это работает
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Логика проста: сначала компания получает доступ к бизнес-аккаунту,
            затем подтверждает свои карточки или создаёт филиалы, после чего
            может официально работать с отзывами на платформе.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {steps.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl border bg-muted/10 p-5"
            >
              <div className="text-sm font-semibold text-primary">
                Шаг {item.step}
              </div>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border bg-background p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Что получает бизнес в Clarify
          </h2>

          <div className="mt-5 grid gap-3">
            {features.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border bg-muted/10 p-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
                <div className="text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border bg-muted/20 p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Важный принцип платформы
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              Clarify разделяет публичную часть платформы и рабочие кабинеты.
              Публичная страница <span className="font-medium text-foreground">/business</span>{" "}
              объясняет возможности для компаний, а регистрация и рабочие
              действия происходят уже в защищённых маршрутах.
            </p>

            <p>
              Это помогает сохранить понятную структуру продукта: пользователи и
              поисковые системы видят отдельную страницу для бизнеса, а сама
              регистрация компании и кабинет остаются транзакционными,
              служебными зонами.
            </p>

            <p>
              Уже есть бизнес-аккаунт? Тогда используйте кабинет компании для
              работы с филиалами, claim-заявками и ответами на отзывы.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Начать регистрацию
            </Link>

            <Link
              href="/company"
              className="inline-flex h-11 items-center rounded-xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/30"
            >
              Кабинет компании
            </Link>
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-3xl border bg-background p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              Подключите компанию к Clarify
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Создайте бизнес-аккаунт, чтобы официально представлять компанию на
              платформе, управлять карточками мест и выстраивать доверительную
              коммуникацию с клиентами.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Зарегистрировать компанию
            </Link>

            <Link
              href="/company"
              className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/30"
            >
              Перейти в кабинет
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}