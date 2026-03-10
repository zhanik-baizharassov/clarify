import type { Metadata } from "next";
import PlacesExplorer from "@/features/places/components/PlacesExplorer";

export const metadata: Metadata = {
  title: "Найти места",
  description: "Поиск и фильтры по местам и компаниям Казахстана. Рейтинги и отзывы.",
};

export default function ExplorePage() {
  return <PlacesExplorer variant="catalog" />;
}