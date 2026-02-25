import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug?: string }>;
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
          tags: { include: { tag: true } },
          replies: { include: { company: true } },
        },
      },
    },
  });

  if (!place) return notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
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
              <p className="mt-3 whitespace-pre-wrap text-sm">{place.description}</p>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">{place.avgRating.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{place.ratingCount} отзывов</div>
          </div>
        </div>

        <div className="mt-4">
          <Link
            href={`/place/${place.slug}/review`}
            className="inline-flex h-10 items-center rounded-md bg-black px-4 text-white"
          >
            Оставить отзыв
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Отзывы</h2>

      <div className="mt-3 grid gap-3">
        {place.reviews.map((r) => (
          <div key={r.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.authorName ?? "Аноним"}</div>
              <div className="text-sm font-semibold">{r.rating}/5</div>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm">{r.text}</p>

            {r.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <span key={t.tagId} className="rounded-full border px-2 py-1 text-xs">
                    {t.tag.name}
                  </span>
                ))}
              </div>
            ) : null}

            {r.replies.length > 0 ? (
              <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                <div className="font-medium">Ответ компании:</div>
                {r.replies.map((rep) => (
                  <div key={rep.id} className="mt-2">
                    <div className="text-xs text-muted-foreground">{rep.company.name}</div>
                    <div className="whitespace-pre-wrap">{rep.text}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {place.reviews.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Пока нет отзывов. Будь первым 🙂
          </div>
        )}
      </div>
    </main>
  );
}