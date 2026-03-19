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
        className="pointer-events-none absolute inset-0 scale-[0.94] rounded-[36px] bg-white/25 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[30px] border border-white/25 bg-white/12 shadow-[0_20px_70px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="border-b border-white/15 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl border border-white/15 bg-white/10 p-1">
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
                        ? "bg-white text-[#418fe4] shadow-[0_10px_24px_rgba(255,255,255,0.22)]"
                        : "text-white/80 hover:text-white",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <BadgeCheck className="h-3.5 w-3.5" />
              Бизнес-поток Clarify
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(240,248,255,0.82)_100%)] p-4 text-slate-950">
            {mode === "replies" && <RepliesPreview />}
            {mode === "claims" && <ClaimsPreview />}
            {mode === "branches" && <BranchesPreview />}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/20 bg-white/12 p-4 text-white backdrop-blur">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                Сейчас показан сценарий
              </div>
              <div className="mt-2 text-lg font-semibold">{current.title}</div>
              <p className="mt-2 text-sm leading-7 text-white/88">
                {current.description}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/12 p-4 text-white backdrop-blur">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                {current.badge}
              </div>

              <div className="mt-4 space-y-3">
                {current.bullets.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    <p className="text-sm leading-6 text-white/88">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.10)_100%)] p-4 text-white">
              <div className="text-sm font-semibold">
                Зачем этот блок нужен на странице
              </div>
              <p className="mt-2 text-sm leading-7 text-white/86">
                Вместо сухого набора одинаковых карточек пользователь сразу
                видит, как выглядит бизнес-логика Clarify: ответы, claim и
                филиалы. Это делает страницу живее и дороже по ощущению.
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
          <div className="text-sm font-semibold text-slate-950">
            Работа с отзывами
          </div>
          <div className="text-xs text-slate-500">
            Официальный ответ от лица бизнеса
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7eaff] bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#3f90e5]">
          <MessageCircleReply className="h-3.5 w-3.5" />
          Ответ доступен
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[20px] border border-[#d8eaff] bg-white p-4">
          <div className="text-sm font-medium text-slate-950">
            Отзыв о филиале
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Пользователь оставил отзыв о сервисе и компании важно не
            игнорировать обратную связь публично.
          </p>
        </div>

        <div className="rounded-[20px] border border-[#cfe5ff] bg-[linear-gradient(180deg,#f8fcff_0%,#edf6ff_100%)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
            <BadgeCheck className="h-4 w-4 text-[#4292e6]" />
            Официальный ответ компании
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Спасибо за обратную связь. Мы передали комментарий команде и
            дополнительно проверим ситуацию внутри точки.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-dashed border-[#cfe5ff] bg-[#f8fcff] p-4">
        <div className="text-sm font-medium text-slate-950">
          Что получает бизнес
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
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
          <div className="text-sm font-semibold text-slate-950">
            Подтверждение карточки
          </div>
          <div className="text-xs text-slate-500">
            Если место уже есть в каталоге
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7eaff] bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#3f90e5]">
          <FileCheck2 className="h-3.5 w-3.5" />
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
            className="flex items-start gap-3 rounded-[20px] border border-[#d8eaff] bg-white p-4"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6ab7ff_0%,#4e9df2_100%)] text-xs font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <div className="text-sm font-medium text-slate-950">
                {item.title}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
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
          <div className="text-sm font-semibold text-slate-950">
            Управление филиалами
          </div>
          <div className="text-xs text-slate-500">
            Когда у бизнеса несколько точек
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7eaff] bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#3f90e5]">
          <Store className="h-3.5 w-3.5" />
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
            className="flex items-center justify-between gap-3 rounded-[20px] border border-[#d8eaff] bg-white p-4"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-950">
                {item.title}
              </div>
              <div className="text-xs text-slate-500">{item.meta}</div>
            </div>

            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                item.state === "Подключён"
                  ? "bg-[#eaf6ff] text-[#3f90e5]"
                  : item.state === "В работе"
                    ? "bg-[#f2f8ff] text-slate-600"
                    : "bg-[#fff5df] text-[#b57a00]",
              ].join(" ")}
            >
              {item.state}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-[#d8eaff] bg-[#f8fcff] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
            <Building2 className="h-4 w-4 text-[#4292e6]" />
            Один кабинет
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            У компании остаётся единая точка входа для работы с присутствием на
            платформе.
          </p>
        </div>

        <div className="rounded-[20px] border border-[#d8eaff] bg-[#f8fcff] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
            <BadgeCheck className="h-4 w-4 text-[#4292e6]" />
            Без путаницы
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Отзывы и карточки филиалов не смешиваются в один хаотичный поток.
          </p>
        </div>
      </div>
    </div>
  );
}