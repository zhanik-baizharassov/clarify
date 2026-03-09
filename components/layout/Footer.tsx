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
    <footer className="mt-12 border-t bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <div className="text-sm font-semibold">Clarify</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Отзывы по Казахстану. Верификация пользователей, модерация, ответы
            компаний.
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
          <div>
            <div className="text-sm font-semibold">Разделы</div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/explore">
                Найти места
              </Link>
              <Link className="hover:text-foreground" href="/#how">
                Как это работает
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Компаниям</div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href={companyCabinetHref}>
                Вход в кабинет компании
              </Link>
              <Link className="hover:text-foreground" href="/business/signup">
                Регистрация компании
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="text-sm font-semibold">Контакты</div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <div>
              Email: <span className="text-foreground/90">{CONTACT.email}</span>
            </div>
            <div>
              Телефон: <span className="text-foreground/90">{CONTACT.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>© {new Date().getFullYear()} Clarify. Все права защищены.</div>
          <div className="flex gap-3">
            <Link className="hover:text-foreground" href="/privacy">
              Политика
            </Link>
            <Link className="hover:text-foreground" href="/terms">
              Условия
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}