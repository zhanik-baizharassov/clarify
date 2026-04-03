import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import {
  getSessionUser,
  isDynamicServerUsageError,
} from "@/server/auth/session";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let sessionUser: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    sessionUser = await getSessionUser();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("PublicLayout: getSessionUser failed:", err);
    }
    sessionUser = null;
  }

  return (
    <>
      <Header user={sessionUser ? { role: sessionUser.role } : null} />
      <main>{children}</main>
      <Footer role={sessionUser?.role ?? null} />
    </>
  );
}