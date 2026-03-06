import type { Metadata } from "next";
import LandingHome from "@/features/landing/LandingHome";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clarify — отзывы по Казахстану",
  description:
    "Платформа отзывов: оценивайте места и сервисы Казахстана честно. Компании отвечают на отзывы, пользователи пишут только после верификации.",
};

export default async function HomePage() {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("HomePage: getSessionUser failed:", err);
    sessionUser = null;
  }

  return <LandingHome isAuthed={!!sessionUser} />;
}