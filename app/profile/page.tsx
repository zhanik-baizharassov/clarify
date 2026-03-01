// app/profile/page.tsx
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
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
      emailVerifiedAt: true,
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

  const createdAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(user.createdAt);

  const isVerified = Boolean(user.emailVerifiedAt);

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
              : "bg-primary text-primary-foreground border-primary",
          ].join(" ")}
        >
          {locked
            ? "Редактирование: заблокировано"
            : "Редактирование: доступно 1 раз"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.25fr]">
        {/* LEFT CARD */}
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <img
                src={user.avatarUrl || "/avatar-placeholder.png"}
                alt="avatar"
                className="h-20 w-20 rounded-2xl border object-cover"
              />
              <div className="mt-2 text-center text-xs text-muted-foreground">
                Аватар
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 truncate text-lg font-semibold">
                  {fullName}
                </div>

                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  USER
                </span>

                {/* ✅ аккуратный бейдж верификации рядом с ролью */}
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                    isVerified
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
                  ].join(" ")}
                  title={isVerified ? "Email подтверждён" : "Email не подтверждён"}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      isVerified ? "bg-emerald-600" : "bg-muted-foreground",
                    ].join(" ")}
                  />
                  {isVerified ? "Email подтверждён" : "Email не подтверждён"}
                </span>
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                @{user.nickname ?? "—"}
              </div>

              {/* ✅ компактный и ровный список */}
              <div className="mt-4 grid gap-2 text-sm">
                <InfoRow label="Телефон" value={<span className="font-medium">{user.phone ?? "—"}</span>} />

                {/* ✅ email переносится красиво по @ и точкам */}
                <InfoRow
                  label="Email"
                  value={<EmailPretty value={user.email} />}
                />

                <InfoRow
                  label="Аккаунт создан"
                  value={<span className="font-medium">{createdAt}</span>}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-muted/40 p-4">
            <div className="text-sm font-medium">Ограничение</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Данные профиля можно изменить только один раз. После сохранения
              форма блокируется.
            </div>
          </div>
        </section>

        {/* RIGHT CARD */}
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0">{value}</div>
    </div>
  );
}

/**
 * Делает переносы в email "красиво": после @ и после точек.
 * Без break-all (он ломает слово некрасиво).
 */
function EmailPretty({ value }: { value: string }) {
  const parts = value.split(/([@.])/g); // сохраняем разделители
  return (
    <span className="font-medium break-words">
      {parts.map((p, i) => {
        const isSep = p === "@" || p === ".";
        return (
          <span key={`${p}-${i}`}>
            {p}
            {isSep ? <wbr /> : null}
          </span>
        );
      })}
    </span>
  );
}