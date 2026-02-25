import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CompanyDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "COMPANY") redirect("/"); // или /profile

  const company = await prisma.company.findFirst({
    where: { ownerId: user.id },
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Кабинет компании</h1>

      <div className="mt-4 rounded-xl border p-4">
        <div className="text-sm">
          <b>Компания:</b> {company?.name ?? "—"}
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Следующий шаг: создание мест, управление карточками и аналитика.
        </div>
      </div>
    </main>
  );
}