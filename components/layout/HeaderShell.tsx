"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Compass, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV = [
  { href: "/explore", label: "Найти места", icon: Compass },
  { href: "/charts", label: "Чарты Clarify", icon: BarChart3 },
] as const;

export default function HeaderShell({
  desktopAuth,
  mobileAuth,
}: {
  desktopAuth: ReactNode;
  mobileAuth: ReactNode;
}) {
  const pathname = usePathname();
  // The menu is "open" only for the page it was opened on, so it closes by
  // itself after any navigation without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenedOn(null);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6 lg:px-8">
      <div ref={rootRef} className="relative mx-auto max-w-7xl">
        <div
          className={[
            "flex h-16 items-center justify-between gap-3 rounded-full border bg-card/75 pl-3 pr-2.5 backdrop-blur-xl transition-shadow duration-300 sm:pl-4",
            scrolled ? "shadow-[var(--shadow-elevated)]" : "shadow-sm",
          ].join(" ")}
        >
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5"
            aria-label="Clarify — на главную"
          >
            <Image
              src="/icon.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 rounded-xl object-contain transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110"
            />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-[15px] font-semibold">
                Clarify
              </span>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Отзывы по Казахстану
              </span>
            </span>
          </Link>

          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive(href)
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-surface-soft hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">{desktopAuth}</div>
            <ThemeToggle />

            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-card transition hover:bg-primary-soft active:scale-90 md:hidden"
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu
                className={`absolute h-[18px] w-[18px] transition-all duration-300 ${open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
              />
              <X
                className={`absolute h-[18px] w-[18px] transition-all duration-300 ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
              />
            </button>
          </div>
        </div>

        {open ? (
          <div className="animate-in fade-in-0 slide-in-from-top-2 absolute inset-x-0 top-full z-50 mt-2 rounded-3xl border bg-card/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-xl duration-200 md:hidden">
            <nav
              className="grid gap-2"
              aria-label="Мобильная навигация"
            >
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={[
                    "flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition",
                    isActive(href)
                      ? "bg-primary-soft text-primary"
                      : "hover:bg-surface-soft",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}

              <div className="mt-1 grid gap-2 border-t pt-3">{mobileAuth}</div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
