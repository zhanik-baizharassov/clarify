import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import CreateBranchForm from "./create-branch-form";
import ReplyForm from "./reply-form";

export const dynamic = "force-dynamic";

function authorLabel(a: {
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  const nick = a.nickname ?? "";
  const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const nm = a.name ?? "";
  const em = a.email ?? "";
  return nick || fullName || nm || em || "Пользователь";
}

export default async function CompanyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "COMPANY") redirect("/");

  const company = await prisma.company.findFirst({
    where: { ownerId: user.id },
    select: { id: true, name: true, bin: true, address: true, createdAt: true },
  });
  if (!company) redirect("/business/signup");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const branches = await prisma.place.findMany({
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
  });

  const reviews = await prisma.review.findMany({
    where: { status: "PUBLISHED", place: { companyId: company.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      place: { select: { name: true, slug: true } },
      author: { select: { nickname: true, firstName: true, lastName: true, name: true, email: true } },
      tags: { include: { tag: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { company: { select: { id: true, name: true } } } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Кабинет компании</h1>

      <div className="mt-4 rounded-xl border p-5">
        <div className="text-lg font-semibold">{company.name}</div>
        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
          <div>БИН: {company.bin ?? "—"}</div>
          <div>Адрес компании: {company.address ?? "—"}</div>
          <div>Телефон: {user.phone ?? "—"}</div>
          <div>Email: {user.email}</div>
        </div>
      </div>

      <CreateBranchForm categories={categories} />

      <h2 className="mt-8 text-lg font-semibold">Ваши филиалы</h2>
      <div className="mt-3 grid gap-3">
        {branches.map((b) => (
          <div key={b.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/place/${b.slug}`} className="text-sm font-semibold hover:underline">
                  {b.name}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.city}
                  {b.address ? ` • ${b.address}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.phone ? `☎ ${b.phone}` : ""} {b.workHours ? ` • ⏰ ${b.workHours}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{b.avgRating.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{b.ratingCount} отзывов</div>
              </div>
            </div>
          </div>
        ))}

        {branches.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            У вас пока нет филиалов. Создайте первый филиал выше.
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Отзывы пользователей по вашим филиалам</h2>
      <div className="mt-3 grid gap-3">
        {reviews.map((r) => {
          const alreadyReplied = r.replies.some((rep) => rep.companyId === company.id);
          const dt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(r.createdAt);

          return (
            <div key={r.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/place/${r.place.slug}`} className="text-sm font-semibold hover:underline">
                    {r.place.name}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {authorLabel(r.author)} • {dt}
                  </div>
                </div>
                <div className="text-sm font-semibold">{r.rating}/5</div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm">{r.text}</p>

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
                  <div className="font-medium">Ответы компаний:</div>
                  {r.replies.map((rep) => (
                    <div key={rep.id} className="mt-2">
                      <div className="text-xs text-muted-foreground">{rep.company.name}</div>
                      <div className="whitespace-pre-wrap">{rep.text}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <ReplyForm reviewId={r.id} disabled={alreadyReplied} />
            </div>
          );
        })}

        {reviews.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Пока нет отзывов по вашим филиалам.
          </div>
        )}
      </div>
    </main>
  );
}