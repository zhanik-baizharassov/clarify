import type { Metadata } from "next";
import Link from "next/link";
import PlacesExplorer from "@/features/places/components/PlacesExplorer";
import { getCitiesWithPlaces } from "@/server/catalog/queries";
import { cityPath } from "@/shared/kz/kz";

export const metadata: Metadata = {
  title: "Найти места",
  description: "Поиск и фильтры по местам и компаниям Казахстана. Рейтинги и отзывы.",
  // filters live in the query string (?q=, ?city=, ?category=): one canonical URL
  alternates: { canonical: "/explore" },
};

export default async function ExplorePage() {
  const cities = await getCitiesWithPlaces().catch(() => []);

  return (
    <>
      <PlacesExplorer variant="catalog" />

      {cities.length > 0 ? (
        <section
          aria-labelledby="cities-heading"
          className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8"
        >
          <h2 id="cities-heading" className="text-xl font-semibold">
            Каталог по городам
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {cities.map(({ city, count }) => (
              <li key={city}>
                <Link href={cityPath(city)} className="clarify-chip">
                  {city}
                  <span className="text-xs text-muted-foreground">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
