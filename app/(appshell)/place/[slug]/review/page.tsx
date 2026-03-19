import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PencilLine, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import ReviewForm from "@/features/reviews/components/review-form";

export const runtime = "nodejs";

export default async function AddReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) return notFound();

  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("AddReviewPage: getSessionUser failed:", err);
    user = null;
  }

  const nextUrl = `/place/${slug}/review`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }
  if (user.role !== "USER") {
    redirect(`/place/${slug}`);
  }

  const place = await prisma.place.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!place) return notFound();

  const existingReview = await prisma.review.findUnique({
    where: {
      placeId_authorId: {
        placeId: place.id,
        authorId: user.id,
      },
    },
    select: {
      id: true,
      rating: true,
      createdAt: true,
    },
  });

  if (existingReview) {
    const dtf = new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
    });

    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href={`/place/${place.slug}`}
          className="text-sm text-muted-foreground transition hover:text-foreground hover:underline"
        >
          ← Назад к месту
        </Link>

        <section className="mt-6 rounded-3xl border bg-background p-6 md:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Вы уже оставляли отзыв
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Для места <span className="font-medium text-foreground">{place.name}</span>{" "}
            у вас уже есть опубликованный отзыв. Повторно отправить новый отзыв
            для этого же места нельзя.
          </p>

          <div className="mt-5 rounded-2xl border bg-muted/20 p-4 text-sm">
            <div>
              <span className="text-muted-foreground">Оценка:</span>{" "}
              <span className="font-medium">{existingReview.rating}/5</span>
            </div>
            <div className="mt-1">
              <span className="text-muted-foreground">Дата:</span>{" "}
              <span className="font-medium">
                {dtf.format(existingReview.createdAt)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/place/${place.slug}`}
              className="inline-flex items-center rounded-xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40"
            >
              Вернуться к месту
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link
        href={`/place/${place.slug}`}
        className="text-sm text-muted-foreground transition hover:text-foreground hover:underline"
      >
        ← Назад к месту
      </Link>

      <section className="mt-4 rounded-3xl border bg-muted/20 p-6 md:p-8">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Оставьте отзыв о {place.name}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Помогите другим пользователям принять решение. Расскажите коротко,
          честно и конкретно о своём опыте.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <InfoPill
            icon={<PencilLine className="h-4 w-4" />}
            title="Пишите по делу"
            desc="Лучше конкретика, чем общие слова."
          />
          <InfoPill
            icon={<Star className="h-4 w-4" />}
            title="Оцените честно"
            desc="Выберите реальную общую оценку."
          />
          <InfoPill
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Без спама"
            desc="Отзыв должен быть полезным и корректным."
          />
        </div>
      </section>

      <section className="mt-8 rounded-3xl border bg-background p-6 md:p-7">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Форма отзыва</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Чем точнее отзыв, тем полезнее он для других посетителей и для самой компании.
          </p>
        </div>

        <ReviewForm placeSlug={place.slug} tags={tags} />
      </section>
    </main>
  );
}

function InfoPill({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
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