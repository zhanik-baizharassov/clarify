import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import ProfileEditForm from "./profile-edit-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "USER") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      firstName: true,
      lastName: true,
      nickname: true,
      phone: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      profileEditCount: true,
    },
  });

  if (!user) redirect("/login");

  const locked = user.profileEditCount >= 1;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Профиль</h1>

      <div className="mt-4 rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <img
            src={user.avatarUrl || "/avatar-placeholder.png"}
            alt="avatar"
            className="h-24 w-24 rounded-full border object-cover"
          />

          <div className="grid gap-1 text-sm">
            <div className="text-base font-semibold">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                user.nickname}
            </div>
            <div className="text-muted-foreground">
              Никнейм: {user.nickname}
            </div>
            <div className="text-muted-foreground">
              Телефон: {user.phone ?? "—"}
            </div>
            <div className="text-muted-foreground">Email: {user.email}</div>
            <div className="text-muted-foreground">
              Аккаунт создан:{" "}
              {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
                user.createdAt,
              )}
            </div>
            <div className="text-muted-foreground">
              Редактирование:{" "}
              {locked ? "использовано (заблокировано)" : "доступно (1 раз)"}
            </div>
          </div>
        </div>
      </div>

      <ProfileEditForm
        locked={locked}
        initial={{
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />
    </main>
  );
}
