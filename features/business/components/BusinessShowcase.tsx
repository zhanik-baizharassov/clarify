import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  MessageCircleReply,
  ShieldCheck,
  Store,
} from "lucide-react";

const mainFlow = [
  {
    icon: <Building2 className="h-4 w-4 text-primary" />,
    title: "Auth flow: вход в бизнес-кабинет",
    description:
      "Компания создаёт бизнес-аккаунт и получает отдельную точку входа в Clarify. Это стартовый слой, с которого начинается официальное присутствие на платформе.",
    badge: "Бизнес-аккаунт и кабинет",
  },
  {
    icon: <FileCheck2 className="h-4 w-4 text-primary" />,
    title: "Claim flow: связь с карточкой места",
    description:
      "Если карточка уже есть в каталоге, бизнес не создаёт дубликат, а проходит более аккуратный сценарий подтверждения и запрашивает управление существующей точкой.",
    badge: "Без дублей в каталоге",
  },
  {
    icon: <ShieldCheck className="h-4 w-4 text-primary" />,
    title: "Admin flow: проверка и модерация",
    description:
      "Платформа проверяет заявку и помогает сохранить порядок: кто управляет карточкой, какие филиалы относятся к компании и где бизнес действительно может отвечать официально.",
    badge: "Проверка прав и структуры",
  },
];

const valuePoints = [
  "Бизнес получает не просто видимость в каталоге, а понятный официальный сценарий присутствия.",
  "Отзывы, ответы и филиалы собираются в одной системе, но не смешиваются между собой хаотично.",
  "Пользователь видит, что компания не просто найдена на платформе, а реально работает с обратной связью.",
];

export default function BusinessShowcase() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-[0.94] rounded-[36px] bg-primary/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[30px] border bg-background/72 shadow-xl shadow-primary/10 backdrop-blur-md">
        <div className="border-b bg-muted/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              3 основных сценария для бизнеса
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Бизнес-поток Clarify
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.04fr_0.96fr]">
          <div className="rounded-[24px] border bg-gradient-to-b from-card to-accent/20 p-4 text-card-foreground">
            <div className="text-sm font-semibold text-foreground">
              Как выглядит путь компании в Clarify
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Лендинг для бизнеса должен объяснять не набор разрозненных функций,
              а понятную последовательность: войти в кабинет, связать компанию с
              карточкой и после проверки перейти к работе с отзывами и
              филиалами.
            </p>

            <div className="mt-4 space-y-3">
              {mainFlow.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-[20px] border bg-background/90 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-accent/60">
                          {item.icon}
                        </span>
                        <div className="text-sm font-semibold text-foreground">
                          {item.title}
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="mt-3 inline-flex rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                        {item.badge}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[20px] border border-dashed bg-muted/20 p-4">
              <div className="text-sm font-medium text-foreground">
                Итог для бизнеса
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                После этого компания получает не хаотичный набор действий, а
                понятный рабочий контур: карточки, отзывы, официальные ответы и
                филиалы собираются в одной системе без лишней путаницы.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border bg-background/80 p-4 backdrop-blur">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Что здесь важно
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                Не просто регистрация, а прозрачный сценарий подключения
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Clarify показывает бизнесу последовательный путь: сначала кабинет
                и доступ, потом связь с карточкой, затем проверка, и только
                после этого — официальный диалог с клиентами и работа с
                филиалами.
              </p>
            </div>

            <div className="rounded-[24px] border bg-accent/40 p-4">
              <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                Что получает компания
              </div>

              <div className="mt-4 space-y-3">
                {valuePoints.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border bg-secondary/35 p-4">
              <div className="text-sm font-semibold text-foreground">
                Почему это выглядит органично
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Страница объясняет не всё сразу, а ведёт по этапам. Поэтому
                бизнесу легче понять, где начинается регистрация, где идёт claim,
                где включается модерация и что именно открывается после
                проверки.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}