import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Breadcrumbs, {
  breadcrumbJsonLd,
} from "@/features/places/components/Breadcrumbs";
import { getCitiesWithPlaces } from "@/server/catalog/queries";
import { getSiteOrigin, toJsonLd } from "@/server/seo/site";
import { pluralRu } from "@/shared/format";
import { cityPath } from "@/shared/kz/kz";

export const metadata: Metadata = {
  title: "Каталог мест по городам Казахстана",
  description:
    "Места и компании Казахстана по городам: кафе, аптеки, автосервисы, магазины и услуги. Рейтинги и отзывы посетителей.",
  alternates: { canonical: "/catalog" },
};

export default async function CatalogIndexPage() {
  const cities = await getCitiesWithPlaces().catch((err) => {
    console.error("CatalogIndexPage: getCitiesWithPlaces failed:", err);
    return [];
  });
  const origin = getSiteOrigin();

  const crumbs = [
    { label: "Главная", href: "/" },
    { label: "Каталог" },
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
          Каталог мест по городам Казахстана
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Выберите город, чтобы увидеть места и компании с рейтингом и отзывами
          посетителей.
        </p>

        {cities.length === 0 ? (
          <div className="clarify-empty-state mt-8 px-6 py-10 text-sm text-muted-foreground">
            Пока в каталоге нет мест.
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map(({ city, count }) => (
              <li key={city}>
                <Link
                  href={cityPath(city)}
                  className="clarify-card group flex h-full items-center justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <MapPin className="h-4 w-4 text-primary" />
                      {city}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {count} {pluralRu(count, ["место", "места", "мест"])}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-muted-foreground">
          Нужного места нет?{" "}
          <Link href="/business" className="font-medium text-primary hover:underline">
            Добавьте свою компанию
          </Link>
          .
        </p>
      </div>
    </>
  );
}
