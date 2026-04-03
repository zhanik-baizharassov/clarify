import Link from "next/link";

const CONTACT = {
  phone: "+7 (700) 261-36-24",
  email: "clarify.helper@gmail.com",
};

type FooterProps = {
  role?: "USER" | "COMPANY" | "ADMIN" | null;
};

export default function Footer({ role }: FooterProps) {
  const companyCabinetHref =
    role === "COMPANY"
      ? "/company"
      : `/login?next=${encodeURIComponent("/company")}`;

  return (
    <footer className="mt-14 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="clarify-section overflow-hidden p-0">
          <div className="grid gap-8 px-6 py-8 md:px-8 md:py-10 lg:grid-cols-12">
            <div className="lg:col-span-4">

              <div className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                Clarify
              </div>

              <div className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                Отзывы и репутация по Казахстану. Верификация пользователей,
                модерация и официальные ответы компаний.
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-foreground">Разделы</div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <Link className="transition hover:text-foreground" href="/explore">
                    Найти места
                  </Link>
                  <Link className="transition hover:text-foreground" href="/#how">
                    Как это работает
                  </Link>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">Компаниям</div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <Link
                    className="transition hover:text-foreground"
                    href={companyCabinetHref}
                  >
                    Вход в кабинет компании
                  </Link>
                  <Link
                    className="transition hover:text-foreground"
                    href="/business/signup"
                  >
                    Регистрация компании
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="text-sm font-semibold text-foreground">Контакты</div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="transition hover:text-foreground"
                >
                  Email: <span className="text-foreground/90">{CONTACT.email}</span>
                </a>
                <a
                  href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                  className="transition hover:text-foreground"
                >
                  Телефон: <span className="text-foreground/90">{CONTACT.phone}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t bg-surface-soft/70">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 text-xs text-muted-foreground md:px-8 sm:flex-row sm:items-center sm:justify-between">
              <div>© {new Date().getFullYear()} Clarify. Все права защищены.</div>
              <div className="flex gap-4">
                <Link className="transition hover:text-foreground" href="/privacy">
                  Политика
                </Link>
                <Link className="transition hover:text-foreground" href="/terms">
                  Условия
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}