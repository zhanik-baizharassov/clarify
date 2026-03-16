import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

type HeaderUser = {
  role: "USER" | "COMPANY" | "ADMIN";
} | null;

export default async function Header({
  user = null,
}: {
  user?: HeaderUser;
}) {
  const desktopNavClass =
    "inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:text-sm";

  const mobileNavClass =
    "inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3"
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

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/charts" className={desktopNavClass}>
            Чарты Clarify
          </Link>

          <Link href="/explore" className={desktopNavClass}>
            Найти места
          </Link>

          {!user ? (
            <nav
              className="flex items-center gap-2 text-xs sm:text-sm"
              aria-label="Навигация"
            >
              <Link href="/login" className={desktopNavClass}>
                Войти
              </Link>

              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:text-sm"
              >
                Регистрация
              </Link>
            </nav>
          ) : (
            <nav
              className="flex items-center gap-2 text-xs sm:text-sm"
              aria-label="Навигация"
            >
              {user.role === "ADMIN" ? (
                <Link href="/admin" className={desktopNavClass}>
                  Админ
                </Link>
              ) : user.role === "COMPANY" ? (
                <Link href="/company" className={desktopNavClass}>
                  Кабинет
                </Link>
              ) : (
                <Link href="/profile" className={desktopNavClass}>
                  Профиль
                </Link>
              )}

              <LogoutButton />
            </nav>
          )}
        </div>

        <details className="group md:hidden">
          <summary
            className="flex h-11 w-11 list-none items-center justify-center rounded-xl border bg-background transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background [&::-webkit-details-marker]:hidden"
            aria-label="Открыть меню"
          >
            <span className="sr-only">Открыть меню</span>
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-foreground" />
              <span className="block h-0.5 w-5 rounded-full bg-foreground" />
              <span className="block h-0.5 w-5 rounded-full bg-foreground" />
            </span>
          </summary>

          <div className="absolute inset-x-0 top-full border-b bg-background/95 px-4 pb-4 pt-3 shadow-lg backdrop-blur sm:px-6">
            <nav
              className="mx-auto grid max-w-7xl gap-2"
              aria-label="Мобильная навигация"
            >
              <Link href="/charts" className={mobileNavClass}>
                Чарты Clarify
              </Link>

              <Link href="/explore" className={mobileNavClass}>
                Найти места
              </Link>

              {!user ? (
                <>
                  <Link href="/login" className={mobileNavClass}>
                    Войти
                  </Link>

                  <Link
                    href="/signup"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    Регистрация
                  </Link>
                </>
              ) : (
                <>
                  {user.role === "ADMIN" ? (
                    <Link href="/admin" className={mobileNavClass}>
                      Админ
                    </Link>
                  ) : user.role === "COMPANY" ? (
                    <Link href="/company" className={mobileNavClass}>
                      Кабинет
                    </Link>
                  ) : (
                    <Link href="/profile" className={mobileNavClass}>
                      Профиль
                    </Link>
                  )}

                  <LogoutButton className="h-11 w-full text-sm" />
                </>
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}