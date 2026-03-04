import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import ProfileEditForm from "@/features/profile/components/profile-edit-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TabKey = "main" | "security" | "reviews" | "notifications";

const TABS: { key: TabKey; label: string }[] = [
  { key: "main", label: "Основное" },
  { key: "security", label: "Безопасность" },
  { key: "reviews", label: "Мои отзывы" },
  { key: "notifications", label: "Уведомления" },
];

function normalizeTab(v: string | null | undefined): TabKey {
  const s = (v ?? "main").toLowerCase();
  if (s === "security") return "security";
  if (s === "reviews") return "reviews";
  if (s === "notifications") return "notifications";
  return "main";
}

export default async function ProfilePage({
  searchParams,
}: {
  // поддержим оба варианта: object и Promise<object>
  searchParams?: { tab?: string } | Promise<{ tab?: string }>;
}) {
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
      emailVerifiedAt: true,
    },
  });

  if (!user) redirect("/login");

  const locked = user.profileEditCount >= 1;

  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tab = normalizeTab(sp?.tab);

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.nickname ||
    "Пользователь";

  const createdAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(user.createdAt);

  const emailVerified = Boolean(user.emailVerifiedAt);

  const initial = {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    nickname: user.nickname ?? "",
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };

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
          title="Профиль можно изменить только один раз"
        >
          <span
            className={[
              "inline-flex h-2 w-2 rounded-full",
              locked ? "bg-muted-foreground/50" : "bg-emerald-500",
            ].join(" ")}
          />
          {locked ? "Недоступно" : "Можно изменить 1 раз"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[360px_1fr]">
        {/* LEFT CARD */}
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={user.avatarUrl || "/avatar-placeholder.png"}
                alt="avatar"
                width={96}
                height={96}
                className="h-24 w-24 rounded-2xl border object-cover"
              />
              <div className="mt-2 text-center text-xs text-muted-foreground">
                Аватар
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">{fullName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                @{user.nickname ?? "—"}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {emailVerified ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    Email подтверждён
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/50" />
                    Email не подтверждён
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border bg-background p-4">
              <div className="grid gap-2 text-sm">
                <InfoRow label="Телефон" value={user.phone ?? "—"} />
                <InfoRow label="Email" value={user.email} />
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-4">
              <InfoRow label="Аккаунт создан" value={createdAt} />
            </div>

            <div className="rounded-2xl bg-muted/20 p-4">
              <div className="text-sm font-medium">Ограничение</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Данные профиля можно изменить только один раз. После сохранения
                форма блокируется.
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Link
                  key={t.key}
                  href={`/profile?tab=${t.key}`}
                  className={[
                    "inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/40",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-5">
            {tab === "main" ? (
              <ProfileEditForm tab="main" locked={locked} initial={initial} />
            ) : tab === "security" ? (
              <ProfileEditForm
                tab="security"
                locked={locked}
                initial={initial}
              />
            ) : tab === "reviews" ? (
              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                Здесь будут ваши отзывы (скоро).
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                Здесь будут уведомления (скоро).
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
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="max-w-[70%] truncate font-medium">{value}</div>
    </div>
  );
}