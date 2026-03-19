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
      "Да. Страница для бизнеса и логика кабинета рассчитаны на сценарий, где у компании несколько точек и важно держать их в одной системе без путаницы.",
  },
];

export default function BusinessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[36px] border border-[#9fd1ff] bg-[linear-gradient(135deg,#7cc2ff_0%,#61b0fb_45%,#5aa7f3_100%)] px-6 py-8 text-slate-950 shadow-[0_24px_80px_rgba(74,152,236,0.22)] md:px-8 md:py-10 lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#bfe3ff]/40 blur-2xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <Building2 className="h-3.5 w-3.5" />
              Clarify для компаний и филиалов
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Управляйте присутствием компании в Clarify официально
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/92 md:text-base">
              Подключайте бизнес к платформе, подтверждайте существующие
              карточки, отвечайте на отзывы и держите филиалы в одном кабинете.
              Clarify помогает компании выглядеть не просто найденной в
              каталоге, а действительно активной и официальной.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/business/signup"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-medium text-[#3d8fe5] shadow-[0_12px_30px_rgba(255,255,255,0.28)] transition hover:-translate-y-0.5 hover:bg-white/95"
              >
                Зарегистрировать компанию
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <Link
                href="/company"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
              >
                Уже есть кабинет
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <BadgeCheck className="h-3.5 w-3.5" />
                Официальные ответы компании
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Claim и подтверждение карточек
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <Store className="h-3.5 w-3.5" />
                Работа с филиалами
              </span>
            </div>
          </div>

          <BusinessShowcase />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[32px] border border-[#d7ebff] bg-[linear-gradient(180deg,#f7fbff_0%,#edf6ff_100%)] p-6 shadow-[0_16px_50px_rgba(124,194,255,0.12)] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe6ff] bg-white/80 px-3 py-1 text-xs font-medium text-[#3f90e5]">
            <Sparkles className="h-3.5 w-3.5" />
            Что получает бизнес
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Реальные инструменты под текущую логику Clarify
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Здесь нет лишних обещаний. Страница говорит только о том, что
            действительно укладывается в продуктовую логику платформы уже
            сейчас: бизнес-аккаунт, claim существующих карточек, филиалы и
            официальные ответы на отзывы.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] border border-[#d6eaff] bg-white/90 p-5 shadow-[0_10px_30px_rgba(126,190,255,0.10)]"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dff0ff_0%,#cde7ff_100%)] text-[#3f90e5]">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[32px] border border-[#c9e3ff] bg-[linear-gradient(180deg,#ecf6ff_0%,#dff0ff_100%)] p-6 shadow-[0_16px_50px_rgba(124,194,255,0.14)] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c5e0ff] bg-white/70 px-3 py-1 text-xs font-medium text-[#3f90e5]">
            <Waypoints className="h-3.5 w-3.5" />
            Когда Clarify особенно полезен
          </div>

          <div className="mt-5 grid gap-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-[#d5e9ff] bg-white/85 p-5"
              >
                <div className="text-sm font-semibold text-slate-950">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[32px] border border-[#d7ebff] bg-white p-6 shadow-[0_16px_50px_rgba(124,194,255,0.08)] md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Как компания начинает работу в Clarify
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Важно, чтобы на странице был не только красивый визуал, но и
            понятный сценарий. Поэтому здесь логика выстроена вокруг реального
            бизнес-потока: регистрация, связь с карточкой места и дальнейшая
            работа с отзывами и филиалами.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((item) => (
            <article
              key={item.step}
              className="relative overflow-hidden rounded-[28px] border border-[#dcecff] bg-[linear-gradient(180deg,#f8fcff_0%,#eef7ff_100%)] p-5"
            >
              <div
                aria-hidden
                className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#cfe8ff]/50 blur-2xl"
              />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6ab7ff_0%,#4e9df2_100%)] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(74,152,236,0.22)]">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <article className="rounded-[32px] border border-[#d7ebff] bg-[linear-gradient(180deg,#f8fcff_0%,#f1f8ff_100%)] p-6 shadow-[0_16px_50px_rgba(124,194,255,0.08)] md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Для каких бизнесов это особенно актуально
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Clarify особенно хорошо раскрывается там, где пользователи выбирают
            место, читают отзывы и сравнивают разные точки до принятия решения.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {industries.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-[#cfe5ff] bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-[#7dbfff] hover:text-slate-950"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-[#d8eaff] bg-white/90 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4594e8]" />
              <p className="text-sm leading-7 text-slate-600">
                Смысл страницы для бизнеса не только в регистрации. Она должна
                сразу объяснять, зачем компании присутствовать на платформе
                официально и как это помогает не терять доверие клиентов.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border border-[#c9e3ff] bg-[linear-gradient(180deg,#ecf6ff_0%,#e4f2ff_100%)] p-6 shadow-[0_16px_50px_rgba(124,194,255,0.12)] md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c5e0ff] bg-white/70 px-3 py-1 text-xs font-medium text-[#3f90e5]">
            <BadgeCheck className="h-3.5 w-3.5" />
            FAQ для бизнеса
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Часто задаваемые вопросы
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Этот блок полезен и для пользователя, и для SEO: он снимает
            возражения и добавляет на страницу нормальный индексируемый слой.
          </p>

          <div className="mt-6 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-[22px] border border-[#d7eaff] bg-white px-5 py-4"
              >
                <summary className="cursor-pointer list-none pr-8 text-sm font-medium text-slate-950">
                  <span className="relative block">
                    {item.question}
                    <span className="absolute right-0 top-0 text-slate-400 transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="pt-3 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-[36px] border border-[#9fd1ff] bg-[linear-gradient(135deg,#7cc2ff_0%,#61b0fb_45%,#5aa7f3_100%)] px-6 py-8 text-slate-950 shadow-[0_24px_80px_rgba(74,152,236,0.22)] md:px-8 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute hidden h-0 w-0"
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" />
              Для компаний, которые хотят выглядеть официально
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Подключите компанию к Clarify и работайте с репутацией публично
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/92 md:text-base">
              Создайте бизнес-аккаунт, свяжите компанию с карточками мест и
              отвечайте на отзывы от имени бизнеса в более понятном и
              официальном формате.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-medium text-[#3d8fe5] shadow-[0_12px_30px_rgba(255,255,255,0.28)] transition hover:-translate-y-0.5 hover:bg-white/95"
            >
              Начать регистрацию
            </Link>
            <Link
              href="/company"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
            >
              Уже есть кабинет
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}