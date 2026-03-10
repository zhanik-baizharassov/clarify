import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика конфиденциальности Clarify.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <article className="rounded-3xl border bg-background p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Политика конфиденциальности</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Этот документ описывает, какие данные мы можем собирать и как используем их в Clarify.
          Текст является базовой версией и может быть обновлён.
        </p>

        <section className="mt-6 space-y-3 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">1. Какие данные могут обрабатываться</h2>
          <ul className="list-disc pl-5">
            <li>Данные аккаунта (например, email), необходимые для регистрации и входа.</li>
            <li>Контент, который вы публикуете (отзывы, ответы компаний).</li>
            <li>Технические данные (например, cookies для сессии), чтобы сайт работал корректно.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">2. Зачем мы это делаем</h2>
          <ul className="list-disc pl-5">
            <li>Чтобы предоставлять доступ к функциям сервиса и поддерживать авторизацию.</li>
            <li>Чтобы обеспечивать безопасность и уменьшать спам (верификация, модерация).</li>
            <li>Чтобы улучшать качество сервиса.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">3. Cookies</h2>
          <p>
            Мы используем cookies для поддержки сессии и корректной работы авторизации.
          </p>

          <h2 className="text-base font-semibold text-foreground">4. Обратная связь</h2>
          <p>
            По вопросам конфиденциальности: <span className="text-foreground/90">clarify.helper@gmail.com</span>
          </p>
        </section>
      </article>
    </main>
  );
}