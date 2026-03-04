import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlacePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

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
              name: true,
              // email НЕ отдаём публично
            },
          },
          tags: { include: { tag: true } },
          replies: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  // bin: true, // включай только если реально нужно отображать
                },
              },
            },
          },
        },
      },
    },
  });

  if (!place) return notFound();

  // session: безопасно, чтобы сбой БД не ронял страницу place
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("PlacePage: getSessionUser failed:", err);
    sessionUser = null;
  }

  // ✅ определяем: это филиал компании текущего пользователя?
  let isOwnerBranch = false;

  if (sessionUser?.role === "COMPANY" && place.companyId) {
    try {
      // ownerId у Company уникальный в schema.prisma → можно findUnique
      const myCompany = await prisma.company.findUnique({
        where: { ownerId: sessionUser.id },
        select: { id: true },
      });

      isOwnerBranch = Boolean(myCompany?.id && place.companyId === myCompany.id);
    } catch (err) {
      console.error("PlacePage: company lookup failed:", err);
      isOwnerBranch = false;
    }
  }

  const nextUrl = `/place/${place.slug}/review`;

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
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {place.description}
              </p>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">{place.avgRating.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">
              {place.ratingCount} отзывов
            </div>
          </div>
        </div>

        {/* ✅ CTA блок */}
        <div className="mt-4">
          {sessionUser?.role === "USER" ? (
            <Link
              href={`/place/${place.slug}/review`}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Оставить отзыв
            </Link>
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
          ) : sessionUser?.role === "COMPANY" ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Компании не могут оставлять отзывы.
            </div>
          ) : sessionUser?.role === "ADMIN" ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Администратор не оставляет отзывы.
            </div>
          ) : (
            // ✅ логичнее: login (поддерживает verify-flow), а регистрацию можно открыть с login страницы
            <Link
              href={`/login?next=${encodeURIComponent(nextUrl)}`}
              className="inline-flex h-10 items-center rounded-md border px-4"
            >
              Войти, чтобы оставить отзыв
            </Link>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Отзывы</h2>

      <div className="mt-3 grid gap-3">
        {place.reviews.map((r) => {
          const nick = r.author?.nickname ?? "";
          const fullName = [r.author?.firstName, r.author?.lastName]
            .filter(Boolean)
            .join(" ");
          const name = r.author?.name ?? "";

          // email убран — если нет имени/ника, показываем нейтрально
          const authorLabel = nick || fullName || name || "Пользователь";

          return (
            <div key={r.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{authorLabel}</div>
                <div className="text-sm font-semibold">{r.rating}/5</div>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{r.text}</p>

              {r.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.tags.map((t) => (
                    <span
                      key={t.tagId}
                      className="rounded-full border px-2 py-1 text-xs"
                    >
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
                      <div className="text-xs text-muted-foreground">
                        {rep.company.name}
                      </div>
                      <div className="whitespace-pre-wrap">{rep.text}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {place.reviews.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Пока нет отзывов. Будь первым 🙂
          </div>
        )}
      </div>
    </main>
  );
}