import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import ReviewForm from "@/features/reviews/components/review-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AddReviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  if (!slug) return notFound();

  // session: безопасно, чтобы сбой БД не ронял страницу
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("AddReviewPage: getSessionUser failed:", err);
    user = null;
  }

  const nextUrl = `/place/${slug}/review`;

  // ✅ Только залогиненный USER может оставлять отзывы
  if (!user) {
    // ✅ логичнее: login (там же есть verify-flow для unverified)
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }
  if (user.role !== "USER") {
    redirect(`/place/${slug}`); // COMPANY/ADMIN — возвращаем на филиал
  }

  const place = await prisma.place.findUnique({ where: { slug } });
  if (!place) return notFound();

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href={`/place/${place.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Назад к месту
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Отзыв: {place.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Пиши по делу: что понравилось, что не понравилось, почему.
      </p>

      <div className="mt-6 rounded-xl border p-5">
        <ReviewForm placeSlug={place.slug} tags={tags} />
      </div>
    </main>
  );
}