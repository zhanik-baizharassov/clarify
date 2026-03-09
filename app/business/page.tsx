import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    console.error("BusinessPage: getSessionUser failed:", err);
    sessionUser = null;
  }

  if (sessionUser?.role === "COMPANY") {
    redirect("/company");
  }

  redirect("/business/signup");
}