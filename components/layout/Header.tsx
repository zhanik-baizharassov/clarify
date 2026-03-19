import Link from "next/link";
import HeaderShell from "./HeaderShell";
import LogoutButton from "./LogoutButton";

type HeaderUser = {
  role: "USER" | "COMPANY" | "ADMIN";
} | null;

export default function Header({
  user = null,
}: {
  user?: HeaderUser;
}) {
  if (!user) {
    return (
      <HeaderShell
        desktopAuth={
          <nav
            className="flex items-center gap-2 text-xs sm:text-sm"
            aria-label="Навигация"
          >
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:text-sm"
            >
              Войти
            </Link>

            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 sm:text-sm"
            >
              Регистрация
            </Link>
          </nav>
        }
        mobileAuth={
          <>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
            >
              Войти
            </Link>

            <Link
              href="/signup"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Регистрация
            </Link>
          </>
        }
      />
    );
  }

  return (
    <HeaderShell
      desktopAuth={
        <nav
          className="flex items-center gap-2 text-xs sm:text-sm"
          aria-label="Навигация"
        >
          {user.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:text-sm"
            >
              Админ
            </Link>
          ) : user.role === "COMPANY" ? (
            <Link
              href="/company"
              className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:text-sm"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-muted/40 sm:text-sm"
            >
              Профиль
            </Link>
          )}

          <LogoutButton />
        </nav>
      }
      mobileAuth={
        <>
          {user.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
            >
              Админ
            </Link>
          ) : user.role === "COMPANY" ? (
            <Link
              href="/company"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/profile"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted/40"
            >
              Профиль
            </Link>
          )}

          <LogoutButton className="h-11 w-full text-sm" />
        </>
      }
    />
  );
}