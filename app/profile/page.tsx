import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import ProfileEditForm from "./profile-edit-form";

export const dynamic = "force-dynamic";

type ProfileTab = "main" | "security" | "reviews" | "notifications";

function pickTab(v?: string): ProfileTab {
  const t = (v ?? "main").toLowerCase();
  if (t === "security" || t === "reviews" || t === "notifications" || t === "main") return t;
  return "main";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const activeTab = pickTab(sp?.tab);

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
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.nickname ||
    "Пользователь";

  const createdAt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
    user.createdAt,
  );

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: "main", label: "Основное" },
    { key: "security", label: "Безопасность" },
    { key: "reviews", label: "Мои отзывы" },
    { key: "notifications", label: "Уведомления" },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Управление данными аккаунта и безопасностью
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
            locked
              ? "bg-muted/40 text-muted-foreground"
              : "bg-primary text-primary-foreground border-primary",
          ].join(" ")}
        >
          <span className={["inline-flex h-2 w-2 rounded-full", locked ? "bg-muted-foreground/50" : "bg-white/90"].join(" ")} />
          {locked ? "Недоступно" : "Можно изменить 1 раз"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[360px_1fr]">
        {/* LEFT: summary */}
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex items-start gap-4">
            <div className="grid justify-items-center gap-2">
              <img
                src={user.avatarUrl || "/avatar-placeholder.png"}
                alt="avatar"
                className="h-24 w-24 rounded-2xl border object-cover"
              />
              <div className="text-xs text-muted-foreground">Аватар</div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">{fullName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                @{user.nickname ?? "—"}
              </div>

              {/* ✅ статус вынесен отдельно и компактно */}
              <div className="mt-3">
                <span className="inline-flex items-center gap-2 rounded-full border bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  Email подтверждён
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-muted/20 p-4">
            <div className="grid gap-2 text-sm">
              <InfoRow label="Телефон" value={user.phone ?? "—"} />
              <InfoRow label="Email" value={user.email} />
            </div>
          </div>

          <div className="mt-3 rounded-xl border bg-background p-4">
            <InfoRow label="Аккаунт создан" value={createdAt} />
          </div>

          <div className="mt-4 rounded-xl bg-muted/30 p-4">
            <div className="text-sm font-medium">Ограничение</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Данные профиля можно изменить только один раз. После сохранения форма блокируется.
            </div>
          </div>
        </section>

        {/* RIGHT: tabs + content */}
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/profile?tab=${t.key}`}
                className={[
                  "inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition",
                  activeTab === t.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted/40",
                ].join(" ")}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <div className="mt-5">
            {activeTab === "main" ? (
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
            ) : activeTab === "security" ? (
              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="text-sm font-semibold">Безопасность</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Здесь будет управление безопасностью аккаунта (например, смена пароля).
                </div>
              </div>
            ) : activeTab === "reviews" ? (
              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="text-sm font-semibold">Мои отзывы</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Здесь будет список ваших отзывов и статусы модерации.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="text-sm font-semibold">Уведомления</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Здесь будут уведомления (ответы компаний, изменения статусов и т.д.).
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="max-w-[65%] text-right font-medium break-words">
        {value}
      </div>
    </div>
  );
}