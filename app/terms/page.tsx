import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Условия использования",
  description: "Условия использования сервиса Clarify.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <article className="rounded-3xl border bg-background p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Условия использования</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Эти условия регулируют использование платформы Clarify. Это базовая версия, которую позже можно
          расширить юридически.
        </p>

        <section className="mt-6 space-y-3 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">1. Аккаунты и доступ</h2>
          <ul className="list-disc pl-5">
            <li>Пользователь подтверждает email (OTP) для доступа к функционалу.</li>
            <li>Ответственность за безопасность аккаунта лежит на владельце.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">2. Контент и правила</h2>
          <ul className="list-disc pl-5">
            <li>Запрещены оскорбления, спам и незаконный контент.</li>
            <li>Отзывы и ответы компаний публикуются публично.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">3. Ограничение ответственности</h2>
          <p>
            Clarify предоставляет платформу для публикации отзывов. Мы можем изменять функциональность сервиса
            и правила, улучшая продукт.
          </p>

          <h2 className="text-base font-semibold text-foreground">4. Контакты</h2>
          <p>
            Вопросы по сервису: <span className="text-foreground/90">clarify.helper@gmail.com</span> •{" "}
            <span className="text-foreground/90">+7 (700) 261-36-24</span>
          </p>
        </section>
      </article>
    </main>
  );
}