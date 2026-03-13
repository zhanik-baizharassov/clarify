import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import {
  getSessionUser,
  isDynamicServerUsageError,
} from "@/server/auth/session";

export default async function Header() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;

  try {
    user = await getSessionUser();
  } catch (err) {
    if (!isDynamicServerUsageError(err)) {
      console.error("Header: getSessionUser failed:", err);
    }
    user = null;
  }

  const secondaryNavClass =
    "inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:min-w-0 sm:flex-none sm:text-sm";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-[5rem] max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 md:h-20 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 md:shrink-0"
          aria-label="На главную"
        >
          <Image
            src="/icon.png"
            alt="Clarify"
            width={50}
            height={50}
            priority
            className="h-[50px] w-[50px] shrink-0 rounded-xl object-contain transition group-hover:scale-[1.02]"
          />

          <span className="flex min-w-0 flex-col justify-center leading-tight">
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Clarify
            </span>
            <span className="truncate text-xs text-muted-foreground sm:text-sm">
              Отзывы по Казахстану
            </span>
          </span>
        </Link>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
          <Link href="/charts" className={secondaryNavClass}>
            Чарты Clarify
          </Link>

          <Link href="/explore" className={secondaryNavClass}>
            Найти места
          </Link>

          {!user ? (
            <nav
              className="flex w-full flex-wrap items-center gap-2 text-xs sm:text-sm md:w-auto md:flex-nowrap"
              aria-label="Навигация"
            >
              <Link href="/login" className={secondaryNavClass}>
                Войти
              </Link>

              <Link
                href="/signup"
                className="inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:min-w-0 sm:flex-none sm:text-sm"
              >
                Регистрация
              </Link>
            </nav>
          ) : (
            <nav
              className="flex w-full flex-wrap items-center gap-2 text-xs sm:text-sm md:w-auto md:flex-nowrap"
              aria-label="Навигация"
            >
              {user.role === "ADMIN" ? (
                <Link href="/admin" className={secondaryNavClass}>
                  Админ
                </Link>
              ) : user.role === "COMPANY" ? (
                <Link href="/company" className={secondaryNavClass}>
                  Кабинет
                </Link>
              ) : (
                <Link href="/profile" className={secondaryNavClass}>
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