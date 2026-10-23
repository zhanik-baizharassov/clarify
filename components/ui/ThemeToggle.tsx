"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Light/dark switch. The icons swap through CSS (`dark:` variant), so the
 * server and client render the same markup and nothing flickers on load.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");

    root.classList.toggle("dark", nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";

    try {
      localStorage.setItem("theme", nextDark ? "dark" : "light");
    } catch {
      // storage can be unavailable (private mode); the choice just won't persist
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Переключить тему"
      title="Переключить тему"
      className={`group relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card text-foreground transition hover:border-primary-soft-border hover:bg-primary-soft active:scale-90 ${className}`}
    >
      <Sun className="absolute h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-500 group-hover:rotate-45 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-500 group-hover:-rotate-12 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
