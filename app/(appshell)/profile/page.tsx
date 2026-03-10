import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import ProfileEditForm from "@/features/profile/components/profile-edit-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TabKey = "main" | "security" | "reviews" | "notifications";

const TABS: { key: TabKey; label: string }[] = [
  { key: "main", label: "Основное" },
  { key: "security", label: "Безопасность" },
  { key: "reviews", label: "Мои отзывы" },
  { key: "notifications", label: "Уведомления" },
];

function normalizeTab(v: string | null | undefined): TabKey {
  const s = (v ?? "main").toLowerCase();
  if (s === "security") return "security";
  if (s === "reviews") return "reviews";
  if (s === "notifications") return "notifications";
  return "main";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
}

function getReviewStatusLabel(status: string) {
  if (status === "PENDING") return "На модерации";
  if (status === "REJECTED") return "Отклонён";
  return "Опубликован";
}

function getReviewStatusClass(status: string) {
  if (status === "PENDING") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  }
  if (status === "REJECTED") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "USER") redirect("/");

  const [user, myReviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        profileEditCount: true,
        emailVerifiedAt: true,
      },
    }),

    prisma.review.findMany({
      where: { authorId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            address: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!user) redirect("/login");

  const locked = user.profileEditCount >= 1;

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tab = normalizeTab(sp?.tab);

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.nickname ||
    "Пользователь";

  const createdAt = formatDate(user.createdAt);
  const emailVerified = Boolean(user.emailVerifiedAt);

  const initial = {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    nickname: user.nickname ?? "",
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Управление данными аккаунта и безопасностью
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
            locked
              ? "border-muted bg-muted/40 text-muted-foreground"
              : "border-primary bg-primary text-primary-foreground",
          ].join(" ")}
          title="Основные данные профиля можно изменить только один раз"
        >
          <span
            className={[
              "inline-flex h-2 w-2 rounded-full",
              locked ? "bg-muted-foreground/50" : "bg-emerald-500",
            ].join(" ")}
          />
          {locked ? "Основное: недоступно" : "Основное: доступно 1 раз"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={user.avatarUrl || "/avatar-placeholder.png"}
                alt="avatar"
                width={96}
                height={96}
                className="h-24 w-24 rounded-2xl border object-cover"
              />
              <div className="mt-2 text-center text-xs text-muted-foreground">
                Аватар
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">{fullName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                @{user.nickname ?? "—"}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {emailVerified ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    Email подтверждён
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/50" />
                    Email не подтверждён
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border bg-background p-4">
              <div className="grid gap-2 text-sm">
                <InfoRow label="Телефон" value={user.phone ?? "—"} />
                <InfoRow label="Email" value={user.email} />
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-4">
              <InfoRow label="Аккаунт создан" value={createdAt} />
            </div>

            <div className="rounded-2xl bg-muted/20 p-4">
              <div className="text-sm font-medium">Ограничение</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Основные данные профиля можно изменить только один раз.
                Безопасность и остальные вкладки доступны всегда.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Link
                  key={t.key}
                  href={`/profile?tab=${t.key}`}
                  className={[
                    "inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/40",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-5">
            {tab === "main" ? (
              <ProfileEditForm tab="main" locked={locked} initial={initial} />
            ) : tab === "security" ? (
              <ProfileEditForm tab="security" locked={false} initial={initial} />
            ) : tab === "reviews" ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Всего отзывов:{" "}
                  <span className="font-medium text-foreground">
                    {myReviews.length}
                  </span>
                </div>

                {myReviews.length === 0 ? (
                  <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                    Вы пока не оставляли отзывов.
                  </div>
                ) : (
                  myReviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border bg-background p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/place/${review.place.slug}`}
                            className="text-base font-semibold hover:underline"
                          >
                            {review.place.name}
                          </Link>

                          <div className="mt-1 text-sm text-muted-foreground">
                            {review.place.city}
                            {review.place.address
                              ? ` • ${review.place.address}`
                              : ""}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {review.rating}/5
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                            getReviewStatusClass(review.status),
                          ].join(" ")}
                        >
                          {getReviewStatusLabel(review.status)}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm">
                        {review.text}
                      </p>

                      {review.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="rounded-full border px-2 py-1 text-xs"
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {review.replies.length > 0 ? (
                        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
                          <div className="font-medium">Ответ компании:</div>

                          <div className="mt-2 grid gap-3">
                            {review.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="text-xs text-muted-foreground">
                                  {reply.company.name}
                                </div>
                                <div className="mt-1 whitespace-pre-wrap">
                                  {reply.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <Link
                          href={`/place/${review.place.slug}`}
                          className="text-sm font-medium underline underline-offset-4"
                        >
                          Открыть место
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                Здесь будут уведомления (скоро).
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="max-w-[70%] truncate font-medium">{value}</div>
    </div>
  );
}