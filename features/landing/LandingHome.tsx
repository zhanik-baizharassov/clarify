import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import PlatformStats from "@/features/analytics/components/PlatformStats";

export default function LandingHome({ isAuthed }: { isAuthed?: boolean }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
              <span>Отзывы только от верифицированных пользователей</span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Нам важно ваше мнение!
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Clarify помогает выбирать места по реальным отзывам и рейтингу, а
              компаниям — получать прозрачную обратную связь и отвечать
              официально.
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
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium sm:w-auto"
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
            title="Доверие к отзывам"
            desc="Верификация через OTP снижает спам и повышает качество"
          />
          <MiniFeature
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Чистый контент"
            desc="Модерация и проверки на сервере поддерживают порядок"
          />
          <MiniFeature
            icon={<MessageCircle className="h-4 w-4" />}
            title="Диалог с компанией"
            desc="Компании отвечают на отзывы официально — всё прозрачно"
          />
        </div>
      </section>

      {/* STATS — между hero и how */}
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
          Мы делаем отзывы полезными: меньше шума, больше смысла. Пользователь
          быстро выбирает, а компания получает честную обратную связь и может
          ответить.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StepCard
            icon={<Search className="h-5 w-5" />}
            title="Выбирайте быстрее"
            desc="Откройте каталог, используйте фильтры и сортировку — находите нужный филиал по рейтингу и отзывам."
          />
          <StepCard
            icon={<Star className="h-5 w-5" />}
            title="Оставляйте честно"
            desc="Отзыв оставляет только верифицированный пользователь — это помогает держать качество и доверие."
          />
          <StepCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Получайте ответ"
            desc="Компания может ответить официально — пользователи видят реакцию, а бизнес улучшает сервис."
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
            <h2 className="text-xl font-semibold md:text-2xl">Для компаний</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Создавайте карточки филиалов и управляйте репутацией в одном
              месте. Отвечайте на отзывы публично — это повышает доверие и
              конверсию.
            </p>

            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground md:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>Кабинет компании + управление филиалами (Place)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>
                  Официальные ответы на отзывы — без конфликтов и “лички”
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/60 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span>
                  Модерация и проверки помогают держать площадку чистой
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border bg-background p-6">
              <div className="text-base font-semibold md:text-lg">
                Начать как компания
              </div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Зарегистрируйтесь и создайте первые филиалы. Дальше — отвечайте
                на отзывы и собирайте доверие.
              </div>

              <div className="mt-5 grid gap-2">
                <Link
                  href="/business/signup"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  Регистрация компании
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniFeature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-muted/30">
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
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-6">
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
