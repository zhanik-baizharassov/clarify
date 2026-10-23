import Image from "next/image";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

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

  const linkClass =
    "w-fit text-muted-foreground transition hover:translate-x-0.5 hover:text-foreground";

  return (
    <footer className="mt-20 px-4 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border bg-card shadow-[var(--shadow-card)]">
        <div className="grid gap-10 px-6 py-10 md:px-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/icon.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl object-contain"
              />
              <span className="font-display text-2xl font-semibold">
                Clarify
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              Отзывы и репутация по Казахстану. Верификация пользователей,
              модерация и официальные ответы компаний.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm lg:col-span-7 lg:grid-cols-3">
            <div className="grid content-start gap-3">
              <div className="font-semibold">Разделы</div>
              <Link className={linkClass} href="/explore">
                Найти места
              </Link>
              <Link className={linkClass} href="/charts">
                Чарты Clarify
              </Link>
              <Link className={linkClass} href="/#how">
                Как это работает
              </Link>
            </div>

            <div className="grid content-start gap-3">
              <div className="font-semibold">Компаниям</div>
              <Link className={linkClass} href={companyCabinetHref}>
                Вход в кабинет
              </Link>
              <Link className={linkClass} href="/business/signup">
                Регистрация компании
              </Link>
              <Link className={linkClass} href="/business">
                О платформе для бизнеса
              </Link>
            </div>

            <div className="col-span-2 grid content-start gap-3 lg:col-span-1">
              <div className="font-semibold">Контакты</div>
              <a
                href={`mailto:${CONTACT.email}`}
                className={`${linkClass} inline-flex items-center gap-2`}
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="break-all">{CONTACT.email}</span>
              </a>
              <a
                href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                className={`${linkClass} inline-flex items-center gap-2`}
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>

        <div className="border-t bg-surface-soft/60">
          <div className="flex flex-col gap-3 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
            <div>© {new Date().getFullYear()} Clarify. Все права защищены.</div>
            <div className="flex gap-5">
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
    </footer>
  );
}
