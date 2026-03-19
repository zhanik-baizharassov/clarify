import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  LayoutDashboard,
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

const journey = [
  {
    title: "Создайте бизнес-аккаунт",
    description:
      "Компания получает доступ к отдельному кабинету и стартовым инструментам для работы с присутствием на платформе.",
  },
  {
    title: "Подтвердите связь с бизнесом",
    description:
      "Можно заявить права на существующую карточку или добавить новый филиал, если бизнеса ещё нет в каталоге.",
  },
  {
    title: "Управляйте репутацией публично",
    description:
      "После подтверждения компания отвечает на отзывы официально и держит карточки точек в аккуратном состоянии.",
  },
];

const industries = [
  "Рестораны и кафе",
  "Салоны и бьюти",
  "Клиники и медцентры",
  "Магазины и шоурумы",
  "Сервисы и услуги",
  "Отели и гостевые объекты",
];

const faqs = [
  {
    question: "Кто может зарегистрировать компанию в Clarify?",
    answer:
      "Регистрацию проходит представитель бизнеса, который планирует работать с карточкой компании, филиалами и отзывами от имени бренда.",
  },
  {
    question: "Что даёт подтверждение карточки?",
    answer:
      "Подтверждение связывает компанию с её карточкой на платформе и открывает официальный формат управления: ответы на отзывы, работа с филиалами и дальнейшее развитие бизнес-кабинета.",
  },
  {
    question: "Можно ли работать с несколькими филиалами?",
    answer:
      "Да. Страница для бизнеса изначально объясняет сценарий работы с несколькими точками, чтобы компания не смешивала отзывы и управление разными филиалами.",
  },
  {
    question: "Если карточка уже есть в каталоге, нужно создавать её заново?",
    answer:
      "Нет. В таком случае логичнее подать заявку на подтверждение существующей карточки, а не дублировать её заново.",
  },
];

export default function BusinessPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border bg-gradient-to-br from-background via-background to-primary/[0.06] px-6 py-8 shadow-sm md:px-8 md:py-10 lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Clarify для компаний и филиалов
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance md:text-5xl">
              Не просто присутствуйте в каталоге —
              <span className="text-primary"> управляйте репутацией бизнеса</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
              Clarify помогает компаниям официально работать с карточками мест,
              филиалами и отзывами. Страница для бизнеса должна не просто вести
              на регистрацию, а сразу показывать, зачем бизнесу быть активным на
              платформе и как это выглядит на практике.
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
                className="inline-flex h-12 items-center justify-center rounded-2xl border bg-background/80 px-5 text-sm font-medium transition hover:bg-muted/50"
              >
                Перейти в кабинет
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Официальные ответы компании
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Подтверждение связи с бизнесом
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
                <Store className="h-3.5 w-3.5 text-primary" />
                Управление филиалами
              </span>
            </div>
          </div>

          <BusinessShowcase />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="relative overflow-hidden rounded-[28px] border bg-background p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs text-primary">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Единый ритм работы
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              Бизнесу нужен не просто профиль, а понятный центр управления
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              В обычных лендингах всё заканчивается кнопкой “зарегистрироваться”.
              Здесь логика другая: компания должна сразу понимать, как выглядит
              её путь внутри платформы — от карточки места до официального
              ответа на отзыв.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageCircleReply className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Ответы выглядят официально
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Компания может реагировать публично и показывать, что
                      действительно присутствует на платформе, а не просто
                      числится в каталоге.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Waypoints className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Филиалы не смешиваются
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Когда у бизнеса несколько точек, важно разделять отзывы,
                      статус карточек и дальнейшую работу по каждому филиалу.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">
                      Claim-flow без хаоса и дублей
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Если карточка уже есть в каталоге, компания не создаёт её
                      заново. Вместо этого она подаёт заявку на подтверждение и
                      получает более чистый и логичный сценарий входа в систему.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside className="rounded-[28px] border bg-gradient-to-br from-primary/[0.08] via-background to-background p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Почему это выглядит сильнее
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Меньше “типового SaaS”, больше ощущения настоящего продукта
          </h2>

          <div className="mt-5 space-y-3">
            {[
              "Разный ритм блоков вместо одинаковых карточек по сетке.",
              "Один живой интерактивный блок, который можно реально переключать.",
              "Сильный hero с пользой, а не просто заголовком и кнопкой.",
              "FAQ остаётся индексируемым и полезным для SEO.",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border bg-background/80 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-[28px] border bg-background px-6 py-8 md:px-8 md:py-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Как компания входит в Clarify
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Здесь лучше работает не набор отдельных карточек, а более цельный
            сценарий. Пользователь должен видеть путь компании последовательно,
            почти как мини-product flow.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {journey.map((item, index) => (
            <article
              key={item.title}
              className="grid gap-4 rounded-3xl border bg-muted/[0.14] p-4 md:grid-cols-[72px_1fr] md:p-5"
            >
              <div className="flex md:block">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                  {String(index + 1).padStart(2, "0")}
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[28px] border bg-background p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Где Clarify особенно полезен
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Страница должна говорить не только “что у нас есть”, но и “для кого
            это особенно полезно”. Это сразу делает коммуникацию ближе к
            реальному бизнесу.
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
        </article>

        <article className="rounded-[28px] border bg-muted/[0.18] p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Часто задаваемые вопросы
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            FAQ здесь не просто декоративный. Он помогает снять возражения,
            добавляет индексируемый текст и делает страницу полезнее ещё до
            регистрации.
          </p>

          <div className="mt-6 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border bg-background px-5 py-4"
              >
                <summary className="cursor-pointer list-none pr-8 text-sm font-medium">
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

      <section className="mt-6 overflow-hidden rounded-[32px] border bg-gradient-to-br from-primary to-primary/80 px-6 py-8 text-primary-foreground md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
              <BadgeCheck className="h-3.5 w-3.5" />
              Для компаний, которые хотят выглядеть официально
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Подключите бизнес к Clarify и работайте с репутацией публично
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/80 md:text-base">
              Этот экран уже можно делать основой для сильной `/business`
              страницы: с SEO-нормой, живым визуалом и более дорогим ощущением,
              чем просто набор одинаковых блоков.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-medium text-primary transition hover:-translate-y-0.5 hover:bg-white/95"
            >
              Начать регистрацию
            </Link>
            <Link
              href="/company"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Уже есть кабинет
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}