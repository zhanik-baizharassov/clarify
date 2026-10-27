import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs, {
  breadcrumbJsonLd,
} from "@/features/places/components/Breadcrumbs";
import PlaceListCard from "@/features/places/components/PlaceListCard";
import { prisma } from "@/server/db/prisma";
import {
  getCategoriesInCity,
  getCitiesForCategory,
  getPlacesInCityCategory,
} from "@/server/catalog/queries";
import { getSiteOrigin, toJsonLd } from "@/server/seo/site";
import { pluralRu } from "@/shared/format";
import { KZ_CITY_META, cityFromSlug, cityPath } from "@/shared/kz/kz";

type Params = { city: string; category: string };

async function findCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const city = cityFromSlug(citySlug);
  const category = city ? await findCategory(categorySlug) : null;

  if (!city || !category) {
    return { title: "Страница не найдена", robots: { index: false } };
  }

  const { locative } = KZ_CITY_META[city];

  return {
    title: `${category.name} ${locative} — отзывы и рейтинг`,
    description: `${category.name} ${locative}: рейтинг, отзывы посетителей и ответы компаний. Сравните места и выберите проверенное на Clarify.`,
    alternates: { canonical: `${cityPath(city)}/${category.slug}` },
  };
}

export default async function CityCategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { city: citySlug, category: categorySlug } = await params;
  const city = cityFromSlug(citySlug);
  if (!city) return notFound();

  const category = await findCategory(categorySlug);
  if (!category) return notFound();

  const [{ places, total }, otherCategories, otherCities] = await Promise.all([
    getPlacesInCityCategory(city, category.id),
    getCategoriesInCity(city),
    getCitiesForCategory(category.id),
  ]);

  // an empty page would be thin content: keep it out of the index
  if (total === 0) return notFound();

  const { locative } = KZ_CITY_META[city];
  const origin = getSiteOrigin();
  const pagePath = `${cityPath(city)}/${category.slug}`;

  const crumbs = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
    { label: city, href: cityPath(city) },
    { label: category.name },
  ];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} ${locative}`,
    url: `${origin}${pagePath}`,
    numberOfItems: total,
    itemListElement: places.map((place, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${origin}/place/${place.slug}`,
      name: place.name,
    })),
  };

  const siblingCategories = otherCategories.filter((c) => c.id !== category.id);
  const siblingCities = otherCities.filter((c) => c.city !== city);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd([breadcrumbJsonLd(origin, crumbs), itemList]),
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          {category.name} {locative}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          В каталоге Clarify {total}{" "}
          {pluralRu(total, ["место", "места", "мест"])} в категории «
          {category.name}» {locative}. Читайте отзывы посетителей, сравнивайте
          рейтинг и выбирайте проверенные места.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {places.map((place) => (
            <PlaceListCard key={place.slug} place={place} />
          ))}
        </div>

        {total > places.length ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Показано {places.length} из {total}. Остальные места ищите в{" "}
            <Link href="/explore" className="font-medium text-primary hover:underline">
              каталоге с фильтрами
            </Link>
            .
          </p>
        ) : null}

        {siblingCategories.length > 0 ? (
          <section aria-labelledby="other-categories" className="mt-12">
            <h2 id="other-categories" className="text-xl font-semibold">
              Другие категории {locative}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {siblingCategories.map((c) => (
                <li key={c.id}>
                  <Link href={`${cityPath(city)}/${c.slug}`} className="clarify-chip">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {siblingCities.length > 0 ? (
          <section aria-labelledby="other-cities" className="mt-10">
            <h2 id="other-cities" className="text-xl font-semibold">
              {category.name} в других городах
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {siblingCities.map(({ city: c }) => (
                <li key={c}>
                  <Link href={`${cityPath(c)}/${category.slug}`} className="clarify-chip">
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
