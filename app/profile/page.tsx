import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <div className="mt-4 rounded-xl border p-4 text-sm">
        <div><b>Email:</b> {user.email}</div>
        <div><b>Роль:</b> {user.role}</div>
        <div className="mt-3 text-muted-foreground">
          Далее здесь сделаем редактирование профиля и “мои отзывы”.
        </div>
      </div>
    </main>
  );
}