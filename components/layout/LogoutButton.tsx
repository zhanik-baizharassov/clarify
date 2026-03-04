"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await safeReadText(res);
        console.error("Logout failed:", res.status, body);
        setPending(false);
        router.refresh();
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setPending(false);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-10 items-center rounded-xl border bg-background px-3 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
      onClick={handleLogout}
    >
      {pending ? "Выходим…" : "Выйти"}
    </button>
  );
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}