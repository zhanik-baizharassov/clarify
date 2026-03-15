import crypto from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { validateKzAddress } from "@/server/address/validate";
import { assertNoProfanity } from "@/server/security/profanity";
import { assertKzCity, normalizeKzPhone } from "@/shared/kz/kz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Время: формат 09:00");

const Schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Название: минимум 2 символа")
      .max(120, "Название слишком длинное"),
    categoryId: z.string().min(1, "Категория обязательна"),
    city: z
      .string()
      .trim()
      .min(2, "Город обязателен")
      .max(60, "Город слишком длинный"),
    address: z
      .string()
      .trim()
      .min(5, "Адрес: минимум 5 символов")
      .max(200, "Адрес слишком длинный"),
    phone: z
      .string()
      .trim()
      .min(5, "Телефон обязателен")
      .max(30, "Телефон слишком длинный"),

    weekdayOpen: timeSchema,
    weekdayClose: timeSchema,

    weekendClosed: z.boolean(),
    weekendOpen: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Время: формат 09:00")
      .nullable(),
    weekendClose: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Время: формат 09:00")
      .nullable(),
  })
  .strict();

function translitRuKz(s: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ә: "a",
    ө: "o",
    ү: "u",
    ұ: "u",
    қ: "k",
    ғ: "g",
    ң: "n",
    і: "i",
    һ: "h",
  };

  return s
    .split("")
    .map((ch) => {
      const low = ch.toLowerCase();
      const tr = map[low];
      if (!tr) return ch;
      return ch === low ? tr : tr.toUpperCase();
    })
    .join("");
}

function slugifyAscii(s: string) {
  const base = translitRuKz(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return base || "place";
}

function toMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function assertValidRange(from: string, to: string, label: string) {
  if (toMinutes(from) >= toMinutes(to)) {
    throw new Error(`${label}: значение «С» должно быть раньше, чем «До»`);
  }
}

function buildWorkHours(input: z.infer<typeof Schema>) {
  assertValidRange(input.weekdayOpen, input.weekdayClose, "Будние дни");

  if (input.weekendClosed) {
    return `Пн–Пт ${input.weekdayOpen}–${input.weekdayClose} • Сб–Вс выходной`;
  }

  if (!input.weekendOpen || !input.weekendClose) {
    throw new Error(
      "Выходные дни: укажите время работы или включите режим выходного",
    );
  }

  assertValidRange(input.weekendOpen, input.weekendClose, "Выходные дни");

  return `Пн–Пт ${input.weekdayOpen}–${input.weekdayClose} • Сб–Вс ${input.weekendOpen}–${input.weekendClose}`;
}

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true, isActive: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 400 },
      );
    }

    if (!category.isActive) {
      return NextResponse.json(
        { error: "Эта категория отключена и недоступна для новых карточек" },
        { status: 400 },
      );
    }

    const placeName = input.name.trim();

    assertNoProfanity(placeName, "Название места");
    assertNoProfanity(input.address, "Адрес");

    const city = assertKzCity(input.city, "Город");
    const phone = normalizeKzPhone(input.phone, "Телефон");
    const workHours = buildWorkHours(input);

    const { lat, lng, normalizedAddress } = await validateKzAddress({
      city,
      address: input.address,
    });

    const existingPlace = await prisma.place.findFirst({
      where: {
        city,
        address: normalizedAddress,
        name: placeName,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (existingPlace) {
      return NextResponse.json(
        { error: "Такая карточка уже существует по этому адресу" },
        { status: 409 },
      );
    }

    const slug = `${slugifyAscii(`${input.name}-${city}`)}-${Date.now().toString(
      36,
    )}-${crypto.randomUUID().slice(0, 6)}`;

    const place = await prisma.place.create({
      data: {
        name: placeName,
        slug,
        categoryId: input.categoryId,
        city,
        address: normalizedAddress,
        phone,
        workHours,
        lat,
        lng,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    return NextResponse.json(place, { status: 201 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Такая карточка уже существует по этому адресу" },
          { status: 409 },
        );
      }
    }

    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && err.message) {
      if (
        err.message.includes("Телефон") ||
        err.message.includes("Город") ||
        err.message.includes("Адрес") ||
        err.message.includes("Название") ||
        err.message.includes("Будние дни") ||
        err.message.includes("Выходные дни") ||
        err.message.includes("недопустимые слова") ||
        err.message.includes("2GIS")
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    console.error("POST /api/admin/places failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
