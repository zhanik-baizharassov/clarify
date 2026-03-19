import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(placeJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href="/explore"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Назад к поиску
        </Link>

        <div className="mt-4 rounded-xl border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{place.name}</h1>

              <div className="mt-1 text-sm text-muted-foreground">
                {place.category.name} • {place.city}
                {place.address ? ` • ${place.address}` : ""}
              </div>

              {place.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {place.description}
                </p>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold">
                {place.avgRating.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {place.ratingCount} отзывов
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-muted/20 p-4 text-sm">
            {isManagedCard ? (
              <>
                <div className="font-medium">Карточка управляется компанией</div>
                <div className="mt-1 text-muted-foreground">
                  У этой карточки уже есть привязанная компания, которая может
                  отвечать на отзывы через кабинет.
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">
                  Компания пока не подтвердила управление карточкой
                </div>
                <div className="mt-1 text-muted-foreground">
                  Карточка существует в каталоге, но официальный представитель
                  бизнеса ещё не заявил права на неё.
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            {sessionUser?.role === "USER" ? (
              hasUserReview ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Вы уже оставляли отзыв этому месту.
                </div>
              ) : (
                <Link
                  href={nextUrl}
                  className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  Оставить отзыв
                </Link>
              )
            ) : sessionUser?.role === "COMPANY" && isOwnerBranch ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="font-medium">Это филиал вашей компании</div>
                <div className="mt-1 text-muted-foreground">
                  Компании не оставляют отзывы. Вы можете отвечать на отзывы
                  пользователей в кабинете компании.
                </div>
                <div className="mt-3">
                  <Link
                    href="/company"
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Перейти в кабинет компании
                  </Link>
                </div>
              </div>
            ) : sessionUser?.role === "COMPANY" && isCatalogCard ? (
              <div className="grid gap-3">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <div className="font-medium">
                    Вы можете заявить права на карточку
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Если это ваш бизнес, отправьте заявку на привязку карточки к
                    вашей компании. После проверки управление можно будет получить
                    через кабинет компании.
                  </div>
                </div>

                {myClaimStatus === "PENDING" ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                    <div className="font-medium">Заявка уже отправлена</div>
                    <div className="mt-1 text-muted-foreground">
                      Ваша заявка сейчас находится на проверке администратора.
                    </div>
                  </div>
                ) : null}

                {myClaimStatus === "REJECTED" ? (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="font-medium">
                      Прошлая заявка была отклонена
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {myClaimRetryAfterSec > 0
                        ? `Повторную заявку можно отправить через ${formatDurationFromSeconds(
                            myClaimRetryAfterSec,
                          )}.`
                        : "Вы можете отправить новую заявку, если данные были уточнены или если это действительно карточка вашего бизнеса."}
                    </div>
                  </div>
                ) : null}

                {myCompany ? (
                  <ClaimPlaceButton
                    placeId={place.id}
                    status={myClaimStatus}
                    retryAfterSec={myClaimRetryAfterSec}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="font-medium">
                      Сначала завершите регистрацию компании
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Для подачи заявки на управление карточкой нужен созданный
                      company account.
                    </div>
                    <div className="mt-3">
                      <Link
                        href="/business/signup"
                        className="inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition hover:bg-muted/30"
                      >
                        Регистрация компании
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : sessionUser?.role === "COMPANY" ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Компании не могут оставлять отзывы.
              </div>
            ) : sessionUser?.role === "ADMIN" ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Администратор не оставляет отзывы.
              </div>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(nextUrl)}`}
                className="inline-flex h-10 items-center rounded-md border px-4"
              >
                Войти, чтобы оставить отзыв
              </Link>
            )}
          </div>
        </div>

        {typeof place.lat === "number" && typeof place.lng === "number" ? (
          <PlaceMiniMap lat={place.lat} lng={place.lng} title={place.name} />
        ) : null}

        <h2 className="mt-8 text-lg font-semibold">Отзывы</h2>

        <div className="mt-3 grid gap-3">
          {place.reviews.map((review) => {
            const label = getAuthorLabel(review.author ?? {});

            return (
              <div key={review.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-sm font-semibold">{review.rating}/5</div>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm">{review.text}</p>

                {review.tags.length > 0 ? (
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

                {review.replies.length > 0 ? (
                  <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">Ответ компании:</div>
                    {review.replies.map((reply) => (
                      <div key={reply.id} className="mt-2">
                        <div className="text-xs text-muted-foreground">
                          {reply.company.name}
                        </div>
                        <div className="whitespace-pre-wrap">{reply.text}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {place.reviews.length === 0 ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">
              Пока нет отзывов. Будь первым 🙂
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}