"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  MessageCircleReply,
  Store,
} from "lucide-react";

type Mode = "reviews" | "branches" | "claim";

const tabs: {
  id: Mode;
  label: string;
}[] = [
  { id: "reviews", label: "Отзывы" },
  { id: "branches", label: "Филиалы" },
  { id: "claim", label: "Подтверждение" },
];

export default function BusinessShowcase() {
  const [mode, setMode] = useState<Mode>("reviews");

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-[0.92] rounded-[32px] bg-primary/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[28px] border bg-background/90 shadow-xl backdrop-blur">
        <div className="border-b bg-muted/[0.18] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl border bg-background p-1">
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

            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Demo-предпросмотр кабинета
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border bg-muted/[0.16] p-4">
            {mode === "reviews" && <ReviewsPreview />}
            {mode === "branches" && <BranchesPreview />}
            {mode === "claim" && <ClaimPreview />}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border bg-background p-4">
              <h3 className="text-sm font-semibold">Что чувствуется на странице</h3>
              <div className="mt-3 space-y-3">
                {[
                  "Можно переключать сценарии, а не просто читать одинаковые блоки.",
                  "Есть ощущение продукта и интерфейса, а не только маркетингового текста.",
                  "Правый блок в hero начинает работать как “вау”-якорь страницы.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border bg-gradient-to-br from-primary/[0.10] to-transparent p-4">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                Сейчас выбран режим
              </div>
              <div className="mt-2 text-lg font-semibold">
                {mode === "reviews" && "Работа с отзывами"}
                {mode === "branches" && "Управление филиалами"}
                {mode === "claim" && "Claim и подтверждение"}
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Этот блок можно потом развивать дальше: добавить анимации,
                подсветку состояний, мини-графики или переход к реальному
                кабинету компании.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Отзывы по филиалам</div>
          <div className="text-xs text-muted-foreground">
            Официальный формат ответа от лица бизнеса
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <MessageCircleReply className="h-3.5 w-3.5 text-primary" />
          Ответ доступен
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          {
            place: "Clarify Coffee • Абая",
            text: "Было бы здорово, если бы заказ готовили быстрее в час пик.",
            status: "Ждёт ответа",
          },
          {
            place: "Clarify Coffee • Dostyk",
            text: "Очень понравилось обслуживание, персонал вежливый.",
            status: "Ответ опубликован",
          },
        ].map((item) => (
          <div key={item.place} className="rounded-2xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{item.place}</div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border bg-background p-4">
        <div className="text-sm font-medium">Черновик ответа компании</div>
        <div className="mt-3 rounded-xl border bg-muted/[0.18] p-3 text-sm leading-6 text-muted-foreground">
          Спасибо за обратную связь. Передадим замечание команде филиала и
          проверим ситуацию в часы пик.
        </div>
      </div>
    </div>
  );
}

function BranchesPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Структура по филиалам</div>
          <div className="text-xs text-muted-foreground">
            Разделение карточек и отзывов по точкам
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <Store className="h-3.5 w-3.5 text-primary" />
          3 филиала
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          {
            name: "Абая 128",
            state: "Подключён",
            meta: "Отзывы и карточка активны",
          },
          {
            name: "Dostyk Plaza",
            state: "Подключён",
            meta: "Официальные ответы доступны",
          },
          {
            name: "Mega Alma-Ata",
            state: "Требует проверки",
            meta: "Карточка найдена в каталоге",
          },
        ].map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-4"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.meta}</div>
            </div>

            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                item.state === "Подключён"
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              ].join(" ")}
            >
              {item.state}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-primary" />
            Один кабинет
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Вся логика компании собирается в одном месте, а филиалы остаются
            раздельными по смыслу.
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Чистая структура
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Это особенно полезно, когда у бизнеса несколько точек с разными
            отзывами и разным качеством сервиса.
          </p>
        </div>
      </div>
    </div>
  );
}

function ClaimPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Подтверждение карточки</div>
          <div className="text-xs text-muted-foreground">
            Если место уже есть в каталоге
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <FileCheck2 className="h-3.5 w-3.5 text-primary" />
          Claim-flow
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          "Найдена существующая карточка бизнеса.",
          "Компания подаёт заявку на подтверждение.",
          "После проверки открывается управление карточкой.",
        ].map((item, index) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-2xl border bg-background p-4"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed bg-background p-4">
        <div className="text-sm font-medium">Зачем это лучше, чем дублировать карточки</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Каталог остаётся чище, а у бизнеса появляется логичный путь входа без
          создания дублей и лишней путаницы.
        </p>
      </div>
    </div>
  );
}