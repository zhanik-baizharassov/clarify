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

export default function LandingHome({ isAuthed, role }: LandingHomeProps) {
  const isCompany = role === "COMPANY";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="clarify-hero relative overflow-hidden px-6 py-8 md:px-10 md:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-warm-accent/60 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
          <div className="lg:col-span-7 lg:row-start-1">
            <div className="clarify-badge w-fit border-border bg-white/85 text-[#667085] dark:border-[#24314A] dark:bg-[#101A2E] dark:text-[#94A3B8]">
              <span className="inline-flex h-6 items-center rounded-full border border-warm-accent-border bg-warm-accent px-2.5 text-[11px] font-semibold text-[#8A6B16] dark:border-[#6B5717] dark:bg-[#2A220F] dark:text-[#F3D98C]">
                KZ
              </span>
              <span>Отзывы и репутация по Казахстану</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.08]">
              Выбирайте места увереннее
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#475467] dark:text-[#CBD5E1] md:text-base">
              Clarify помогает находить места по реальному опыту людей, а
              компаниям — собирать обратную связь, отвечать на отзывы и
              укреплять доверие клиентов.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="clarify-button-primary w-full sm:w-auto"
              >
                <Search className="h-4 w-4" />
                Найти места
              </Link>

              {!isAuthed ? (
                <Link
                  href="/signup"
                  className="clarify-button-secondary w-full sm:w-auto"
                >
                  Зарегистрироваться
                </Link>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-5 lg:row-span-2">
            <div className="relative mx-auto h-full max-w-[360px] lg:ml-auto lg:max-w-none">
              <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#24314A] bg-[#0F1B33] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.18)] sm:p-6">
                <div className="flex flex-1 flex-col">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#6B5717] bg-[#2A220F] px-3 py-1 text-xs font-semibold text-[#F3D98C]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Прозрачная репутация
                  </div>

                  <div className="flex flex-1 items-center justify-center py-6">
                    <Image
                      src="/logo.png"
                      alt="Clarify logo"
                      width={280}
                      height={280}
                      priority
                      className="h-auto w-full max-w-[170px] object-contain drop-shadow-[0_18px_36px_rgba(37,99,235,0.18)]"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <TrustLine
                    icon={<ShieldCheck className="h-4 w-4" />}
                    text="Верифицированные отзывы"
                  />
                  <TrustLine
                    icon={<MessageCircle className="h-4 w-4" />}
                    text="Официальные ответы компаний"
                  />
                  <TrustLine
                    icon={<Building2 className="h-4 w-4" />}
                    text="Подтвержденное присутствие бизнеса"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            id="features"
            className="relative lg:col-span-7 lg:row-start-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
        </div>
      </section>

      <div className="mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <PlatformStats />
      </div>

      <section
        id="how"
        className="clarify-soft-section mt-8 px-6 py-8 md:px-10 md:py-10"
      >
        <div className="max-w-3xl">
          <div className="clarify-badge w-fit">Как это работает</div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Понятный сценарий для пользователей и бизнеса
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            Clarify помогает пользователям выбирать осознаннее, а компаниям —
            лучше понимать клиентов и работать с репутацией открыто.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
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

      <section
        id="business"
        className="clarify-focus-section relative mt-8 overflow-hidden px-6 py-8 md:px-10 md:py-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-warm-accent/60 blur-3xl"
        />

        <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="clarify-badge-premium w-fit">
              <Building2 className="h-3.5 w-3.5" />
              Clarify для бизнеса
            </div>

            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Управляйте репутацией в одном месте
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Clarify помогает компаниям работать с обратной связью открыто и
              удобно: добавляйте филиалы, отвечайте на отзывы и укрепляйте
              доверие к вашему бренду.
            </p>

            <ul className="mt-6 grid max-w-3xl gap-3 text-sm text-muted-foreground md:text-base">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="leading-6">
                  Все филиалы компании в одном кабинете
                </span>
              </li>

              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span className="leading-6">
                  Публичные ответы помогают укреплять доверие клиентов
                </span>
              </li>

              <li className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="leading-6">
                  Обратная связь помогает быстрее находить точки роста сервиса
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-5">
            {!isCompany ? (
              <div className="clarify-card-elevated relative mx-auto w-full max-w-xl overflow-hidden p-5 sm:p-6 lg:max-w-none">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
                />

                <div className="clarify-badge-premium w-fit">
                  Кабинет компании
                </div>

                <div className="mt-4 text-lg font-semibold text-foreground">
                  {isAuthed
                    ? "Подключите компанию к Clarify"
                    : "Начните как компания"}
                </div>

                <div className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                  {isAuthed
                    ? "Откройте бизнес-кабинет, добавьте филиалы и начните работать с отзывами клиентов."
                    : "Зарегистрируйте компанию, создайте первые филиалы и начните выстраивать доверие через отзывы."}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SmallPill>Филиалы</SmallPill>
                  <SmallPill>Отзывы</SmallPill>
                  <SmallPill>Репутация</SmallPill>
                </div>

                <div className="mt-5 grid gap-3">
                  <Link href="/business" className="clarify-button-primary">
                    Подробнее для компаний
                  </Link>
                </div>
              </div>
            ) : (
              <div className="clarify-card-elevated relative mx-auto w-full max-w-xl overflow-hidden p-5 sm:p-6 lg:max-w-none">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
                />

                <div className="clarify-badge-premium w-fit">
                  Кабинет компании
                </div>

                <div className="mt-4 text-lg font-semibold text-foreground">
                  Управляйте компанией из кабинета
                </div>

                <div className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                  Перейдите в кабинет, создайте новый филиал и просматривайте
                  отзывы по вашим точкам в одном месте.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SmallPill>Кабинет</SmallPill>
                  <SmallPill>Филиалы</SmallPill>
                  <SmallPill>Отзывы</SmallPill>
                </div>

                <div className="mt-5 grid gap-3">
                  <Link href="/company" className="clarify-button-primary">
                    <LayoutDashboard className="h-4 w-4" />
                    Перейти в кабинет
                  </Link>

                  <Link
                    href="/company?tab=create-branch"
                    className="clarify-button-secondary"
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

function TrustLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-[#24314A] bg-[#101A2E] px-4 py-3 text-sm text-[#CBD5E1]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[14px] border border-[#24314A] bg-[#142039] text-[#3B82F6]">
        {icon}
      </span>
      <span>{text}</span>
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
    <div className="clarify-card-soft border-white/80 p-5 dark:border-[#24314A] dark:bg-[#101A2E]">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary dark:border-[#24314A] dark:bg-[#142039] dark:text-[#60A5FA]">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-3 text-sm leading-6 text-[#667085] dark:text-[#94A3B8]">
        {desc}
      </div>
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
    <div className="clarify-card border-white/70 bg-card/95 p-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
          {icon}
        </span>
        <div>
          <div className="text-base font-semibold text-foreground md:text-lg">
            {title}
          </div>
          <div className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallPill({ children }: { children: ReactNode }) {
  return (
    <span className="clarify-chip text-xs text-muted-foreground">
      {children}
    </span>
  );
}
