"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileEditForm from "./profile-edit-form";

type Initial = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatarUrl: string | null;
};

type TabKey = "main" | "security" | "reviews" | "notifications";

export default function ProfileTabs({
  defaultTab,
  locked,
  initial,
}: {
  defaultTab?: string;
  locked: boolean;
  initial: Initial;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const normalizedDefault = useMemo<TabKey>(() => {
    const t = (defaultTab ?? search.get("tab") ?? "main").toLowerCase();
    if (t === "security" || t === "reviews" || t === "notifications") return t;
    return "main";
  }, [defaultTab, search]);

  const [tab, setTab] = useState<TabKey>(normalizedDefault);

  useEffect(() => {
    setTab(normalizedDefault);
  }, [normalizedDefault]);

  function setTabAndUrl(next: TabKey) {
    setTab(next);
    const params = new URLSearchParams(Array.from(search.entries()));
    params.set("tab", next);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="rounded-2xl border bg-background p-5">
      {/* Tabs header */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "main"} onClick={() => setTabAndUrl("main")}>
          Основное
        </TabButton>
        <TabButton
          active={tab === "security"}
          onClick={() => setTabAndUrl("security")}
        >
          Безопасность
        </TabButton>
        <TabButton
          active={tab === "reviews"}
          onClick={() => setTabAndUrl("reviews")}
        >
          Мои отзывы
        </TabButton>
        <TabButton
          active={tab === "notifications"}
          onClick={() => setTabAndUrl("notifications")}
        >
          Уведомления
        </TabButton>
      </div>

      <div className="mt-4">
        {/* мягкий инфо-баннер сверху, логично и спокойно */}
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <div className="font-medium">
            {locked ? "Изменения уже сохранены" : "Изменение профиля (1 раз)"}
          </div>
          <div className="mt-1 text-muted-foreground">
            {locked
              ? "Форма заблокирована для повторного редактирования."
              : "После успешного сохранения форма станет недоступной."}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          {tab === "main" ? (
            <ProfileEditForm locked={locked} initial={initial} />
          ) : tab === "security" ? (
            <PlaceholderCard
              title="Безопасность"
              desc="В текущем MVP настройки безопасности находятся в форме профиля (раздел «Безопасность»). Позже вынесем сюда отдельные действия."
            />
          ) : tab === "reviews" ? (
            <PlaceholderCard
              title="Мои отзывы"
              desc="Скоро здесь появится список ваших отзывов и статистика."
            />
          ) : (
            <PlaceholderCard
              title="Уведомления"
              desc="Скоро здесь можно будет настроить уведомления и подписки."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center rounded-xl border px-4 text-sm transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted/30",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PlaceholderCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}