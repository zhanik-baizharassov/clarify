import PlacesExplorer from "./components/PlacesExplorer";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  return <PlacesExplorer isAuthed={!!sessionUser} />;
}