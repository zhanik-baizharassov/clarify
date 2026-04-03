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
          <nav className="flex items-center gap-2" aria-label="Навигация">
            <Link href="/login" className="clarify-button-secondary-sm">
              Войти
            </Link>

            <Link href="/signup" className="clarify-button-primary-sm">
              Регистрация
            </Link>
          </nav>
        }
        mobileAuth={
          <>
            <Link href="/login" className="clarify-button-secondary w-full">
              Войти
            </Link>

            <Link href="/signup" className="clarify-button-primary w-full">
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
        <nav className="flex items-center gap-2" aria-label="Навигация">
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="clarify-button-premium-sm">
              Админ
            </Link>
          ) : user.role === "COMPANY" ? (
            <Link
              href="/company"
              className="clarify-button-secondary-sm border-primary-soft-border bg-primary-soft text-primary hover:bg-primary-soft"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/profile"
              className="clarify-button-secondary-sm border-primary-soft-border bg-primary-soft text-primary hover:bg-primary-soft"
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
            <Link href="/admin" className="clarify-button-premium w-full">
              Админ
            </Link>
          ) : user.role === "COMPANY" ? (
            <Link
              href="/company"
              className="clarify-button-secondary w-full border-primary-soft-border bg-primary-soft text-primary hover:bg-primary-soft"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/profile"
              className="clarify-button-secondary w-full border-primary-soft-border bg-primary-soft text-primary hover:bg-primary-soft"
            >
              Профиль
            </Link>
          )}

          <LogoutButton className="h-12 w-full rounded-[16px] text-sm" />
        </>
      }
    />
  );
}