import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { getSessionUser } from "@/lib/auth";

export default async function Header() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition group-hover:scale-[1.02]">
            C
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Clarify</span>
            <span className="text-xs text-muted-foreground">Отзывы по Казахстану</span>
          </span>
        </Link>

        {/* ГОСТЬ */}
        {!user ? (
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/business"
              className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              Для бизнеса
            </Link>

            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              Войти
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-primary px-3 py-2 font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Регистрация
            </Link>
          </nav>
        ) : (
          /* ЗАЛОГИНЕН */
          <nav className="flex items-center gap-2 text-sm">
            {user.role === "COMPANY" ? (
              <Link
                href="/company"
                className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
              >
                Кабинет компании
              </Link>
            ) : (
              <Link
                href="/profile"
                className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
              >
                Профиль
              </Link>
            )}

            <LogoutButton />
          </nav>
        )}
      </div>
    </header>
  );
}