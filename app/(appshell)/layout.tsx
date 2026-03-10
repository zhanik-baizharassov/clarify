import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getSessionUser } from "@/server/auth/session";

export default async function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer role={sessionUser?.role ?? null} />
    </>
  );
}