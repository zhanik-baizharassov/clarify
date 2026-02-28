import Link from "next/link";

export default function BusinessPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Для бизнеса</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Получайте обратную связь, отвечайте на отзывы и подключайте платные
        инструменты продвижения.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          href="/business/signup"
          className="rounded-xl bg-primary px-4 py-2 text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          {" "}
          Зарегистрировать компанию
        </Link>
        <Link href="/login" className="rounded-md border px-4 py-2">
          Войти
        </Link>
      </div>
    </main>
  );
}
