import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import PlatformStats from "@/features/analytics/components/PlatformStats";
import Reveal from "@/components/ui/Reveal";
import StarRating from "@/components/ui/StarRating";
import { categoryIcon } from "./category-icons";
import { HeroSearch, RotatingWord } from "./LandingClient";

type LandingCategory = { name: string; slug: string };

type LandingHomeProps = {
  isAuthed?: boolean;
  role?: "USER" | "COMPANY" | "ADMIN" | null;
  /** Active categories for the scrolling strip. */
  categories?: LandingCategory[];
  /** Most used categories, shown as quick links under the search. */
  popularCategories?: LandingCategory[];
};

export default function LandingHome({
  isAuthed,
  role,
  categories = [],
  popularCategories = [],
}: LandingHomeProps) {
  const isCompany = role === "COMPANY";

  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------ HERO */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pt-16 lg:px-8">
        <div
          aria-hidden
          className="anim-blob pointer-events-none absolute -left-24 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[110px]"
        />
        <div
          aria-hidden
          className="anim-blob pointer-events-none absolute -right-20 top-24 -z-10 h-[360px] w-[360px] rounded-full bg-[#ec4899]/15 blur-[110px] [animation-delay:-6s]"
        />

        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div
              className="anim-rise clarify-badge w-fit"
              style={{ "--d": "0ms" } as React.CSSProperties}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-text opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-text" />
              </span>
              Отзывы и репутация по Казахстану
            </div>

            <h1
              aria-label="Узнайте всё о месте до визита"
              className="anim-rise mt-6 text-[2.15rem] font-semibold leading-[1.1] sm:text-5xl lg:text-[3.4rem]"
              style={{ "--d": "100ms" } as React.CSSProperties}
            >
              <span aria-hidden>Узнайте всё о</span>
              <RotatingWord />
              <span aria-hidden>до визита</span>
            </h1>

            <p
              className="anim-rise mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-lg"
              style={{ "--d": "220ms" } as React.CSSProperties}
            >
              Реальные отзывы людей, рейтинг и ответы компаний. Находите места
              по опыту других, а бизнес — собирает обратную связь и отвечает
              открыто.
            </p>

            <div
              className="anim-rise mt-8 max-w-2xl"
              style={{ "--d": "340ms" } as React.CSSProperties}
            >
              <HeroSearch popular={popularCategories} />
            </div>

            <div
              className="anim-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
              style={{ "--d": "460ms" } as React.CSSProperties}
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success-text" />
                Отзывы только с подтверждённой почтой
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Официальные ответы компаний
              </span>
              {!isAuthed ? (
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  Создать аккаунт
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* -------------------------------------------------------- MARQUEE */}
      {categories.length > 0 ? (
        <section
          aria-label="Категории мест"
          className="marquee-pause relative mt-6 overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
        >
          <div
            className="marquee"
            style={
              {
                "--marquee-duration": `${Math.max(30, categories.length * 3)}s`,
              } as React.CSSProperties
            }
          >
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center gap-3 pr-3"
              >
                {categories.map(({ name, slug }) => {
                  const Icon = categoryIcon(slug);
                  return (
                    <li key={slug}>
                      <Link
                        href={`/explore?category=${encodeURIComponent(slug)}`}
                        tabIndex={copy === 1 ? -1 : undefined}
                        className="clarify-chip h-11"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* --------------------------------------------------------- STATS */}
        <Reveal className="-mx-4 mt-14 sm:-mx-6 lg:-mx-8">
          <PlatformStats />
        </Reveal>

        {/* ------------------------------------------------------ HOW IT WORKS */}
        <section id="how" className="mt-24 scroll-mt-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="clarify-badge mx-auto w-fit">Как это работает</div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-4xl">
              Три шага к выбору без сюрпризов
            </h2>
          </Reveal>

          <div className="relative mt-12 grid gap-5 md:grid-cols-3">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-px border-t-2 border-dashed border-primary/25 md:block"
            />

            <Step
              n="01"
              delay={0}
              icon={<Search className="h-5 w-5" />}
              title="Находите"
              desc="Откройте каталог, отфильтруйте по городу и категории и сравните места по рейтингу."
            />
            <Step
              n="02"
              delay={120}
              icon={<Star className="h-5 w-5" />}
              title="Делитесь опытом"
              desc="Оцените место и расскажите, что понравилось, а что нет. Достаточно пары предложений."
            />
            <Step
              n="03"
              delay={240}
              icon={<MessageCircle className="h-5 w-5" />}
              title="Получайте ответы"
              desc="Компании видят отзывы и отвечают публично, поэтому диалог открыт для всех."
            />
          </div>
        </section>

        {/* ------------------------------------------------------------ BENTO */}
        <section className="mt-24">
          <Reveal className="max-w-2xl">
            <div className="clarify-badge w-fit">Почему Clarify</div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-4xl">
              Платформа, которой можно доверять
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-3 md:row-span-2">
              <div className="clarify-card flex h-full flex-col p-7">
                <IconBubble icon={<ShieldCheck className="h-5 w-5" />} />
                <h3 className="mt-5 text-xl font-semibold">
                  Только настоящие люди
                </h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  Чтобы оставить отзыв, нужно подтвердить почту одноразовым
                  кодом. Это отсекает ботов и накрутку, а рейтинг остаётся
                  честным.
                </p>

                <div className="mt-8 flex flex-1 items-end">
                  <div className="flex w-full items-center gap-2" aria-hidden>
                    {["4", "8", "1", "5", "9", "2"].map((d, i) => (
                      <span
                        key={i}
                        className="star-pop flex h-14 flex-1 items-center justify-center rounded-2xl border bg-surface-soft font-display text-xl font-semibold"
                        style={{ "--d": `${i * 120}ms` } as React.CSSProperties}
                      >
                        {d}
                      </span>
                    ))}
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success-text">
                      <Check className="h-6 w-6" />
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100} className="md:col-span-3">
              <BentoTile
                icon={<MessageCircle className="h-5 w-5" />}
                title="Ответы от компаний"
                desc="Бизнес отвечает прямо под отзывом, и ответ видят все посетители."
              />
            </Reveal>

            <Reveal delay={180} className="md:col-span-3">
              <BentoTile
                icon={<Sparkles className="h-5 w-5" />}
                title="Теги вместо воды"
                desc="«Быстро», «чисто», «хороший персонал»: суть отзыва понятна за секунду."
              />
            </Reveal>

            <Reveal delay={0} className="md:col-span-2">
              <BentoTile
                icon={<MapPin className="h-5 w-5" />}
                title="Карта 2GIS"
                desc="Точка на карте у каждого места."
              />
            </Reveal>
            <Reveal delay={100} className="md:col-span-2">
              <BentoTile
                icon={<BadgeCheck className="h-5 w-5" />}
                title="Модерация"
                desc="Фильтр нецензурной лексики и проверки на сервере."
              />
            </Reveal>
            <Reveal delay={200} className="md:col-span-2">
              <BentoTile
                icon={<Building2 className="h-5 w-5" />}
                title="Для бизнеса"
                desc="Кабинет компании и несколько филиалов."
              />
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- BUSINESS */}
        <Reveal className="mt-24">
          <section
            id="business"
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0b1d] px-6 py-10 text-white shadow-[var(--shadow-elevated)] md:px-12 md:py-14"
          >
            <div
              aria-hidden
              className="anim-blob pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#6366f1]/40 blur-[90px]"
            />
            <div
              aria-hidden
              className="anim-blob pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-[#ec4899]/25 blur-[90px] [animation-delay:-8s]"
            />

            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f5d77a]">
                  <Building2 className="h-3.5 w-3.5" />
                  Clarify для бизнеса
                </div>

                <h2 className="mt-5 text-2xl font-semibold leading-tight sm:text-4xl">
                  Репутация вашего бизнеса в одном кабинете
                </h2>

                <p className="mt-4 max-w-xl text-base leading-8 text-white/70">
                  Добавляйте филиалы, отвечайте на отзывы и показывайте
                  клиентам, что их мнение важно.
                </p>

                <ul className="mt-6 grid gap-3 text-sm text-white/85 sm:text-base">
                  {[
                    "Все филиалы компании в одном месте",
                    "Публичные ответы укрепляют доверие",
                    "Обратная связь помогает находить точки роста",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#8b8ffb]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                  {isCompany ? (
                    <>
                      <div className="text-lg font-semibold">
                        Управляйте компанией из кабинета
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/65">
                        Создайте новый филиал и смотрите отзывы по всем точкам.
                      </p>
                      <div className="mt-5 grid gap-3">
                        <Link href="/company" className="clarify-button-primary">
                          <LayoutDashboard className="h-4 w-4" />
                          Перейти в кабинет
                        </Link>
                        <Link
                          href="/company?tab=create-branch"
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-white/5 px-5 text-sm font-semibold transition hover:bg-white/10"
                        >
                          <Plus className="h-4 w-4" />
                          Создать филиал
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-semibold">
                        {isAuthed
                          ? "Подключите компанию к Clarify"
                          : "Начните как компания"}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/65">
                        {isAuthed
                          ? "Откройте бизнес-кабинет, добавьте филиалы и начните работать с отзывами."
                          : "Зарегистрируйте компанию и создайте первые филиалы, чтобы выстраивать доверие через отзывы."}
                      </p>
                      <div className="mt-5 grid gap-3">
                        <Link href="/business" className="clarify-button-primary">
                          Подробнее для компаний
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function HeroVisual() {
  return (
    <div
      className="anim-rise relative mx-auto h-[440px] w-full max-w-[420px] lg:col-span-5 lg:max-w-none"
      style={{ "--d": "300ms" } as React.CSSProperties}
      aria-hidden
    >
      <div className="absolute inset-x-6 top-10 bottom-10 rounded-[40px] bg-gradient-to-br from-primary/15 via-transparent to-[#ec4899]/15 blur-2xl" />

      {/* sample review */}
      <div className="anim-float-a absolute left-0 top-2 w-[78%] max-w-[320px]">
        <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-elevated)]">
          <SampleLabel />
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/15 text-sm font-semibold text-violet-700 dark:text-violet-300">
              АС
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Айдос</div>
              <StarRating value={5} size="sm" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/85">
            Обслужили за пару минут, в зале чисто и тихо. Вернусь ещё.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              быстро
            </span>
            <span className="rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              чисто
            </span>
          </div>
        </div>
      </div>

      {/* sample company reply */}
      <div className="anim-float-b absolute right-0 top-[172px] w-[72%] max-w-[300px]">
        <div className="rounded-3xl border border-primary-soft-border bg-primary-soft p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <BadgeCheck className="h-4 w-4" />
            Ответ компании
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground/85">
            Спасибо за тёплые слова! Будем рады видеть вас снова.
          </p>
        </div>
      </div>

      {/* sample rating */}
      <div className="anim-float-c absolute bottom-0 left-[6%] w-[64%] max-w-[260px]">
        <div className="rounded-3xl border bg-card p-4 shadow-[var(--shadow-elevated)]">
          <div className="flex items-end gap-3">
            <span className="font-display text-4xl font-semibold leading-none">
              4.8
            </span>
            <StarRating value={4.8} size="sm" className="pb-1" />
          </div>
          <div className="mt-3 grid gap-1.5">
            {[88, 9, 3].map((w, i) => (
              <div key={i} className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--star)]"
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="anim-float-c absolute right-2 top-0 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-card)] [animation-delay:-2s]">
        <ShieldCheck className="h-3.5 w-3.5 text-success-text" />
        Подтверждено
      </div>
      <div className="anim-float-a absolute bottom-6 right-0 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-card)] [animation-delay:-3s]">
        <Star className="h-3.5 w-3.5 fill-[var(--star)] text-[var(--star)]" />
        +1 отзыв
      </div>
    </div>
  );
}

function SampleLabel() {
  return (
    <span className="inline-flex rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Пример отзыва
    </span>
  );
}

function IconBubble({ icon }: { icon: ReactNode }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-soft-border bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
      {icon}
    </span>
  );
}

function BentoTile({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="clarify-card group h-full p-6">
      <IconBubble icon={icon} />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
  delay,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="clarify-card group relative h-full p-7">
        <div className="flex items-center justify-between">
          <span className="text-gradient-brand font-display text-5xl font-semibold leading-none">
            {n}
          </span>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-soft-border bg-primary-soft text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            {icon}
          </span>
        </div>
        <h3 className="mt-6 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{desc}</p>
      </div>
    </Reveal>
  );
}
