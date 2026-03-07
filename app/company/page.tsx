import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import CreateBranchForm from "@/features/company/components/create-branch-form";
import ReplyForm from "@/features/reviews/components/reply-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export default async function CompanyPage() {
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

  const [categories, branches, reviews] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),

    prisma.place.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
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

    prisma.review.findMany({
      where: { status: "PUBLISHED", place: { companyId: company.id } },
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
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Кабинет компании</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управляйте филиалами и отвечайте на отзывы пользователей.
          </p>
        </div>

        <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
          Филиалов: <span className="font-medium text-foreground">{branches.length}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <section className="grid gap-6">
          <div className="rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{company.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Основная информация о компании
                </div>
              </div>

              <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Компания
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard label="БИН" value={company.bin ?? "—"} />
              <InfoCard label="Телефон" value={user.phone ?? "—"} />
              <InfoCard label="Email" value={user.email} />
              <InfoCard label="Адрес компании" value={company.address ?? "—"} />
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ваши филиалы</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Карточки мест, по которым пользователи оставляют отзывы.
                </p>
              </div>

              <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                Всего: <span className="font-medium text-foreground">{branches.length}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {branches.map((b) => (
                <div key={b.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/place/${b.slug}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {b.name}
                      </Link>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {b.city}
                        {b.address ? ` • ${b.address}` : ""}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {b.phone ? `☎ ${b.phone}` : "☎ —"}
                        {b.workHours ? ` • ⏰ ${b.workHours}` : ""}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">
                        {Number(b.avgRating).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.ratingCount} отзывов
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {branches.length === 0 ? (
                <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                  У вас пока нет филиалов. Создайте первый филиал справа.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border bg-background p-5">
          <div>
            <h2 className="text-lg font-semibold">Создать филиал</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Добавьте новую карточку места для сбора отзывов.
            </p>
          </div>

          <CreateBranchForm categories={categories} />
        </aside>
      </div>

      <section className="mt-8 rounded-2xl border bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Отзывы пользователей по вашим филиалам
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Здесь вы можете просматривать отзывы и оставлять официальный ответ.
            </p>
          </div>

          <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            Всего отзывов: <span className="font-medium text-foreground">{reviews.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {reviews.map((r) => {
            const alreadyReplied = r.replies.some(
              (rep) => rep.companyId === company.id,
            );
            const dt = dtf.format(r.createdAt);

            return (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/place/${r.place.slug}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {r.place.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {authorLabel(r.author)} • {dt}
                    </div>
                  </div>

                  <div className="shrink-0 text-sm font-semibold">{r.rating}/5</div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">{r.text}</p>

                {r.tags.length ? (
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

                {r.replies.length ? (
                  <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">Ответы компаний:</div>
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

                <ReplyForm reviewId={r.id} disabled={alreadyReplied} />
              </div>
            );
          })}

          {reviews.length === 0 ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">
              Пока нет отзывов по вашим филиалам.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}