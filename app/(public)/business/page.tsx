import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  FileCheck2,
  MessageCircleReply,
  ShieldCheck,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Для бизнеса",
  description:
    "Clarify для бизнеса: официальный профиль компании, управление филиалами, ответы на отзывы и работа с карточками мест в Казахстане.",
  alternates: {
    canonical: "/business",
  },
  openGraph: {
    title: "Для бизнеса — Clarify",
    description:
      "Официальный профиль компании, ответы на отзывы, управление филиалами и работа с карточками мест на Clarify.",
    url: "/business",
    type: "website",
    locale: "ru_RU",
    siteName: "Clarify",
  },
  twitter: {
    card: "summary",
    title: "Для бизнеса — Clarify",
    description:
      "Официальный профиль компании, ответы на отзывы, управление филиалами и работа с карточками мест на Clarify.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const valueCards = [
  {
    icon: <MessageCircleReply className="h-5 w-5" />,
    title: "Официальные ответы компании",
    description:
      "Отвечайте на отзывы от имени бизнеса и поддерживайте открытую коммуникацию с клиентами прямо в карточке места.",
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Управление филиалами",
    description:
      "Работайте с несколькими точками из одного кабинета и отслеживайте отзывы по каждому филиалу отдельно.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Подтверждение карточек",
    description:
      "Если карточка бизнеса уже есть в каталоге, компания может подать заявку и получить управление после проверки.",
  },
];

const steps = [
  {
    step: "01",
    title: "Создайте бизнес-аккаунт",
    description:
      "После регистрации компания получает доступ к кабинету и инструментам для работы с публичными карточками.",
  },
  {
    step: "02",
    title: "Свяжите бизнес с карточками",
    description:
      "Подтвердите существующую карточку из каталога или добавьте новый филиал через кабинет компании.",
  },
  {
    step: "03",
    title: "Работайте с отзывами",
    description:
      "Просматривайте отзывы пользователей, отвечайте официально и поддерживайте актуальное присутствие бизнеса на платформе.",
  },
];

const featureList = [
  "Официальный профиль компании на платформе",
  "Ответы на отзывы от имени бизнеса",
  "Работа с филиалами из одного кабинета",
  "Claim-заявки на существующие карточки",
  "Просмотр отзывов по конкретным точкам",
  "Основа для будущей бизнес-аналитики",
];

const useCases = [
  {
    title: "Если у бизнеса несколько филиалов",
    description:
      "Clarify помогает держать карточки точек в одном месте и не смешивать отзывы разных филиалов.",
  },
  {
    title: "Если важно отвечать клиентам официально",
    description:
      "Компания может показывать, что она действительно присутствует на платформе и реагирует на обратную связь.",
  },
  {
    title: "Если карточка уже есть в каталоге",
    description:
      "Не нужно создавать всё заново — можно подать заявку на подтверждение и получить управление существующей карточкой.",
  },
];

export default function BusinessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Clarify для компаний и филиалов
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Представляйте бизнес официально в Clarify
          </h1>

          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
            Clarify помогает компании не просто присутствовать на платформе, а
            полноценно работать с карточками мест, филиалами и отзывами. Это
            удобный способ держать информацию о бизнесе в порядке и быть ближе к
            клиентам.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Зарегистрировать компанию
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Официальные ответы компании
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Верифицированный бизнес-поток
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
              <Store className="h-3.5 w-3.5 text-primary" />
              Работа с филиалами
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {valueCards.map((item) => (
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
            Как компания начинает работу
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Логика простая: сначала бизнес получает доступ к кабинету, затем
            связывает с собой карточки мест, а после этого уже может официально
            работать с отзывами пользователей.
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border bg-background p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Что получает бизнес
          </h2>

          <div className="mt-5 grid gap-3">
            {featureList.map((item) => (
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
            Когда Clarify особенно полезен
          </h2>

          <div className="mt-5 grid gap-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border bg-background/70 p-4"
              >
                <div className="text-sm font-medium">{item.title}</div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-3xl border bg-background p-6 md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Подключите компанию к Clarify
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Создайте бизнес-аккаунт, чтобы получить доступ к кабинету компании и
            работать с карточками мест и отзывами в более официальном формате.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/business/signup"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Начать регистрацию
          </Link>

          <Link
            href="/company"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Уже есть бизнес-аккаунт? Перейти в кабинет
          </Link>
        </div>
      </section>
    </main>
  );
}