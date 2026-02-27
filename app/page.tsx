import Link from "next/link";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; city?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const category = (searchParams?.category ?? "").trim();
  const city = (searchParams?.city ?? "").trim();

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  const places = await prisma.place.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      ...(category ? { category: { slug: category } } : {}),
    },
    include: { category: true },
    orderBy: [{ avgRating: "desc" }, { ratingCount: "desc" }, { name: "asc" }],
    take: 30,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Отзывы и сортировка мест</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ищи по всем сферам: еда, магазины, сервисы, ремонт и т.д.
      </p>

      <form className="mt-6 grid gap-3 rounded-xl border p-4 md:grid-cols-4" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск (например: coffee, ремонт)"
          className="h-10 rounded-md border px-3"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder="Город (например: Алматы)"
          className="h-10 rounded-md border px-3"
        />
        <select name="category" defaultValue={category} className="h-10 rounded-md border px-3">
          <option value="">Все категории</option>
          {categories
            .filter((c) => c.parentId !== null) // показываем подкатегории
            .map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
        </select>
        <button className="h-10 rounded-md bg-black px-4 text-white">Найти</button>
      </form>

      <div className="mt-6 grid gap-3">
        {places.map((p) => (
          <Link
            key={p.id}
            href={`/place/${p.slug}`}
            className="rounded-xl border p-4 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.category.name} • {p.city}
                  {p.address ? ` • ${p.address}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{p.avgRating.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{p.ratingCount} отзывов</div>
              </div>
            </div>
          </Link>
        ))}

        {places.length === 0 && (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Ничего не найдено. Попробуй убрать фильтры или изменить запрос.
          </div>
        )}
      </div>
    </main>
  );
}