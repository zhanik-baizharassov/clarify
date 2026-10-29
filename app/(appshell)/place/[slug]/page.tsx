import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
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
import Breadcrumbs, {
  breadcrumbJsonLd,
} from "@/features/places/components/Breadcrumbs";
import PlaceListCard from "@/features/places/components/PlaceListCard";
import { getRelatedPlaces } from "@/server/catalog/queries";
import {
  KZ_CITIES,
  KZ_CITY_META,
  cityPath,
  type KzCity,
} from "@/shared/kz/kz";

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
  phone: string | null;
  website: string | null;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    createdAt: Date;
  }>;
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
    "@type": "LocalBusiness",
    "@id": `${origin}/place/${place.slug}#place`,
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
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(place.website ? { sameAs: [place.website] } : {}),
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
    ...(place.reviews.length > 0
      ? {
          review: place.reviews.slice(0, 5).map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.author },
            datePublished: review.createdAt.toISOString().slice(0, 10),
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
            reviewBody: review.text.slice(0, 500),
          })),
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
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
      title,
      description,
      url: canonical,
      type: "website",
      locale: "ru_RU",
      siteName: "Clarify",
    },
    twitter: {
      card: "summary_large_image",
      images: ["/opengraph-image.png"],
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

type CompanyState = {
  myCompany: { id: string; name: string } | null;
  isOwnerBranch: boolean;
  myClaimStatus: ClaimStatus | null;
  myClaimRetryAfterSec: number;
};

const EMPTY_COMPANY_STATE: CompanyState = {
  myCompany: null,
  isOwnerBranch: false,
  myClaimStatus: null,
  myClaimRetryAfterSec: 0,
};

async function loadSessionUser() {
  try {
    return await getSessionUser();
  } catch (err) {
    console.error("PlacePage: getSessionUser failed:", err);
    return null;
  }
}

// index 0 -> 1 звезда, index 4 -> 5 звёзд
async function loadRatingDistribution(placeId: string) {
  try {
    const grouped = await prisma.review.groupBy({
      by: ["rating"],
      where: { placeId, status: "PUBLISHED" },
      _count: { _all: true },
    });

    return [1, 2, 3, 4, 5].map(
      (value) => grouped.find((row) => row.rating === value)?._count._all ?? 0,
    );
  } catch (err) {
    console.error("PlacePage: rating distribution failed:", err);
    return [0, 0, 0, 0, 0];
  }
}

async function loadHasUserReview(placeId: string, authorId: string) {
  try {
    const existingReview = await prisma.review.findFirst({
      where: { placeId, authorId },
      select: { id: true },
    });

    return Boolean(existingReview);
  } catch (err) {
    console.error("PlacePage: review lookup failed:", err);
    return false;
  }
}

async function loadCompanyState(
  ownerId: string,
  place: { id: string; companyId: string | null },
): Promise<CompanyState> {
  try {
    const myCompany = await prisma.company.findUnique({
      where: { ownerId },
      select: { id: true, name: true },
    });

    const isOwnerBranch = Boolean(
      myCompany?.id && place.companyId && place.companyId === myCompany.id,
    );

    let myClaimStatus: ClaimStatus | null = null;
    let myClaimRetryAfterSec = 0;

    if (myCompany?.id && !place.companyId) {
      const claims = await prisma.claim.findMany({
        where: { placeId: place.id, companyId: myCompany.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true },
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
          Math.floor((Date.now() - latestRejected.createdAt.getTime()) / 1000);

        myClaimRetryAfterSec = Math.max(0, retryAfterSec);
      }
    }

    return { myCompany, isOwnerBranch, myClaimStatus, myClaimRetryAfterSec };
  } catch (err) {
    console.error("PlacePage: company/claim lookup failed:", err);
    return EMPTY_COMPANY_STATE;
  }
}

const REVIEWS_PAGE_SIZE = 50;
const REVIEWS_MAX = 500;

function parseReviewsLimit(raw: string | string[] | undefined) {
  const value = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""), 10);

  if (!Number.isFinite(value) || value < REVIEWS_PAGE_SIZE) {
    return REVIEWS_PAGE_SIZE;
  }

  return Math.min(value, REVIEWS_MAX);
}

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviews?: string | string[] }>;
}) {
  const { slug } = await params;

  if (!slug) return notFound();

  const reviewsLimit = parseReviewsLimit((await searchParams).reviews);

  const [place, sessionUser] = await Promise.all([
    prisma.place.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          // +1 — чтобы понять, есть ли ещё отзывы для «Показать ещё»
          take: reviewsLimit + 1,
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
    }),
    loadSessionUser(),
  ]);

  if (!place) return notFound();

  const hasMoreReviews = place.reviews.length > reviewsLimit;
  if (hasMoreReviews) {
    place.reviews = place.reviews.slice(0, reviewsLimit);
  }

  const [ratingDistribution, companyState, hasUserReview, relatedPlaces] =
    await Promise.all([
    loadRatingDistribution(place.id),
    sessionUser?.role === "COMPANY"
      ? loadCompanyState(sessionUser.id, place)
      : Promise.resolve(EMPTY_COMPANY_STATE),
    sessionUser?.role === "USER"
      ? loadHasUserReview(place.id, sessionUser.id)
      : Promise.resolve(false),
    getRelatedPlaces({
      placeId: place.id,
      city: place.city,
      categoryId: place.categoryId,
    }).catch(() => []),
  ]);

  const { myCompany, isOwnerBranch, myClaimStatus, myClaimRetryAfterSec } =
    companyState;

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
    phone: place.phone,
    website: normalizeWebsite(place.website),
    reviews: place.reviews.map((review) => ({
      author: getAuthorLabel(review.author ?? {}),
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt,
    })),
    category: {
      name: place.category.name,
    },
  });

  const isKnownCity = (KZ_CITIES as readonly string[]).includes(place.city);
  const crumbs = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
    ...(isKnownCity
      ? [
          { label: place.city, href: cityPath(place.city as KzCity) },
          // Страница категории города открывается только для активных категорий.
          ...(place.category.isActive
            ? [
                {
                  label: place.category.name,
                  href: `${cityPath(place.city as KzCity)}/${place.category.slug}`,
                },
              ]
            : []),
        ]
      : []),
    { label: place.name },
  ];
  const breadcrumbLd = breadcrumbJsonLd(resolveStructuredDataOrigin(), crumbs);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

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
                      {safeWebsite
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
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
                  <Link href="/company" className="clarify-button-secondary-sm">
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
                  {hasMoreReviews
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

              {hasMoreReviews && reviewsLimit < REVIEWS_MAX ? (
                <div className="text-center">
                  <Link
                    href={`/place/${place.slug}?reviews=${reviewsLimit + REVIEWS_PAGE_SIZE}#reviews-heading`}
                    scroll={false}
                    className="clarify-button-secondary-sm"
                  >
                    Показать ещё
                  </Link>
                </div>
              ) : null}

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
              />
            </aside>
          ) : null}
        </div>

        {relatedPlaces.length > 0 ? (
          <section aria-labelledby="related-heading" className="mt-14">
            <h2 id="related-heading" className="text-xl font-semibold">
              {place.category.name}
              {isKnownCity
                ? ` ${KZ_CITY_META[place.city as KzCity].locative}`
                : ""}
              : другие места
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {relatedPlaces.map((related) => (
                <PlaceListCard key={related.slug} place={related} />
              ))}
            </div>
          </section>
        ) : null}
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
