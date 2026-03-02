import PlacesExplorer from "@/features/places/components/PlacesExplorer";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  return <PlacesExplorer isAuthed={!!sessionUser} />;
}
