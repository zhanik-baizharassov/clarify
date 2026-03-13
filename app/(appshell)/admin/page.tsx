import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  FileCheck2,
  FolderTree,
  LayoutDashboard,
  PlusSquare,
  Tags,
  UserRound,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import CreateCatalogPlaceForm from "@/features/admin/components/create-catalog-place-form";
import ClaimReviewActions from "@/features/admin/components/claim-review-actions";
import UserModerationActions from "@/features/admin/components/user-moderation-actions";
import CompanyModerationActions from "@/features/admin/components/company-moderation-actions";
import CategoryManagementPanel from "@/features/admin/components/category-management-panel";
import TagManagementPanel from "@/features/admin/components/tag-management-panel";

export const runtime = "nodejs";

type AdminSection =
  | "users"
  | "companies"
  | "create-place"
  | "claims"
  | "unclaimed-places"
  | "categories"
  | "tags"
  | null;

type CategoryOption = {
  id: string;
  name: string;
};

type CategoryAdminItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: {
    children: number;
    places: number;
  };
};

type TagAdminItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count: {
    reviewTags: number;
  };
};

const PAGE_SIZE = 10;

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clampPage(page: number, total: number) {
  if (total <= 0) return 1;
  return Math.min(Math.max(page, 1), total);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildAdminHref(section: Exclude<AdminSection, null>, page = 1) {
  return `/admin?section=${section}&page=${page}`;
}

function getUserLabel(user: {
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.nickname || fullName || user.email;
}

function isBlockActive(date?: Date | null) {
  return Boolean(date && date > new Date());
}

function getWorkspaceMeta(section: Exclude<AdminSection, null>) {
  switch (section) {
    case "users":
      return {
        title: "Пользователи",
        desc: "Просмотр пользовательских аккаунтов, временная блокировка и снятие блокировки.",
      };
    case "companies":
      return {
        title: "Компании",
        desc: "Просмотр компаний, их данных и управление временной блокировкой.",
      };
    case "claims":
      return {
        title: "Claim-заявки",
        desc: "Проверка заявок компаний на получение управления карточками мест.",
      };
    case "unclaimed-places":
      return {
        title: "Карточки без владельца",
        desc: "Просмотр мест, которые ещё не привязаны к компании.",
      };
    case "categories":
      return {
        title: "Категории",
        desc: "Создание категорий, настройка иерархии, активности и порядка отображения.",
      };
    case "tags":
      return {
        title: "Теги",
        desc: "Создание тегов отзывов, управление активностью и порядком показа.",
      };
    case "create-place":
      return {
        title: "Создать карточку компании",
        desc: "Создание каталожной карточки места/бизнеса без привязки к company account.",
      };
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    section?: string | string[];
    page?: string | string[];
  }>;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedSection = getSingleSearchParam(resolvedSearchParams.section);
  const requestedPageRaw = Number(getSingleSearchParam(resolvedSearchParams.page));
  const requestedPage =
    Number.isFinite(requestedPageRaw) && requestedPageRaw > 0
      ? Math.floor(requestedPageRaw)
      : 1;

  const activeSection: AdminSection =
    requestedSection === "users" ||
    requestedSection === "companies" ||
    requestedSection === "create-place" ||
    requestedSection === "claims" ||
    requestedSection === "unclaimed-places" ||
    requestedSection === "categories" ||
    requestedSection === "tags"
      ? requestedSection
      : null;

  const [usersCount, companiesCount, pendingClaimsCount, unclaimedPlacesCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.company.count(),
      prisma.claim.count({ where: { status: "PENDING" } }),
      prisma.place.count({ where: { companyId: null } }),
    ]);

  const usersTotalPages = Math.max(1, Math.ceil(usersCount / PAGE_SIZE));
  const companiesTotalPages = Math.max(1, Math.ceil(companiesCount / PAGE_SIZE));

  const usersPage = clampPage(requestedPage, usersTotalPages);
  const companiesPage = clampPage(requestedPage, companiesTotalPages);

  const [
    createPlaceCategories,
    adminCategories,
    adminTags,
    recentUnclaimedPlaces,
    pendingClaims,
    usersList,
    companiesList,
  ] = await Promise.all([
    activeSection === "create-place"
      ? prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([] as CategoryOption[]),

    activeSection === "categories"
      ? prisma.category.findMany({
          orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            isActive: true,
            sortOrder: true,
            _count: {
              select: {
                children: true,
                places: true,
              },
            },
          },
        })
      : Promise.resolve([] as CategoryAdminItem[]),

    activeSection === "tags"
      ? prisma.tag.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            sortOrder: true,
            _count: {
              select: {
                reviewTags: true,
              },
            },
          },
        })
      : Promise.resolve([] as TagAdminItem[]),

    activeSection === "unclaimed-places"
      ? prisma.place.findMany({
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
        })
      : Promise.resolve([]),

    activeSection === "claims"
      ? prisma.claim.findMany({
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
        })
      : Promise.resolve([]),

    activeSection === "users"
      ? prisma.user.findMany({
          where: { role: "USER" },
          orderBy: { createdAt: "desc" },
          skip: (usersPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            email: true,
            phone: true,
            nickname: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            blockedUntil: true,
            blockReason: true,
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        })
      : Promise.resolve([]),

    activeSection === "companies"
      ? prisma.company.findMany({
          orderBy: { createdAt: "desc" },
          skip: (companiesPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            bin: true,
            address: true,
            createdAt: true,
            blockedUntil: true,
            blockReason: true,
            owner: {
              select: {
                email: true,
                phone: true,
              },
            },
            _count: {
              select: {
                places: true,
                claims: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const workspaceMeta = activeSection ? getWorkspaceMeta(activeSection) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Админ-панель Clarify
          </h1>
          <p className="text-sm text-muted-foreground">
            Единое меню разделов для управления платформой.
          </p>
        </div>

        <div className="rounded-full border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
          Администратор:{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border bg-background/70 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Меню</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите нужный раздел. Внутри каждого раздела откроется рабочая область.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AdminMenuCard
            icon={<UserRound className="h-4 w-4" />}
            title="Пользователи"
            desc="Просмотр пользователей, история аккаунтов и временная блокировка."
            href={buildAdminHref("users")}
            active={activeSection === "users"}
          />
          <AdminMenuCard
            icon={<Building2 className="h-4 w-4" />}
            title="Компании"
            desc="Просмотр компаний, их данных и управление блокировкой бизнес-аккаунтов."
            href={buildAdminHref("companies")}
            active={activeSection === "companies"}
          />
          <AdminMenuCard
            icon={<FileCheck2 className="h-4 w-4" />}
            title="Claim-заявки"
            desc="Проверка и одобрение заявок компаний на управление карточками."
            href={buildAdminHref("claims")}
            active={activeSection === "claims"}
          />
          <AdminMenuCard
            icon={<LayoutDashboard className="h-4 w-4" />}
            title="Карточки без владельца"
            desc="Просмотр мест, которые ещё не привязаны к компании и ждут владельца."
            href={buildAdminHref("unclaimed-places")}
            active={activeSection === "unclaimed-places"}
          />
          <AdminMenuCard
            icon={<FolderTree className="h-4 w-4" />}
            title="Категории"
            desc="Создание категорий, настройка иерархии, активности и порядка отображения."
            href={buildAdminHref("categories")}
            active={activeSection === "categories"}
          />
          <AdminMenuCard
            icon={<Tags className="h-4 w-4" />}
            title="Теги"
            desc="Создание тегов отзывов, управление активностью и порядком показа."
            href={buildAdminHref("tags")}
            active={activeSection === "tags"}
          />
          <AdminMenuCard
            icon={<PlusSquare className="h-4 w-4" />}
            title="Создать карточку компании"
            desc="Создание каталожной карточки места или бизнеса без привязки к company account."
            href={buildAdminHref("create-place")}
            active={activeSection === "create-place"}
          />
        </div>
      </section>

      {!activeSection ? (
        <section className="mt-4 rounded-3xl border bg-background p-6">
          <h2 className="text-xl font-semibold">Выберите раздел</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Все инструменты админки собраны в меню выше. После выбора откроется
            рабочая область нужного раздела.
          </p>
        </section>
      ) : null}

      {activeSection ? (
        <section className="mt-4 rounded-3xl border bg-background p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">{workspaceMeta?.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {workspaceMeta?.desc}
              </p>
            </div>

            <Link
              href="/admin"
              scroll={false}
              className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
            >
              Закрыть раздел
            </Link>
          </div>

          {activeSection === "categories" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего категорий:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {adminCategories.length}
                </span>
              </div>

              <CategoryManagementPanel categories={adminCategories} />
            </div>
          ) : null}

          {activeSection === "tags" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего тегов:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {adminTags.length}
                </span>
              </div>

              <TagManagementPanel tags={adminTags} />
            </div>
          ) : null}

          {activeSection === "users" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего пользователей:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {usersCount}
                </span>
              </div>

              {usersList.length > 0 ? (
                <>
                  <div className="grid gap-4">
                    {usersList.map((item) => {
                      const isBlocked = isBlockActive(item.blockedUntil);

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border bg-muted/10 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold">
                                  {getUserLabel(item)}
                                </div>

                                <span
                                  className={[
                                    "rounded-full border px-2.5 py-1 text-[11px]",
                                    isBlocked
                                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
                                  ].join(" ")}
                                >
                                  {isBlocked ? "Заблокирован" : "Активен"}
                                </span>
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                {item.email}
                                {item.phone ? ` • ${item.phone}` : ""}
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                Отзывов: {item._count.reviews}
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">
                                Создан: {formatDate(item.createdAt)}
                              </div>

                              {isBlocked && item.blockedUntil ? (
                                <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
                                  До:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatDate(item.blockedUntil)}
                                  </span>
                                  {item.blockReason ? (
                                    <>
                                      <br />
                                      Причина:{" "}
                                      <span className="font-medium text-foreground">
                                        {item.blockReason}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="w-full max-w-[340px]">
                              <UserModerationActions
                                userId={item.id}
                                blockedUntil={
                                  item.blockedUntil?.toISOString() ?? null
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    section="users"
                    page={usersPage}
                    totalPages={usersTotalPages}
                    totalItems={usersCount}
                    pageSize={PAGE_SIZE}
                  />
                </>
              ) : (
                <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                  Пользователей пока нет.
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "companies" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего компаний:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {companiesCount}
                </span>
              </div>

              {companiesList.length > 0 ? (
                <>
                  <div className="grid gap-4">
                    {companiesList.map((item) => {
                      const isBlocked = isBlockActive(item.blockedUntil);

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border bg-muted/10 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold">
                                  {item.name}
                                </div>

                                <span
                                  className={[
                                    "rounded-full border px-2.5 py-1 text-[11px]",
                                    isBlocked
                                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
                                  ].join(" ")}
                                >
                                  {isBlocked ? "Заблокирована" : "Активна"}
                                </span>
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                {item.bin ? `БИН: ${item.bin}` : "БИН не указан"}
                                {item.owner.email ? ` • ${item.owner.email}` : ""}
                                {item.owner.phone ? ` • ${item.owner.phone}` : ""}
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                Филиалов: {item._count.places} • Claim-заявок:{" "}
                                {item._count.claims}
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                {item.address ?? "Адрес не указан"}
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">
                                Создана: {formatDate(item.createdAt)}
                              </div>

                              {isBlocked && item.blockedUntil ? (
                                <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
                                  До:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatDate(item.blockedUntil)}
                                  </span>
                                  {item.blockReason ? (
                                    <>
                                      <br />
                                      Причина:{" "}
                                      <span className="font-medium text-foreground">
                                        {item.blockReason}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="w-full max-w-[340px]">
                              <CompanyModerationActions
                                companyId={item.id}
                                blockedUntil={
                                  item.blockedUntil?.toISOString() ?? null
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    section="companies"
                    page={companiesPage}
                    totalPages={companiesTotalPages}
                    totalItems={companiesCount}
                    pageSize={PAGE_SIZE}
                  />
                </>
              ) : (
                <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                  Компаний пока нет.
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "create-place" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Активных категорий:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {createPlaceCategories.length}
                </span>
              </div>

              <CreateCatalogPlaceForm categories={createPlaceCategories} />
            </div>
          ) : null}

          {activeSection === "claims" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Ожидают проверки:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {pendingClaimsCount}
                </span>
              </div>

              {pendingClaims.length ? (
                <div className="grid gap-4">
                  {pendingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="rounded-2xl border bg-muted/10 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Заявка от {formatDate(claim.createdAt)}
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
                              {claim.company.bin
                                ? `БИН: ${claim.company.bin}`
                                : "БИН не указан"}
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
                <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                  Сейчас нет заявок, ожидающих проверки.
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "unclaimed-places" ? (
            <div className="mt-6">
              <div className="mb-4 inline-flex rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего без владельца:{" "}
                <span className="ml-1 font-medium text-foreground">
                  {unclaimedPlacesCount}
                </span>
              </div>

              {recentUnclaimedPlaces.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
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
                            Создано: {formatDate(place.createdAt)}
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
                <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
                  Пока нет карточек без владельца.
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function AdminMenuCard({
  icon,
  title,
  desc,
  href,
  active,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={[
        "block min-h-[132px] rounded-2xl border bg-background p-5 transition",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/20",
        active ? "border-primary bg-primary/5" : "",
      ].join(" ")}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/20 text-primary">
          {icon}
        </div>

        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  section,
  page,
  totalPages,
  totalItems,
  pageSize,
}: {
  section: "users" | "companies";
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);

  const pages = [];
  for (let i = from; i <= to; i += 1) {
    pages.push(i);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Показаны {startItem}-{endItem} из {totalItems}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildAdminHref(section, page - 1)}
            scroll={false}
            className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
          >
            Назад
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-sm text-muted-foreground opacity-60">
            Назад
          </span>
        )}

        {pages.map((item) => (
          <Link
            key={item}
            scroll={false}
            href={buildAdminHref(section, item)}
            className={[
              "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition",
              item === page
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted/40",
            ].join(" ")}
          >
            {item}
          </Link>
        ))}

        {page < totalPages ? (
          <Link
            scroll={false}
            href={buildAdminHref(section, page + 1)}
            className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
          >
            Дальше
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-sm text-muted-foreground opacity-60">
            Дальше
          </span>
        )}
      </div>
    </div>
  );
}