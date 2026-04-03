import Link from "next/link";
import HeaderShell from "./HeaderShell";

export default function PublicHeader() {
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