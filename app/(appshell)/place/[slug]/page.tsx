import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  CornerDownRight,
  Globe,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import StarRating from "@/components/ui/StarRating";
import UserAvatar from "@/components/ui/UserAvatar";
import { formatReviewDate, formatReviewsCount } from "@/shared/format";
import ClaimPlaceButton from "@/features/places/components/claim-place-button";
import PlaceMiniMap from "@/features/places/components/place-mini-map";

export const runtime = "nodejs";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

const CLAIM_RETRY_COOLDOWN_SEC = 3 * 60 * 60;

type PlaceSeoData = {
  slug: string;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  avgRating: number;
  ratingCount: number;
  category: {
    name: string;
  };
};

type PlaceStructuredDataInput = {
  slug: string;
  name: string;
  city: string;
  address: string | null;
  description: string | null;
  avgRating: number;
  ratingCount: number;
  lat: number | null;
  lng: number | null;
  category: {
    name: string;
  };
};

function trimSeoDescription(input: string, max = 170) {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

function buildPlaceTitle(place: Pick<PlaceSeoData, "name" | "city">) {
  return `${place.name} — отзывы и рейтинг${place.city ? `, ${place.city}` : ""}`;
}

function buildPlaceDescription(
  place: Pick<
    PlaceSeoData,
    | "name"
    | "city"
    | "address"
    | "description"
    | "avgRating"
    | "ratingCount"
    | "category"
  >,
) {
  const location = [place.city, place.address].filter(Boolean).join(", ");

  const ratingPart =
    place.ratingCount > 0
      ? `Рейтинг ${Number(place.avgRating).toFixed(2)} из 5 на основе ${place.ratingCount} отзывов.`
      : "Пока без отзывов.";

  const raw = place.description?.trim()
    ? `${place.name} — ${place.category.name}${location ? `, ${location}` : ""}. ${place.description.trim()} ${ratingPart} Смотрите карточку места на Clarify.`
    : `${place.name} — ${place.category.name}${location ? `, ${location}` : ""}. ${ratingPart} Смотрите карточку места на Clarify.`;

  return trimSeoDescription(raw.replace(/\s+/g, " ").trim());
}

async function getPlaceSeoData(slug: string): Promise<PlaceSeoData | null> {
  return prisma.place.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      city: true,
      address: true,
      description: true,
      avgRating: true,
      ratingCount: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });
}

function resolveStructuredDataOrigin() {
  const raw = process.env.APP_ORIGIN?.trim();

  if (!raw) return "https://www.clarify.kz";

  try {
    return new URL(raw).origin;
  } catch {
    return "https://www.clarify.kz";
  }
}

