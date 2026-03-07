import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { getSessionUser } from "@/server/auth/session";

export default async function Header() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("Header: getSessionUser failed:", err);
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-1"
          aria-label="На главную"
        >
          <Image
            src="/icon.png"
            alt="Clarify"
            width={120}
            height={120}
            priority
            className="h-[150px] w-[150px] shrink-0 -mr-5 rounded-xl object-contain transition group-hover:scale-[1.02]"
          />

          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">
              Clarify
            </span>
            <span className="text-sm text-muted-foreground">
              Отзывы по Казахстану
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/charts"
            className="rounded-xl border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 sm:text-sm"
          >
            Чарты Clarify
          </Link>

          <Link
            href="/explore"
            className="rounded-xl border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 sm:text-sm"
          >
            Найти места
          </Link>

          {!user ? (
            <nav
              className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm"
              aria-label="Навигация"
            >
              <Link
                href="/login"
                className="rounded-xl px-2 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:px-3"
              >
                Войти
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-primary px-2 py-2 font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:px-3"
              >
                Регистрация
              </Link>
            </nav>
          ) : (
            <nav
              className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm"
              aria-label="Навигация"
            >
              {user.role === "COMPANY" ? (
                <Link
                  href="/company"
                  className="rounded-xl px-2 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:px-3"
                >
                  Кабинет
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="rounded-xl px-2 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:px-3"
                >
                  Профиль
                </Link>
              )}
              <LogoutButton />
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
