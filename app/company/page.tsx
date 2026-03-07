import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Plus,
  Store,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import CreateBranchForm from "@/features/company/components/create-branch-form";
import ReplyForm from "@/features/reviews/components/reply-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompanyTab =
  | "dashboard"
  | "info"
  | "create-branch"
  | "branches"
  | "analytics";

type ReviewFilter = "answered" | "unanswered";

function authorLabel(a: {
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
}) {
  const nick = a.nickname ?? "";
  const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const nm = a.name ?? "";
  return nick || fullName || nm || "Пользователь";
}

function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CompanyPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string | string[];
    branch?: string | string[];
    city?: string | string[];
    reviewFilter?: string | string[];
  }>;
}) {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("CompanyPage: getSessionUser failed:", err);
    user = null;
  }

  if (!user) redirect("/login");
  if (user.role !== "COMPANY") redirect("/");

  const company = await prisma.company.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, bin: true, address: true },
  });

  if (!company) redirect("/business/signup");

  const dtf = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedTab = getSingleSearchParam(resolvedSearchParams.tab);
  const requestedBranchId = getSingleSearchParam(resolvedSearchParams.branch);
  const requestedCity = getSingleSearchParam(resolvedSearchParams.city);
  const requestedReviewFilter = getSingleSearchParam(
    resolvedSearchParams.reviewFilter,
  );

  const activeTab: CompanyTab =
    requestedTab === "info" ||
    requestedTab === "create-branch" ||
    requestedTab === "branches" ||
    requestedTab === "analytics" ||
    requestedTab === "dashboard"
      ? requestedTab
      : "dashboard";

  const activeReviewFilter: ReviewFilter | null =
    requestedReviewFilter === "answered" ||
    requestedReviewFilter === "unanswered"
      ? requestedReviewFilter
      : null;

  const [categories, branches, reviewCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),

    prisma.place.findMany({
      where: { companyId: company.id },
      orderBy: [{ city: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        phone: true,
        workHours: true,
        avgRating: true,
        ratingCount: true,
      },
    }),

    prisma.review.count({
      where: {
        status: "PUBLISHED",
        place: { companyId: company.id },
      },
    }),
  ]);

  const cityCounts = new Map<string, number>();
  for (const branch of branches) {
    cityCounts.set(branch.city, (cityCounts.get(branch.city) ?? 0) + 1);
  }

  const cities = Array.from(cityCounts.keys()).sort((a, b) =>
    a.localeCompare(b, "ru-RU"),
  );

  const activeCity =
    requestedCity && cities.includes(requestedCity)
      ? requestedCity
      : cities[0] ?? null;

  const branchesInActiveCity = activeCity
    ? branches.filter((branch) => branch.city === activeCity)
    : [];

  const activeBranch =
    requestedBranchId &&
    branchesInActiveCity.some((branch) => branch.id === requestedBranchId)
      ? branchesInActiveCity.find((branch) => branch.id === requestedBranchId) ??
        null
      : null;

  const [answeredCount, unansweredCount] = activeBranch
    ? await Promise.all([
        prisma.review.count({
          where: {
            status: "PUBLISHED",
            placeId: activeBranch.id,
            place: { companyId: company.id },
            replies: {
              some: { companyId: company.id },
            },
          },
        }),

        prisma.review.count({
          where: {
            status: "PUBLISHED",
            placeId: activeBranch.id,
            place: { companyId: company.id },
            replies: {
              none: { companyId: company.id },
            },
          },
        }),
      ])
    : [0, 0];

  const reviews =
    activeTab === "branches" && activeBranch && activeReviewFilter
      ? await prisma.review.findMany({
          where: {
            status: "PUBLISHED",
            placeId: activeBranch.id,
            place: { companyId: company.id },
            ...(activeReviewFilter === "answered"
              ? {
                  replies: {
                    some: { companyId: company.id },
                  },
                }
              : {
                  replies: {
                    none: { companyId: company.id },
                  },
                }),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            place: { select: { name: true, slug: true } },
            author: {
              select: {
                nickname: true,
                firstName: true,
                lastName: true,
                name: true,
              },
            },
            tags: { include: { tag: true } },
            replies: {
              orderBy: { createdAt: "asc" },
              include: { company: { select: { id: true, name: true } } },
            },
          },
        })
      : [];

  const defaultBranchesHref = activeCity
    ? `/company?tab=branches&city=${encodeURIComponent(activeCity)}`
    : "/company?tab=branches";

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Кабинет компании
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Выберите нужный раздел и управляйте компанией в более удобном формате.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TopStat label="Филиалов" value={String(branches.length)} />
          <TopStat label="Отзывы" value={String(reviewCount)} />
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          href="/company?tab=info"
          title="Информация о компании"
          description="Основные данные компании: БИН, телефон, email и адрес."
          icon={<Building2 className="h-5 w-5" />}
          badge="Данные"
          active={activeTab === "info"}
        />

        <DashboardCard
          href="/company?tab=create-branch"
          title="Создать филиал"
          description="Добавьте новую карточку места, чтобы начать собирать отзывы."
          icon={<Plus className="h-5 w-5" />}
          badge="Новое"
          active={activeTab === "create-branch"}
        />

        <DashboardCard
          href={defaultBranchesHref}
          title="Мои филиалы"
          description="Сначала выберите город, затем филиал и только потом тип отзывов."
          icon={<Store className="h-5 w-5" />}
          badge={`${branches.length}`}
          active={activeTab === "branches"}
        />

        <DashboardCard
          href="/company?tab=analytics"
          title="Бизнес-аналитика"
          description="Будущие платные инструменты: аналитика отзывов, тренды, отчёты и инсайты."
          icon={<BarChart3 className="h-5 w-5" />}
          badge="Pro"
          active={activeTab === "analytics"}
        />
      </section>

      {activeTab === "dashboard" ? (
        <section className="mt-8 rounded-3xl border bg-background p-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">Добро пожаловать в кабинет</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Теперь кабинет работает как панель управления: сначала вы выбираете
              раздел через карточки сверху, а затем работаете только с нужным
              блоком.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MiniInfoCard
              label="Компания"
              value={company.name}
              subvalue={company.bin ? `БИН: ${company.bin}` : "БИН не указан"}
            />
            <MiniInfoCard
              label="Филиалы"
              value={String(branches.length)}
              subvalue="Карточки мест компании"
            />
            <MiniInfoCard
              label="Отзывы"
              value={String(reviewCount)}
              subvalue="Опубликованные отзывы по филиалам"
            />
          </div>
        </section>
      ) : null}

      {activeTab === "info" ? (
        <section className="mt-8 rounded-3xl border bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Информация о компании</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Основные регистрационные и контактные данные компании.
              </p>
            </div>

            <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Компания
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Название компании" value={company.name} />
            <InfoCard label="БИН" value={company.bin ?? "—"} />
            <InfoCard label="Телефон" value={user.phone ?? "—"} />
            <InfoCard label="Email" value={user.email} />
            <InfoCard label="Адрес компании" value={company.address ?? "—"} />
          </div>
        </section>
      ) : null}

      {activeTab === "create-branch" ? (
        <section className="mt-8 rounded-3xl border bg-background p-6">
          <div>
            <h2 className="text-xl font-semibold">Создать филиал</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Заполните форму, чтобы добавить новую карточку места для отзывов.
            </p>
          </div>

          <CreateBranchForm categories={categories} />
        </section>
      ) : null}

      {activeTab === "branches" ? (
        <section className="mt-8 rounded-3xl border bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Мои филиалы</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Сначала выберите город, затем филиал. После этого выберите тип
                отзывов: отвеченные или неотвеченные.
              </p>
            </div>

            <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Всего филиалов:{" "}
              <span className="font-medium text-foreground">{branches.length}</span>
            </div>
          </div>

          {branches.length > 0 ? (
            <>
              <div className="mt-6">
                <div className="text-sm font-medium">Выберите город</div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {cities.map((city) => {
                    const isActive = activeCity === city;

                    return (
                      <Link
                        key={city}
                        href={`/company?tab=branches&city=${encodeURIComponent(city)}`}
                        className={[
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                          "hover:border-primary/40 hover:bg-muted/20",
                          isActive ? "border-primary bg-primary/5 text-primary" : "",
                        ].join(" ")}
                      >
                        <span>{city}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {cityCounts.get(city) ?? 0}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {activeCity ? (
                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Филиалы в городе {activeCity}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Выберите филиал, чтобы перейти к отзывам по нему.
                      </p>
                    </div>

                    <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                      В городе:{" "}
                      <span className="font-medium text-foreground">
                        {branchesInActiveCity.length}
                      </span>
                    </div>
                  </div>

                  {branchesInActiveCity.length > 0 ? (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      {branchesInActiveCity.map((branch) => {
                        const isActive = activeBranch?.id === branch.id;

                        return (
                          <div
                            key={branch.id}
                            className={[
                              "rounded-2xl border bg-background p-5 transition",
                              "hover:border-primary/40 hover:bg-muted/20",
                              isActive ? "border-primary bg-primary/5" : "",
                            ].join(" ")}
                          >
                            <Link
                              href={`/company?tab=branches&city=${encodeURIComponent(
                                branch.city,
                              )}&branch=${branch.id}`}
                              className="block"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-lg font-semibold">
                                      {branch.name}
                                    </div>
                                    {isActive ? (
                                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                        Выбран
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-2 text-sm text-muted-foreground">
                                    {branch.city}
                                    {branch.address ? ` • ${branch.address}` : ""}
                                  </div>

                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {branch.phone ? `☎ ${branch.phone}` : "☎ —"}
                                    {branch.workHours ? ` • ⏰ ${branch.workHours}` : ""}
                                  </div>

                                  <div className="mt-4 text-sm text-primary">
                                    {isActive
                                      ? "Теперь выберите тип отзывов ниже"
                                      : "Нажмите на карточку, чтобы выбрать этот филиал"}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <div className="text-lg font-semibold">
                                    {Number(branch.avgRating).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {branch.ratingCount} отзывов
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState text="В выбранном городе пока нет филиалов." />
                  )}
                </div>
              ) : null}

              {activeBranch ? (
                <div className="mt-8 border-t pt-8">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Выберите тип отзывов
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Сначала определите, какие отзывы хотите просмотреть по
                      выбранному филиалу.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/company?tab=branches&city=${encodeURIComponent(
                        activeBranch.city,
                      )}&branch=${activeBranch.id}&reviewFilter=unanswered`}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        "hover:border-primary/40 hover:bg-muted/20",
                        activeReviewFilter === "unanswered"
                          ? "border-primary bg-primary/5 text-primary"
                          : "",
                      ].join(" ")}
                    >
                      <span>Неотвеченные</span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {unansweredCount}
                      </span>
                    </Link>

                    <Link
                      href={`/company?tab=branches&city=${encodeURIComponent(
                        activeBranch.city,
                      )}&branch=${activeBranch.id}&reviewFilter=answered`}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        "hover:border-primary/40 hover:bg-muted/20",
                        activeReviewFilter === "answered"
                          ? "border-primary bg-primary/5 text-primary"
                          : "",
                      ].join(" ")}
                    >
                      <span>Отвеченные</span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {answeredCount}
                      </span>
                    </Link>
                  </div>

                  {!activeReviewFilter ? (
                    <div className="mt-6">
                      <EmptyState text="Выберите тип отзывов: отвеченные или неотвеченные." />
                    </div>
                  ) : (
                    <div className="mt-8">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {activeReviewFilter === "unanswered"
                            ? "Неотвеченные отзывы"
                            : "Отвеченные отзывы"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activeReviewFilter === "unanswered"
                            ? "Здесь показаны отзывы, на которые компания ещё не ответила."
                            : "Здесь показаны отзывы, на которые компания уже дала официальный ответ."}
                        </p>
                      </div>

                      <div className="mt-6 grid gap-4">
                        {reviews.map((review) => {
                          const alreadyReplied = review.replies.some(
                            (rep) => rep.companyId === company.id,
                          );
                          const dt = dtf.format(review.createdAt);

                          return (
                            <div key={review.id} className="rounded-2xl border p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/place/${review.place.slug}`}
                                    className="text-sm font-semibold hover:underline"
                                  >
                                    {review.place.name}
                                  </Link>

                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {authorLabel(review.author)} • {dt}
                                  </div>
                                </div>

                                <div className="shrink-0 text-sm font-semibold">
                                  {review.rating}/5
                                </div>
                              </div>

                              <p className="mt-3 whitespace-pre-wrap text-sm">
                                {review.text}
                              </p>

                              {review.tags.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {review.tags.map((tag) => (
                                    <span
                                      key={tag.tagId}
                                      className="rounded-full border px-2 py-1 text-xs"
                                    >
                                      {tag.tag.name}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {review.replies.length ? (
                                <div className="mt-4 rounded-xl bg-muted/30 p-4 text-sm">
                                  <div className="font-medium">Ответы компаний:</div>
                                  {review.replies.map((reply) => (
                                    <div key={reply.id} className="mt-3">
                                      <div className="text-xs text-muted-foreground">
                                        {reply.company.name}
                                      </div>
                                      <div className="whitespace-pre-wrap">
                                        {reply.text}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {!alreadyReplied ? (
                                <ReplyForm reviewId={review.id} />
                              ) : null}
                            </div>
                          );
                        })}

                        {reviews.length === 0 ? (
                          <EmptyState
                            text={
                              activeReviewFilter === "unanswered"
                                ? "У выбранного филиала пока нет неотвеченных отзывов."
                                : "У выбранного филиала пока нет отвеченных отзывов."
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-8">
                  <EmptyState text="Сначала выберите филиал, чтобы перейти к отзывам." />
                </div>
              )}
            </>
          ) : (
            <EmptyState text="У вас пока нет филиалов. Сначала создайте первый филиал через соответствующую карточку сверху." />
          )}
        </section>
      ) : null}

      {activeTab === "analytics" ? (
        <section className="mt-8 rounded-3xl border bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Бизнес-аналитика</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Здесь появятся будущие платные инструменты для компаний:
                аналитика отзывов, динамика рейтинга, отчёты по филиалам и другие
                полезные инсайты.
              </p>
            </div>

            <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
              Скоро
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MiniInfoCard
              label="Тренды по отзывам"
              value="—"
              subvalue="Будет доступно в платном тарифе"
            />
            <MiniInfoCard
              label="Сравнение филиалов"
              value="—"
              subvalue="Скоро появятся сравнительные отчёты"
            />
            <MiniInfoCard
              label="Рекомендации"
              value="—"
              subvalue="AI-подсказки для роста рейтинга"
            />
          </div>

          <div className="mt-6">
            <EmptyState text="Раздел в разработке. Пока здесь нет активных инструментов, но именно сюда в будущем будет вынесена платная бизнес-аналитика для компаний." />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DashboardCard({
  href,
  title,
  description,
  icon,
  badge,
  active,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group rounded-3xl border bg-background p-5 transition",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20",
        active ? "border-primary bg-primary/5" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/20">
          {icon}
        </div>

        <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
          {badge}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-base font-semibold">{title}</div>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
        Открыть раздел
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
      {label}: <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function MiniInfoCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{subvalue}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-base font-medium">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}