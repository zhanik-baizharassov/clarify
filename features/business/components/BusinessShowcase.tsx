"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  MessageCircleReply,
  Store,
} from "lucide-react";

type Mode = "replies" | "claims" | "branches";

const tabs: { id: Mode; label: string }[] = [
  { id: "replies", label: "Ответы" },
  { id: "claims", label: "Карточки" },
  { id: "branches", label: "Филиалы" },
];

const modeContent: Record<
  Mode,
  {
    title: string;
    description: string;
    bullets: string[];
    badge: string;
  }
> = {
  replies: {
    title: "Официальные ответы на отзывы",
    description:
      "Компания показывает, что она присутствует на платформе не формально, а действительно работает с обратной связью.",
    bullets: [
      "Ответы публикуются от имени бизнеса.",
      "Диалог с клиентом выглядит более официально.",
      "Отзывы и ответы можно держать в логике конкретной точки.",
    ],
    badge: "Публичная коммуникация",
  },
  claims: {
    title: "Подтверждение существующих карточек",
    description:
      "Если место уже есть в каталоге Clarify, бизнес не дублирует его заново, а проходит более чистый claim-сценарий.",
    bullets: [
      "Не нужно плодить одинаковые карточки.",
      "Управление открывается после проверки.",
      "Каталог остаётся аккуратнее и понятнее.",
    ],
    badge: "Claim-flow",
  },
  branches: {
    title: "Работа с несколькими филиалами",
    description:
      "Когда у компании несколько точек, важно управлять ими из одного кабинета, но не смешивать их между собой.",
    bullets: [
      "Один бизнес-кабинет для нескольких точек.",
      "Отзывы филиалов не смешиваются в один поток.",
      "Легче поддерживать структуру бизнеса на платформе.",
    ],
    badge: "Мультифилиальная логика",
  },
};

export default function BusinessShowcase() {
  const [mode, setMode] = useState<Mode>("replies");

  const current = useMemo(() => modeContent[mode], [mode]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-[0.94] rounded-[36px] bg-primary/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[30px] border bg-background/72 shadow-xl shadow-primary/10 backdrop-blur-md">
        <div className="border-b bg-muted/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl border bg-background/85 p-1">
              {tabs.map((tab) => {
                const active = mode === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMode(tab.id)}
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Бизнес-поток Clarify
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[24px] border bg-gradient-to-b from-card to-accent/20 p-4 text-card-foreground">
            {mode === "replies" && <RepliesPreview />}
            {mode === "claims" && <ClaimsPreview />}
            {mode === "branches" && <BranchesPreview />}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border bg-background/80 p-4 backdrop-blur">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Сейчас показан сценарий
              </div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {current.title}
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {current.description}
              </p>
            </div>

            <div className="rounded-[24px] border bg-accent/40 p-4">
              <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                {current.badge}
              </div>

              <div className="mt-4 space-y-3">
                {current.bullets.map((item) => (
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
                Почему это важно бизнесу
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Компания получает не просто место в каталоге, а понятный
                сценарий присутствия: подтвердить карточку, отвечать на отзывы и
                держать филиалы в одной системе без путаницы.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepliesPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Работа с отзывами
          </div>
          <div className="text-xs text-muted-foreground">
            Официальный ответ от лица бизнеса
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <MessageCircleReply className="h-3.5 w-3.5 text-primary" />
          Ответ доступен
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[20px] border bg-background p-4">
          <div className="text-sm font-medium text-foreground">
            Отзыв о филиале
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Пользователь оставил отзыв о сервисе, и компании важно не
            игнорировать обратную связь публично.
          </p>
        </div>

        <div className="rounded-[20px] border bg-accent/35 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Официальный ответ компании
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Спасибо за обратную связь. Мы передали комментарий команде и
            дополнительно проверим ситуацию внутри точки.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-dashed bg-muted/20 p-4">
        <div className="text-sm font-medium text-foreground">
          Что получает бизнес
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ответ выглядит не как случайный комментарий, а как официальный сигнал,
          что компания присутствует на платформе и работает с клиентским опытом.
        </p>
      </div>
    </div>
  );
}

function ClaimsPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Подтверждение карточки
          </div>
          <div className="text-xs text-muted-foreground">
            Если место уже есть в каталоге
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <FileCheck2 className="h-3.5 w-3.5 text-primary" />
          Claim-сценарий
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          {
            title: "Карточка найдена в каталоге",
            text: "Бизнес уже присутствует на платформе и не должен создавать дубликат.",
          },
          {
            title: "Подана заявка на подтверждение",
            text: "Компания запрашивает связь с существующей карточкой через более чистый сценарий.",
          },
          {
            title: "После проверки открывается управление",
            text: "Когда claim проходит нужный этап, компания получает доступ к работе с карточкой.",
          },
        ].map((item, index) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-[20px] border bg-background p-4"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <div>
              <div className="text-sm font-medium text-foreground">
                {item.title}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchesPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Управление филиалами
          </div>
          <div className="text-xs text-muted-foreground">
            Когда у бизнеса несколько точек
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Store className="h-3.5 w-3.5 text-primary" />
          Единый кабинет
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          {
            title: "Основной филиал",
            state: "Подключён",
            meta: "Карточка компании связана с кабинетом.",
          },
          {
            title: "Вторая точка",
            state: "В работе",
            meta: "Филиал добавляется в общую структуру бизнеса.",
          },
          {
            title: "Новая карточка",
            state: "Ожидает действия",
            meta: "Следующий шаг — связать точку с бизнесом по нужному сценарию.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between gap-3 rounded-[20px] border bg-background p-4"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                {item.title}
              </div>
              <div className="text-xs text-muted-foreground">{item.meta}</div>
            </div>

            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                item.state === "Подключён"
                  ? "bg-primary/10 text-primary"
                  : item.state === "В работе"
                    ? "bg-muted text-muted-foreground"
                    : "bg-secondary text-secondary-foreground",
              ].join(" ")}
            >
              {item.state}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Один кабинет
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            У компании остаётся единая точка входа для работы с присутствием на
            платформе.
          </p>
        </div>

        <div className="rounded-[20px] border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Без путаницы
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Отзывы и карточки филиалов не смешиваются в один хаотичный поток.
          </p>
        </div>
      </div>
    </div>
  );
}