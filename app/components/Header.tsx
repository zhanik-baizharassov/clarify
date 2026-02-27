import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import { getSessionUser } from "@/lib/auth";

export default async function Header() {
  const user = await getSessionUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Clarify
        </Link>

        {/* ГОСТЬ */}
        {!user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/business" className="hover:underline">
              Для бизнеса
            </Link>
            <Link href="/login" className="hover:underline">
              Войти
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-black px-3 py-2 text-white"
            >
              Регистрация
            </Link>
          </nav>
        ) : (
          /* ЗАЛОГИНЕН */
          <nav className="flex items-center gap-3 text-sm">
            {user.role === "COMPANY" ? (
              <>
                <Link href="/company" className="hover:underline">
                  Кабинет компании
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile" className="hover:underline">
                  Профиль
                </Link>
              </>
            )}

            <LogoutButton />
          </nav>
        )}
      </div>
    </header>
  );
}