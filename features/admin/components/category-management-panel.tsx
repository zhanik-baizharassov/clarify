"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: {
    children: number;
    places: number;
  };
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

    setLoading(true);
    setMsg(null);
    setMsgTone(null);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: null,
          sortOrder: 0,
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
          Slug создаётся автоматически и дальше остаётся стабильным.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-1">
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

      <div className="grid gap-4">
        {categories.length ? (
          categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              categories={categories}
            />
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
  categories,
}: {
  category: CategoryItem;
  categories: CategoryItem[];
}) {
  const router = useRouter();

  const parentOptions = useMemo(
    () => categories.filter((item) => item.id !== category.id && item.isActive),
    [categories, category.id],
  );

  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"success" | "error" | null>(null);

  async function handleSave() {
    if (loading) return;

    setLoading(true);
    setMsg(null);
    setMsgTone(null);

    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: parentId || null,
          isActive,
          sortOrder,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось обновить категорию");
      }

      setMsg("Категория обновлена");
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
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold">{category.name}</div>
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[11px]",
                isActive
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              ].join(" ")}
            >
              {isActive ? "Активна" : "Отключена"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs text-muted-foreground">Название</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Родитель</span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={loading}
            className="h-11 rounded-xl border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]"
          >
            <option value="">Без родителя</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Порядок</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={loading}
            className="h-11 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border"
          />
          Активна
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Сохраняем..." : "Сохранить"}
        </button>
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
    </div>
  );
}