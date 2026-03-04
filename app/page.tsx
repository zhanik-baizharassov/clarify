import PlacesExplorer from "@/features/places/components/PlacesExplorer";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("HomePage: getSessionUser failed:", err);
    sessionUser = null;
  }

  return <PlacesExplorer isAuthed={!!sessionUser} />;
}