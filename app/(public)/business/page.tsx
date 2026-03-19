import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  MessageCircleReply,
  ShieldCheck,
  Sparkles,
  Store,
  Waypoints,
} from "lucide-react";
import BusinessShowcase from "@/features/business/components/BusinessShowcase";

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

const capabilities = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Официальный профиль компании",
    description:
      "Бизнес получает отдельный кабинет и работает с публичным присутствием на платформе в более официальном формате.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Подтверждение существующих карточек",
    description:
      "Если место уже есть в каталоге Clarify, компания может подать claim-заявку и получить управление после проверки.",
  },
  {
    icon: <MessageCircleReply className="h-5 w-5" />,
    title: "Ответы на отзывы от имени бизнеса",
    description:
      "Компания может официально отвечать на отзывы и показывать клиентам, что она действительно вовлечена в обратную связь.",
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Работа с филиалами",
    description:
      "Когда у бизнеса несколько точек, карточки и отзывы можно держать в одном кабинете, не смешивая филиалы между собой.",
  },
];

const steps = [
  {
    step: "01",
    title: "Создайте бизнес-аккаунт",
    description:
      "После регистрации компания получает доступ к кабинету и базовому бизнес-потоку внутри Clarify.",
  },
  {
    step: "02",
    title: "Свяжите компанию с карточкой места",
    description:
      "Если карточка уже есть в каталоге — подайте claim-заявку. Если точки ещё нет, начните работу через кабинет компании.",
  },
  {
    step: "03",
    title: "Работайте с филиалами и отзывами",
    description:
      "После подтверждения бизнес может официально отвечать на отзывы и поддерживать более аккуратное присутствие на платформе.",
  },
];

const useCases = [
  {
    title: "Когда карточка уже есть в каталоге",
    description:
      "Clarify не заставляет бизнес создавать дубликаты. Логичнее подтвердить существующую карточку и взять её в управление.",
  },
  {
    title: "Когда у бизнеса несколько филиалов",
    description:
      "У каждой точки свой контекст, свои отзывы и своя репутация. Поэтому важно не смешивать филиалы внутри одного общего потока.",
  },
  {
    title: "Когда важно отвечать клиентам официально",
    description:
      "Публичный ответ от имени компании выглядит сильнее, чем полное молчание, и помогает укреплять доверие к бизнесу.",
  },
];

const industries = [
  "Рестораны и кафе",
  "Клиники и медцентры",
  "Салоны и бьюти",
  "Магазины и шоурумы",
  "Сервисы и услуги",
  "Отели и гостевые объекты",
];

const faqs = [
  {
    question: "Кто может зарегистрировать компанию в Clarify?",
    answer:
      "Регистрацию проходит представитель бизнеса, который планирует работать с карточкой компании, филиалами и отзывами на платформе.",
  },
  {
    question: "Что делать, если карточка места уже есть в каталоге?",
    answer:
      "В таком случае не нужно создавать её заново. Компания может подать claim-заявку на существующую карточку и получить управление после проверки.",
  },
  {
    question: "Можно ли отвечать на отзывы от имени бизнеса?",
    answer:
      "Да. После подключения бизнес-аккаунта и прохождения нужного сценария компания может официально отвечать на отзывы на платформе.",
  },
  {
    question: "Подходит ли Clarify для бизнеса с несколькими филиалами?",
    answer:
      "Да. Логика кабинета рассчитана на сценарий, где у компании несколько точек и важно держать их в одной системе без путаницы.",
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

        <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Clarify для компаний и филиалов
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Управляйте присутствием компании в Clarify официально
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              Подключайте бизнес к платформе, подтверждайте существующие
              карточки, отвечайте на отзывы и держите филиалы в одном кабинете.
              Clarify помогает компании выглядеть не просто найденной в
              каталоге, а действительно активной и официальной.
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
                Claim и подтверждение карточек
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 backdrop-blur">
                <Store className="h-3.5 w-3.5 text-primary" />
                Работа с филиалами
              </span>
            </div>
          </div>

          <BusinessShowcase />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/55 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Что получает бизнес
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Инструменты для работы с карточками, филиалами и отзывами
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Бизнес-страница Clarify создана для компаний, которые хотят
            присутствовать на платформе официально, работать с отзывами
            публично и аккуратно управлять своими точками.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border bg-muted/30 p-5"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[32px] border bg-gradient-to-b from-accent/40 via-background to-secondary/35 p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1 text-xs font-medium text-primary">
            <Waypoints className="h-3.5 w-3.5" />
            Когда Clarify особенно полезен
          </div>

          <div className="mt-5 grid gap-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border bg-background/85 p-5 backdrop-blur"
              >
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Как компания начинает работу в Clarify
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Сценарий простой: компания создаёт бизнес-аккаунт, связывает себя с
            карточкой места и после этого переходит к работе с отзывами и
            филиалами в одном кабинете.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((item) => (
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

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <article className="rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Для каких бизнесов это особенно актуально
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Clarify особенно хорошо раскрывается там, где пользователи выбирают
            место, читают отзывы и сравнивают разные точки до принятия решения.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {industries.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border bg-muted/20 px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border bg-secondary/35 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-7 text-muted-foreground">
                Для бизнеса важно не просто быть в каталоге, а выглядеть
                официально и понятно для клиента: отвечать на отзывы, держать
                карточки в порядке и не смешивать разные точки в один поток.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border bg-gradient-to-b from-muted/55 via-background to-accent/25 p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1 text-xs font-medium text-primary">
            <BadgeCheck className="h-3.5 w-3.5" />
            FAQ для бизнеса
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Часто задаваемые вопросы
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Этот блок помогает быстрее понять бизнес-сценарий Clarify и закрывает
            самые частые вопросы до регистрации.
          </p>

          <div className="mt-6 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-[22px] border bg-background px-5 py-4"
              >
                <summary className="cursor-pointer list-none pr-8 text-sm font-medium text-foreground">
                  <span className="relative block">
                    {item.question}
                    <span className="absolute right-0 top-0 text-muted-foreground transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="pt-3 text-sm leading-7 text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-[36px] border bg-gradient-to-br from-primary/10 via-accent/40 to-secondary/40 px-6 py-8 shadow-sm md:px-8 md:py-10">
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
              Подключите компанию к Clarify и работайте с репутацией публично
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              Создайте бизнес-аккаунт, свяжите компанию с карточками мест и
              отвечайте на отзывы от имени бизнеса в более понятном и
              официальном формате.
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