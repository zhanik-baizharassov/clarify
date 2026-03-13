"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CategoryItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function CategoryManagementPanel({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error" | null>(null);

  async function handleCreate() {
    if (loading) return;

    const cleanName = name.trim();
    if (!cleanName) {
      setMsg("Введите название категории");
      setMsgTone("error");
      return;
    }

    setLoading(true);
    setMsg(null);
    setMsgTone(null);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось создать категорию");
      }

      setName("");
      setMsg("Категория создана");
      setMsgTone("success");
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message ?? "Ошибка");
      setMsgTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6">
      <div className="rounded-2xl border bg-background p-5">
        <div className="text-base font-semibold">Новая категория</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Категории создаются как простой плоский список и дальше показываются в
          алфавитном порядке.
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">Название</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        {msg ? (
          <div
            className={[
              "mt-4 rounded-xl border p-3 text-sm",
              msgTone === "success"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-destructive/30 bg-destructive/5 text-destructive",
            ].join(" ")}
          >
            {msg}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Создание..." : "Создать категорию"}
        </button>
      </div>

      <div className="grid gap-3">
        {categories.length ? (
          categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))
        ) : (
          <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
            Категорий пока нет. Создайте первую категорию выше.
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
}: {
  category: CategoryItem;
}) {
  const router = useRouter();

  const [isActive, setIsActive] = useState(category.isActive);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function updateStatus(nextIsActive: boolean) {
    if (loading || nextIsActive === isActive) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextIsActive,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось обновить категорию");
      }

      setIsActive(nextIsActive);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex min-h-11 items-center rounded-xl border bg-muted/20 px-4 text-sm font-medium">
          {category.name}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateStatus(true)}
            disabled={loading || isActive}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition",
              isActive
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 opacity-60"
                : "bg-background hover:bg-muted/40",
              loading ? "opacity-60" : "",
            ].join(" ")}
          >
            Активировать
          </button>

          <button
            type="button"
            onClick={() => updateStatus(false)}
            disabled={loading || !isActive}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition",
              !isActive
                ? "border-destructive/30 bg-destructive/10 text-destructive opacity-60"
                : "bg-background hover:bg-muted/40",
              loading ? "opacity-60" : "",
            ].join(" ")}
          >
            Деактивировать
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}
    </div>
  );
}