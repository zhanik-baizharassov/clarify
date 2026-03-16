import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import PlatformStats from "@/features/analytics/components/PlatformStats";

type LandingHomeProps = {
  isAuthed?: boolean;
  role?: "USER" | "COMPANY" | "ADMIN" | null;
};

export default function LandingHome({
  isAuthed,
  role,
}: LandingHomeProps) {
  const isCompany = role === "COMPANY";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border bg-muted/20 p-7 md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">KZ</span>
              <span>Платформа отзывов для людей и бизнеса</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Выбирайте места увереннее
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Clarify помогает находить места по реальному опыту людей, а
              компаниям — собирать обратную связь, отвечать на отзывы и
              укреплять доверие клиентов.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/explore"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:w-auto"
              >
                <Search className="h-4 w-4" />
                Найти места
              </Link>

              {!isAuthed ? (
                <Link
                  href="/signup"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium transition hover:bg-muted/30 sm:w-auto"
                >
                  Зарегистрироваться
                </Link>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto flex max-w-[360px] justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 scale-90 rounded-full bg-primary/15 blur-3xl" />
                <Image
                  src="/logo.png"
                  alt="Clarify logo"
                  width={420}
                  height={420}
                  priority
                  className="relative h-auto w-full max-w-[300px] object-contain drop-shadow-[0_22px_50px_rgba(59,130,246,0.24)]"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          id="features"
          className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <MiniFeature
            icon={<BadgeCheck className="h-4 w-4" />}
            title="Честные впечатления"
            desc="Отзывы помогают заранее понять, чего ожидать от места и сервиса."
          />
          <MiniFeature
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Удобный выбор"
            desc="Сравнивайте места по рейтингу, отзывам и общей репутации в одном каталоге."
          />
          <MiniFeature
            icon={<MessageCircle className="h-4 w-4" />}
            title="Открытый диалог"
            desc="Компании отвечают на отзывы публично и показывают, что им важна обратная связь."
          />
        </div>
      </section>

      {/* STATS */}
      <div className="mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <PlatformStats />
      </div>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="mt-8 rounded-3xl border bg-background p-7 md:p-10"
      >
        <h2 className="text-xl font-semibold md:text-2xl">Как это работает</h2>
        <p className="mt-2 max-w-6xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Clarify помогает пользователям выбирать осознаннее, а компаниям —
          лучше понимать клиентов и работать с репутацией открыто.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StepCard
            icon={<Search className="h-5 w-5" />}
            title="Находите нужное"
            desc="Откройте каталог, сравните места и быстро поймите, куда действительно стоит идти."
          />
          <StepCard
            icon={<Star className="h-5 w-5" />}
            title="Делитесь опытом"
            desc="Оставляйте отзыв после посещения и помогайте другим принимать решение увереннее."
          />
          <StepCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Следите за реакцией бизнеса"
            desc="Компании видят обратную связь, отвечают на отзывы и улучшают качество сервиса."
          />
        </div>
      </section>

      {/* BUSINESS CTA */}
      <section
        id="business"
        className="mt-8 rounded-3xl border bg-muted/20 p-7 md:p-10"
      >
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Для бизнеса
            </div>

            <h2 className="mt-4 text-xl font-semibold md:text-2xl">
              Управляйте репутацией в одном месте
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Clarify помогает компаниям работать с обратной связью открыто и
              удобно: добавляйте филиалы, отвечайте на отзывы и укрепляйте
              доверие к вашему бренду.
            </p>

            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground md:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>Все филиалы компании в одном кабинете</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>Публичные ответы помогают укреплять доверие клиентов</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span>
                  Обратная связь помогает быстрее находить точки роста сервиса
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-5">
            {!isCompany ? (
              <div className="relative overflow-hidden rounded-2xl border bg-background p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
                />

                <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                  Новый кабинет компании
                </div>

                <div className="mt-4 text-base font-semibold md:text-lg">
                  {isAuthed
                    ? "Подключите компанию к Clarify"
                    : "Начните как компания"}
                </div>

                <div className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {isAuthed
                    ? "Откройте бизнес-кабинет, добавьте филиалы и начните работать с отзывами клиентов."
                    : "Зарегистрируйте компанию, создайте первые филиалы и начните выстраивать доверие через отзывы."}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SmallPill>Филиалы</SmallPill>
                  <SmallPill>Отзывы</SmallPill>
                  <SmallPill>Репутация</SmallPill>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    href="/business/signup"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    {isAuthed ? "Подключить компанию" : "Регистрация компании"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border bg-background p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
                />

                <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                  Вы вошли как компания
                </div>

                <div className="mt-4 text-base font-semibold md:text-lg">
                  Управляйте компанией из кабинета
                </div>

                <div className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Перейдите в кабинет, создайте новый филиал и просматривайте
                  отзывы по вашим точкам в одном месте.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SmallPill>Кабинет</SmallPill>
                  <SmallPill>Филиалы</SmallPill>
                  <SmallPill>Отзывы</SmallPill>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    href="/company"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Перейти в кабинет
                  </Link>

                  <Link
                    href="/company?tab=create-branch"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-6 text-sm font-medium transition hover:bg-muted/30"
                  >
                    <Plus className="h-4 w-4" />
                    Создать филиал
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniFeature({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background/90">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-muted/30 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

function StepCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border bg-background/60 text-primary">
          {icon}
        </span>
        <div>
          <div className="text-base font-semibold md:text-lg">{title}</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}