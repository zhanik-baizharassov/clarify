import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  FileCheck2,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import CreateCatalogPlaceForm from "@/features/admin/components/create-catalog-place-form";
import ClaimReviewActions from "@/features/admin/components/claim-review-actions";

export const runtime = "nodejs";

export default async function AdminPage() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("AdminPage: getSessionUser failed:", err);
    user = null;
  }

  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const [
    usersCount,
    companiesCount,
    placesCount,
    reviewsCount,
    pendingClaimsCount,
    unclaimedPlacesCount,
    categories,
    recentUnclaimedPlaces,
    pendingClaims,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.place.count(),
    prisma.review.count(),
    prisma.claim.count({ where: { status: "PENDING" } }),
    prisma.place.count({ where: { companyId: null } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.place.findMany({
      where: { companyId: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        createdAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.claim.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            address: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            bin: true,
            owner: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const dtf = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  });

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Только для администратора
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Админ-панель Clarify
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Здесь начинается управление платформой: пользователи, компании,
            карточки мест, отзывы и claim-заявки.
          </p>
        </div>

        <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
          Администратор:{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <AdminStatCard
          icon={<UserRound className="h-5 w-5" />}
          label="Пользователи"
          value={usersCount}
          note="Всего аккаунтов"
        />
        <AdminStatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Компании"
          value={companiesCount}
          note="Зарегистрированные компании"
        />
        <AdminStatCard
          icon={<MapPinned className="h-5 w-5" />}
          label="Карточки"
          value={placesCount}
          note="Всего мест в каталоге"
        />
        <AdminStatCard
          icon={<MessageCircle className="h-5 w-5" />}
          label="Отзывы"
          value={reviewsCount}
          note="Все отзывы платформы"
        />
        <AdminStatCard
          icon={<FileCheck2 className="h-5 w-5" />}
          label="Claim-заявки"
          value={pendingClaimsCount}
          note="Ожидают проверки"
        />
        <AdminStatCard
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Без владельца"
          value={unclaimedPlacesCount}
          note="Карточки без компании"
        />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminActionCard
          title="Создать карточку места"
          desc="Добавьте карточку вручную без привязки к компании, чтобы наполнять каталог."
          href="#create-place"
        />
        <AdminActionCard
          title="Карточки без владельца"
          desc="Отслеживайте места, которые ещё не привязаны к company account."
          href="#unclaimed-places"
        />
        <AdminActionCard
          title="Claim-заявки"
          desc="Проверяйте заявки компаний и вручную привязывайте карточки к владельцам."
          href="#claims"
        />
        <AdminActionCard
          title="Модерация отзывов"
          desc="Следующим этапом здесь появится ручная проверка и управление отзывами."
          badge="Скоро"
        />
      </section>

      <section
        id="create-place"
        className="mt-8 rounded-3xl border bg-background p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Создать каталожную карточку места
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Это карточка без привязки к компании. Позже владелец бизнеса сможет
              заявить права на неё через claim-flow.
            </p>
          </div>

          <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            Категорий:{" "}
            <span className="font-medium text-foreground">{categories.length}</span>
          </div>
        </div>

        <CreateCatalogPlaceForm categories={categories} />
      </section>

      <section
        id="claims"
        className="mt-8 rounded-3xl border bg-background p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Claim-заявки</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Здесь администратор принимает решение, какой компании передать
              управление карточкой места.
            </p>
          </div>

          <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            Ожидают проверки:{" "}
            <span className="font-medium text-foreground">
              {pendingClaimsCount}
            </span>
          </div>
        </div>

        {pendingClaims.length ? (
          <div className="mt-6 grid gap-4">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-2xl border bg-muted/10 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      Заявка от {dtf.format(claim.createdAt)}
                    </div>

                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground">
                        Карточка места
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/place/${claim.place.slug}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {claim.place.name}
                        </Link>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {claim.place.city}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {claim.place.address ?? "Адрес не указан"}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground">
                        Компания-заявитель
                      </div>
                      <div className="mt-1 text-base font-medium">
                        {claim.company.name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {claim.company.bin ? `БИН: ${claim.company.bin}` : "БИН не указан"}
                        {claim.company.owner.email
                          ? ` • ${claim.company.owner.email}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-[320px]">
                    <ClaimReviewActions claimId={claim.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border p-6 text-sm text-muted-foreground">
            Сейчас нет заявок, ожидающих проверки.
          </div>
        )}
      </section>

      <section
        id="unclaimed-places"
        className="mt-8 rounded-3xl border bg-background p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Последние карточки без владельца
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Это места, у которых пока нет привязанной компании и официального кабинета.
            </p>
          </div>

          <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            Всего без владельца:{" "}
            <span className="font-medium text-foreground">
              {unclaimedPlacesCount}
            </span>
          </div>
        </div>

        {recentUnclaimedPlaces.length ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {recentUnclaimedPlaces.map((place) => (
              <div
                key={place.id}
                className="rounded-2xl border bg-muted/10 p-5 transition hover:border-primary/35 hover:bg-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/place/${place.slug}`}
                        className="text-lg font-semibold hover:underline"
                      >
                        {place.name}
                      </Link>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {place.category.name}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {place.city}
                      {place.address ? ` • ${place.address}` : ""}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Создано: {dtf.format(place.createdAt)}
                    </div>
                  </div>

                  <span className="rounded-full border bg-primary/10 px-3 py-1 text-xs text-primary">
                    Без компании
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border p-6 text-sm text-muted-foreground">
            Пока нет карточек без владельца.
          </div>
        )}
      </section>
    </main>
  );
}

function AdminStatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        </div>

        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/20 text-primary">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground">{note}</div>
    </div>
  );
}

function AdminActionCard({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-semibold">{title}</div>
        {badge ? (
          <span className="rounded-full border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/20"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border bg-background p-5">{content}</div>;
}