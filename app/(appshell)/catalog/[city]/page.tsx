import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs, {
  breadcrumbJsonLd,
} from "@/features/places/components/Breadcrumbs";
import PlaceListCard from "@/features/places/components/PlaceListCard";
import {
  getCategoriesInCity,
  getTopPlacesInCity,
} from "@/server/catalog/queries";
import { getSiteOrigin, toJsonLd } from "@/server/seo/site";
import { pluralRu } from "@/shared/format";
import { KZ_CITY_META, cityFromSlug, cityPath } from "@/shared/kz/kz";

type Params = { city: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = cityFromSlug(citySlug);
  if (!city) return { title: "Город не найден", robots: { index: false } };

  const { locative } = KZ_CITY_META[city];

  return {
    title: `Места и компании ${locative} — отзывы и рейтинг`,
    description: `Каталог мест ${locative}: кафе, аптеки, автосервисы, магазины и услуги. Рейтинги и отзывы посетителей на Clarify.`,
    alternates: { canonical: cityPath(city) },
  };
}

export default async function CityCatalogPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { city: citySlug } = await params;
  const city = cityFromSlug(citySlug);
  if (!city) return notFound();

  const [categories, topPlaces] = await Promise.all([
    getCategoriesInCity(city),
    getTopPlacesInCity(city),
  ]);

  // an empty city page would be thin content: keep it out of the index
  if (topPlaces.length === 0) return notFound();

  const { locative } = KZ_CITY_META[city];
  const origin = getSiteOrigin();
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  const crumbs = [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: "/catalog" },
    { label: city },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(breadcrumbJsonLd(origin, crumbs)),
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />

        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          Места и компании {locative}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          В каталоге Clarify {total} {pluralRu(total, ["место", "места", "мест"])}{" "}
          {locative}. Выберите категорию или откройте лучшие места города.
        </p>

        {categories.length > 0 ? (
          <section aria-labelledby="categories-heading" className="mt-8">
            <h2 id="categories-heading" className="text-xl font-semibold">
              Категории {locative}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`${cityPath(city)}/${category.slug}`}
                    className="clarify-chip"
                  >
                    {category.name}
                    <span className="text-xs text-muted-foreground">
                      {category.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="top-heading" className="mt-10">
          <h2 id="top-heading" className="text-xl font-semibold">
            Места {locative}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topPlaces.map((place) => (
              <PlaceListCard key={place.slug} place={place} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
