import PlacesExplorer from "./components/PlacesExplorer";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-3xl border bg-gradient-to-b from-muted/40 to-background p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Настоящие отзывы разных мест только от верифицированных пользователей
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Нам важно ваше мнение!
              </h1>

              <p className="mt-3 text-base text-muted-foreground">
                Оценивай заведения и сервисы Казахстана честно: еда, магазины, ремонт, услуги и многое другое.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#explore"
                  className="inline-flex h-11 items-center rounded-xl bg-black px-5 text-sm font-medium text-white"
                >
                  Найти места
                </a>

                {/* ✅ Скрываем для залогиненных */}
                {!sessionUser ? (
                  <a
                    href="/signup"
                    className="inline-flex h-11 items-center rounded-xl border px-5 text-sm font-medium"
                  >
                    Зарегистрироваться
                  </a>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Badge title="Рейтинг" text="Средние оценки по филиалам" />
                <Badge title="Фильтры" text="Город, категория, сортировка" />
                <Badge title="Модерация" text="Profanity-check на сервере" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PlacesExplorer />
    </>
  );
}

function Badge({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{text}</div>
    </div>
  );
}