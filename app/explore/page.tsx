// app/explore/page.tsx
import type { Metadata } from "next";
import PlacesExplorer from "@/features/places/components/PlacesExplorer";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Найти места",
  description: "Поиск и фильтры по местам и компаниям Казахстана. Рейтинги и отзывы.",
};

export default async function ExplorePage() {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("ExplorePage: getSessionUser failed:", err);
    sessionUser = null;
  }

  return <PlacesExplorer isAuthed={!!sessionUser} variant="catalog" />;
}