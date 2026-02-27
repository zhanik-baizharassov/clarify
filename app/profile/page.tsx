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

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.nickname || "Пользователь";

  const createdAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(user.createdAt);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Управление данными аккаунта и безопасностью
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center rounded-full border px-3 py-1 text-sm",
            locked
              ? "bg-muted/40 text-muted-foreground"
              : "bg-black text-white border-black",
          ].join(" ")}
        >
          {locked ? "Редактирование: заблокировано" : "Редактирование: доступно 1 раз"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.25fr]">
        <section className="rounded-2xl border p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={user.avatarUrl || "/avatar-placeholder.png"}
                alt="avatar"
                className="h-24 w-24 rounded-2xl border object-cover"
              />
              <div className="mt-2 text-center text-xs text-muted-foreground">Аватар</div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-lg font-semibold">{fullName}</div>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  USER
                </span>
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                @{user.nickname ?? "—"}
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <InfoRow label="Телефон" value={user.phone ?? "—"} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Аккаунт создан" value={createdAt} />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-muted/40 p-4">
            <div className="text-sm font-medium">Ограничение</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Данные профиля можно изменить только один раз. После сохранения форма блокируется.
            </div>
          </div>
        </section>

        <ProfileEditForm
          locked={locked}
          initial={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            nickname: user.nickname ?? "",
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
          }}
        />
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="max-w-[60%] truncate font-medium">{value}</div>
    </div>
  );
}