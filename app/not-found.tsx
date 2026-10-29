import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
      <div className="clarify-card-elevated w-full p-8 text-center">
        <div className="font-display text-5xl font-semibold">404</div>
        <h1 className="mt-4 text-xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Возможно, ссылка устарела или адрес введён с ошибкой.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="clarify-button-primary">
            На главную
          </Link>
          <Link href="/explore" className="clarify-button-secondary">
            Найти места
          </Link>
          <Link href="/catalog" className="clarify-button-secondary">
            Каталог
          </Link>
        </div>
      </div>
    </main>
  );
}
