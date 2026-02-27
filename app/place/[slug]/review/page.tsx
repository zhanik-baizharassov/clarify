import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import ReviewForm from "./review-form";

export default async function AddReviewPage({
  params,
}: {
  params: Promise<{ slug?: string }>;
}) {
  const { slug } = await params;
  if (!slug) return notFound();

  const user = await getSessionUser();

  // ✅ Только залогиненный USER может оставлять отзывы
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/place/${slug}/review`)}`);
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