function buildPlaceJsonLd(place: PlaceStructuredDataInput) {
  const origin = resolveStructuredDataOrigin();
  const description =
    place.description?.trim() ||
    `${place.name} — ${place.category.name} в ${place.city}.`;

  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.name,
    description,
    url: `${origin}/place/${place.slug}`,
    ...(place.address || place.city
      ? {
          address: {
            "@type": "PostalAddress",
            ...(place.address ? { streetAddress: place.address } : {}),
            ...(place.city ? { addressLocality: place.city } : {}),
            addressCountry: "KZ",
          },
        }
      : {}),
    ...(typeof place.lat === "number" && typeof place.lng === "number"
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: place.lat,
            longitude: place.lng,
          },
        }
      : {}),
    ...(place.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(place.avgRating.toFixed(2)),
            reviewCount: place.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

function getAuthorLabel(author: {
  nickname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const nick = author?.nickname ?? "";
  const fullName = [author?.firstName, author?.lastName]
    .filter(Boolean)
    .join(" ");

  return nick || fullName || "Пользователь";
}

function formatDurationFromSeconds(totalSec: number) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} мин ${seconds} с` : `${minutes} мин`;
  }

  return `${seconds} с`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return {
      title: "Место не найдено",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const place = await getPlaceSeoData(slug);

  if (!place) {
    return {
      title: "Место не найдено",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = buildPlaceTitle(place);
  const description = buildPlaceDescription(place);
  const canonical = `/place/${place.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "ru_RU",
      siteName: "Clarify",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug) return notFound();

  const place = await prisma.place.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: {
            select: {
              nickname: true,
              firstName: true,
              lastName: true,
            },
          },
          tags: { include: { tag: true } },
          replies: {
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
      },
    },
  });

  if (!place) return notFound();

  // index 0 -> 1 звезда, index 4 -> 5 звёзд
  let ratingDistribution = [0, 0, 0, 0, 0];
  try {
    const grouped = await prisma.review.groupBy({
      by: ["rating"],
      where: { placeId: place.id, status: "PUBLISHED" },
      _count: { _all: true },
    });

    ratingDistribution = [1, 2, 3, 4, 5].map(
      (value) => grouped.find((row) => row.rating === value)?._count._all ?? 0,
    );
  } catch (err) {
    console.error("PlacePage: rating distribution failed:", err);
  }

  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("PlacePage: getSessionUser failed:", err);
    sessionUser = null;
  }

  let myCompany: {
    id: string;
    name: string;
  } | null = null;

  let isOwnerBranch = false;
  let myClaimStatus: ClaimStatus | null = null;
  let myClaimRetryAfterSec = 0;

  if (sessionUser?.role === "COMPANY") {
    try {
      myCompany = await prisma.company.findUnique({
        where: { ownerId: sessionUser.id },
        select: { id: true, name: true },
      });

      isOwnerBranch = Boolean(
        myCompany?.id && place.companyId && place.companyId === myCompany.id,
      );

      if (myCompany?.id && !place.companyId) {
        const claims = await prisma.claim.findMany({
          where: {
            placeId: place.id,
            companyId: myCompany.id,
          },
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            createdAt: true,
          },
        });

        const hasPending = claims.some((item) => item.status === "PENDING");
        const hasApproved = claims.some((item) => item.status === "APPROVED");
        const latestRejected =
          claims.find((item) => item.status === "REJECTED") ?? null;

        if (hasPending) {
          myClaimStatus = "PENDING";
        } else if (hasApproved) {
          myClaimStatus = "APPROVED";
        } else if (latestRejected) {
          myClaimStatus = "REJECTED";

          const retryAfterSec =
            CLAIM_RETRY_COOLDOWN_SEC -
            Math.floor(
              (Date.now() - latestRejected.createdAt.getTime()) / 1000,
            );

          myClaimRetryAfterSec = Math.max(0, retryAfterSec);
        }
      }
    } catch (err) {
      console.error("PlacePage: company/claim lookup failed:", err);
      myCompany = null;
      isOwnerBranch = false;
      myClaimStatus = null;
      myClaimRetryAfterSec = 0;
    }
  }

  let hasUserReview = false;

  if (sessionUser?.role === "USER") {
    try {
      const existingReview = await prisma.review.findFirst({
        where: {
          placeId: place.id,
          authorId: sessionUser.id,
        },
        select: { id: true },
      });

      hasUserReview = Boolean(existingReview);
    } catch (err) {
      console.error("PlacePage: review lookup failed:", err);
      hasUserReview = false;
    }
  }

  const nextUrl = `/place/${place.slug}/review`;
  const isCatalogCard = !place.companyId;
  const isManagedCard = Boolean(place.companyId);

  const placeJsonLd = buildPlaceJsonLd({
    slug: place.slug,
    name: place.name,
    city: place.city,
    address: place.address,
    description: place.description,
    avgRating: Number(place.avgRating),
    ratingCount: place.ratingCount,
    lat: typeof place.lat === "number" ? place.lat : null,
    lng: typeof place.lng === "number" ? place.lng : null,
    category: {
      name: place.category.name,
    },
  });

  const ratingTotal = ratingDistribution.reduce((sum, n) => sum + n, 0);
  const safeWebsite = normalizeWebsite(place.website);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(placeJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к поиску
        </Link>

        <section className="clarify-hero relative mt-4 overflow-hidden px-6 py-7 md:px-8 md:py-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="clarify-badge-premium">
                  {place.category.name}
                </span>

                {isManagedCard ? (
                  <span className="clarify-badge border-success-border bg-success-soft text-success-text">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Управляется компанией
                  </span>
                ) : (
                  <span className="clarify-badge">
                    Компания не подтвердила карточку
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {place.name}
              </h1>

              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground md:text-base">
                <MetaItem icon={<MapPin className="h-4 w-4" />}>
                  {[place.city, place.address].filter(Boolean).join(", ")}
                </MetaItem>

                {place.workHours ? (
                  <MetaItem icon={<Clock className="h-4 w-4" />}>
                    {place.workHours}
                  </MetaItem>
                ) : null}

                {place.phone ? (
                  <MetaItem icon={<Phone className="h-4 w-4" />}>
                    <a
                      href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}
                      className="transition hover:text-foreground hover:underline"
                    >
                      {place.phone}
                    </a>
                  </MetaItem>
                ) : null}

                {safeWebsite ? (
                  <MetaItem icon={<Globe className="h-4 w-4" />}>
                    <a
                      href={safeWebsite}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="break-all transition hover:text-foreground hover:underline"
                    >
                      {safeWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </MetaItem>
                ) : null}
              </ul>

              {place.description ? (
                <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-foreground/90 md:text-base">
                  {place.description}
                </p>
              ) : null}
            </div>

            <div className="clarify-card-elevated w-full p-5 lg:w-72">
              {place.ratingCount > 0 ? (
                <>
                  <div className="flex items-end gap-3">
                    <div className="text-5xl font-semibold leading-none tracking-tight">
                      {place.avgRating.toFixed(1)}
                    </div>
                    <div className="pb-1">
                      <StarRating value={place.avgRating} size="md" />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatReviewsCount(place.ratingCount)}
                      </div>
                    </div>
                  </div>

                  {ratingTotal > 0 ? (
                    <div className="mt-4 grid gap-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingDistribution[star - 1];
                        const percent = Math.round((count / ratingTotal) * 100);

                        return (
                          <div
                            key={star}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="w-3 text-right tabular-nums">
                              {star}
                            </span>
                            <div
                              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                              aria-hidden
                            >
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="w-8 text-right tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <div className="text-base font-semibold text-foreground">
                    Пока нет оценок
                  </div>
                  <div className="mt-1">
                    Оставьте первый отзыв и помогите другим сделать выбор.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-6">
            {sessionUser?.role === "USER" ? (
              hasUserReview ? (
                <InfoBox>Вы уже оставляли отзыв этому месту.</InfoBox>
              ) : (
                <Link
                  href={nextUrl}
                  className="clarify-button-primary w-full sm:w-auto"
                >
                  <PenLine className="h-4 w-4" />
                  Оставить отзыв
                </Link>
              )
            ) : sessionUser?.role === "COMPANY" && isOwnerBranch ? (
              <InfoBox title="Это филиал вашей компании">
                Компании не оставляют отзывы. Вы можете отвечать на отзывы
                пользователей в кабинете компании.
                <div className="mt-3">
                  <Link
                    href="/company"
                    className="clarify-button-secondary-sm"
                  >
                    Перейти в кабинет компании
                  </Link>
                </div>
              </InfoBox>
            ) : sessionUser?.role === "COMPANY" && isCatalogCard ? (
              <div className="grid gap-3">
                <InfoBox title="Вы можете заявить права на карточку">
                  Если это ваш бизнес, отправьте заявку на привязку карточки к
                  вашей компании. После проверки управление можно будет получить
                  через кабинет компании.
                </InfoBox>

                {myClaimStatus === "PENDING" ? (
                  <InfoBox title="Заявка уже отправлена" tone="primary">
                    Ваша заявка сейчас находится на проверке администратора.
                  </InfoBox>
                ) : null}

                {myClaimStatus === "REJECTED" ? (
                  <InfoBox title="Прошлая заявка была отклонена">
                    {myClaimRetryAfterSec > 0
                      ? `Повторную заявку можно отправить через ${formatDurationFromSeconds(
                          myClaimRetryAfterSec,
                        )}.`
                      : "Вы можете отправить новую заявку, если данные были уточнены или если это действительно карточка вашего бизнеса."}
                  </InfoBox>
                ) : null}

                {myCompany ? (
                  <ClaimPlaceButton
                    placeId={place.id}
                    status={myClaimStatus}
                    retryAfterSec={myClaimRetryAfterSec}
                  />
                ) : (
                  <InfoBox title="Сначала завершите регистрацию компании">
                    Для подачи заявки на управление карточкой нужен созданный
                    аккаунт компании.
                    <div className="mt-3">
                      <Link
                        href="/business/signup"
                        className="clarify-button-secondary-sm"
                      >
                        Регистрация компании
                      </Link>
                    </div>
                  </InfoBox>
                )}
              </div>
            ) : sessionUser?.role === "COMPANY" ? (
              <InfoBox>Компании не могут оставлять отзывы.</InfoBox>
            ) : sessionUser?.role === "ADMIN" ? (
              <InfoBox>Администратор не оставляет отзывы.</InfoBox>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(nextUrl)}`}
                className="clarify-button-primary w-full sm:w-auto"
              >
                Войти, чтобы оставить отзыв
              </Link>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <section aria-labelledby="reviews-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="reviews-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Отзывы
              </h2>
              {place.reviews.length > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {place.reviews.length < place.ratingCount
                    ? `Показаны последние ${place.reviews.length} из ${place.ratingCount}`
                    : formatReviewsCount(place.reviews.length)}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4">
              {place.reviews.map((review) => {
                const label = getAuthorLabel(review.author ?? {});

                return (
                  <article key={review.id} className="clarify-card p-5">
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        user={review.author ?? {}}
                        size="sm"
                        className="shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="truncate text-sm font-semibold">
                            {label}
                          </div>
                          <StarRating value={review.rating} size="sm" />
                        </div>
                        <time
                          dateTime={review.createdAt.toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {formatReviewDate(review.createdAt)}
                        </time>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 md:text-base">
                      {review.text}
                    </p>

                    {review.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.tags.map((tag) => (
                          <span
                            key={tag.tagId}
                            className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
                          >
                            {tag.tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {review.replies.length > 0 ? (
                      <div className="mt-4 grid gap-2">
                        {review.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-[16px] border border-primary-soft-border bg-primary-soft p-4 text-sm"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium text-primary">
                              <CornerDownRight className="h-3.5 w-3.5" />
                              Ответ компании · {reply.company.name}
                            </div>
                            <div className="mt-2 whitespace-pre-wrap leading-6 text-foreground/90">
                              {reply.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {place.reviews.length === 0 ? (
                <div className="clarify-empty-state px-6 py-10">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-primary-soft-border bg-primary-soft text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-base font-semibold">
                    Пока нет отзывов
                  </div>
                  <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Станьте первым, кто поделится опытом об этом месте.
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {typeof place.lat === "number" && typeof place.lng === "number" ? (
            <aside className="lg:sticky lg:top-24">
              <PlaceMiniMap
                lat={place.lat}
                lng={place.lng}
                title={place.name}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}

function normalizeWebsite(raw: string | null) {
  const value = raw?.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function MetaItem({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function InfoBox({
  title,
  tone = "neutral",
  children,
}: {
  title?: string;
  tone?: "neutral" | "primary";
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-[16px] border p-4 text-sm text-muted-foreground",
        tone === "primary"
          ? "border-primary-soft-border bg-primary-soft"
          : "bg-muted/40",
      ].join(" ")}
    >
      {title ? (
        <div className="font-medium text-foreground">{title}</div>
      ) : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
