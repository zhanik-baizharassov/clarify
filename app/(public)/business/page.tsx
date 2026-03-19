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
    title: "Официальный кабинет компании",
    description:
      "Компания получает отдельный бизнес-кабинет и работает с присутствием на платформе уже не как случайная карточка, а как подтверждённый участник системы.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Claim вместо создания дублей",
    description:
      "Если место уже есть в каталоге Clarify, логичнее подтвердить существующую карточку и взять её в управление, а не создавать новую копию.",
  },
  {
    icon: <MessageCircleReply className="h-5 w-5" />,
    title: "Официальные ответы на отзывы",
    description:
      "Бизнес может отвечать от имени компании и показывать клиентам, что обратная связь читается, обрабатывается и не остаётся без реакции.",
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Единая работа с филиалами",
    description:
      "Если у компании несколько точек, их можно держать в одном кабинете, сохраняя порядок в карточках, отзывах и логике каждого филиала.",
  },
];

const flowBlocks = [
  {
    icon: <Building2 className="h-4 w-4" />,
    title: "Auth flow",
    description:
      "Сначала компания создаёт бизнес-аккаунт и получает доступ к кабинету. Это отдельный вход для официальной работы на платформе.",
  },
  {
    icon: <FileCheck2 className="h-4 w-4" />,
    title: "Claim flow",
    description:
      "Если карточка уже присутствует в каталоге, компания подаёт заявку на подтверждение и связывает существующее место со своим кабинетом.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Admin / moderation flow",
    description:
      "Платформа проверяет сценарий подключения, чтобы каталог оставался аккуратным, а доступ к карточкам и филиалам получал именно тот бизнес, который имеет на это право.",
  },
];

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
      "Карточки, отзывы, claim-сценарии и права доступа выстраиваются в более чистую структуру, без дублей и лишней путаницы.",
  },
];

const useCases = [
  {
    title: "Когда карточка уже есть в каталоге",
    description:
      "В этом случае бизнесу не нужен лишний дубль. Более логичный путь — подтвердить существующую карточку и взять её в управление через claim.",
  },
  {
    title: "Когда у компании несколько филиалов",
    description:
      "У каждой точки свой контекст, свой поток отзывов и своя репутация. Поэтому Clarify помогает держать филиалы в одной системе, но не смешивать их между собой.",
  },
  {
    title: "Когда важно выглядеть официально для клиента",
    description:
      "Публичный ответ от имени компании воспринимается сильнее, чем молчание или случайный комментарий, и помогает укреплять доверие к бизнесу.",
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
      "Создавать её заново не нужно. Компания может пройти claim-сценарий, чтобы связать существующую карточку со своим кабинетом и получить управление после проверки.",
  },
  {
    question: "Зачем нужен этап проверки и модерации?",
    answer:
      "Он нужен для порядка внутри платформы: чтобы не плодить дубликаты, аккуратно связывать компании с карточками и не открывать доступ к управлению без проверки сценария.",
  },
  {
    question: "Можно ли отвечать на отзывы от имени бизнеса?",
    answer:
      "Да. После подключения компании и прохождения нужного сценария Clarify позволяет публиковать официальные ответы от имени бизнеса.",
  },
  {
    question: "Подходит ли Clarify для компаний с несколькими филиалами?",
    answer:
      "Да. Логика кабинета рассчитана на сценарий, где у компании несколько точек и важно держать их в одной системе без смешивания карточек и отзывов.",
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
              Clarify помогает бизнесу не просто появиться в каталоге, а
              выстроить понятное присутствие на платформе: войти в
              бизнес-кабинет, связать компанию с карточкой места, пройти нужную
              проверку и уже после этого работать с отзывами и филиалами в одном
              кабинете.
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
                Claim и проверка карточек
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
            Инструменты для аккуратной работы с карточками, филиалами и отзывами
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            На этой странице важно не перегружать бизнес десятком разрозненных
            обещаний. Суть Clarify проще: кабинет компании, понятный сценарий
            подтверждения карточек, официальный диалог с клиентами и единая
            логика работы с несколькими точками.
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
            Как проходит подключение
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Auth flow, claim flow и moderation flow без лишней путаницы
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Вместо хаотичного набора состояний страница должна объяснять бизнесу
            три вещи: как войти в кабинет, как связать компанию с карточкой и
            зачем платформа проверяет этот сценарий.
          </p>

          <div className="mt-6 grid gap-3">
            {flowBlocks.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border bg-background/85 p-5 backdrop-blur"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {item.icon}
                  </span>
                  {item.title}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
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
            Что компания делает после подключения
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Когда кабинет уже подключён и нужный сценарий пройден, Clarify
            становится рабочим инструментом: помогает отвечать на отзывы,
            поддерживать порядок в карточках и держать филиалы в одной системе.
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

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <article className="rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Для каких бизнесов это особенно актуально
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Clarify особенно полезен там, где клиент читает отзывы до выбора,
            сравнивает точки между собой и ожидает увидеть не просто карточку
            места, а признаки реального присутствия бизнеса на платформе.
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
                Для бизнеса важно не просто числиться в каталоге, а выглядеть
                официально и понятно для клиента: держать карточки в порядке,
                отвечать на отзывы и не смешивать разные филиалы в один общий
                поток.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border bg-gradient-to-b from-muted/55 via-background to-accent/25 p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1 text-xs font-medium text-primary">
            <BadgeCheck className="h-3.5 w-3.5" />
            Когда Clarify особенно полезен
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Типовые сценарии использования
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Этот блок продолжает основную мысль страницы и показывает, в каких
            реальных ситуациях бизнес быстрее всего понимает ценность кабинета
            компании и claim-сценария.
          </p>

          <div className="mt-6 space-y-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border bg-background px-5 py-4"
              >
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                <p className="pt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <article className="rounded-[32px] border bg-gradient-to-b from-muted/55 via-background to-accent/25 p-6 shadow-sm md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/75 px-3 py-1 text-xs font-medium text-primary">
            <BadgeCheck className="h-3.5 w-3.5" />
            FAQ для бизнеса
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Часто задаваемые вопросы
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Здесь собраны самые частые вопросы о регистрации компании, claim,
            модерации и работе с филиалами до старта в Clarify.
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

        <article className="rounded-[32px] border bg-card p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Коротко о логике страницы
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Этот лендинг должен объяснять бизнесу одну последовательную мысль:
            сначала компания входит в систему, затем связывает себя с карточкой,
            проходит нужную проверку и только после этого начинает официально
            работать с отзывами и филиалами.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border bg-muted/25 p-5">
              <div className="text-sm font-semibold text-foreground">
                Почему это лучше для восприятия
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Когда на странице слишком много мелких интерактивных форм, смысл
                распадается. Когда блоки связаны логически, бизнес быстрее
                понимает, что именно он получает и зачем нужен каждый этап.
              </p>
            </div>

            <div className="rounded-[24px] border bg-muted/25 p-5">
              <div className="text-sm font-semibold text-foreground">
                Что важно сохранить дальше
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Спокойную подачу, меньше лишней кликабельности, меньше повторов и
                больше последовательности: кабинет → claim → проверка → отзывы и
                филиалы.
              </p>
            </div>
          </div>
        </article>
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
              Создайте бизнес-аккаунт, пройдите нужный сценарий подключения,
              свяжите компанию с карточками мест и начните официально работать с
              отзывами и филиалами без лишней путаницы.
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