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

const Schema = z
  .object({
    name: z.string().trim().min(2, "Название: минимум 2 символа").max(120, "Название слишком длинное"),
    categoryId: z.string().min(1, "Категория обязательна"),
    city: z.string().trim().min(2, "Город обязателен").max(60, "Город слишком длинный"),
    address: z.string().trim().min(5, "Адрес: минимум 5 символов").max(200, "Адрес слишком длинный"),
    phone: z.string().trim().max(30, "Телефон слишком длинный").optional().default(""),
    website: z.string().trim().max(200, "Сайт слишком длинный").optional().default(""),
    workHours: z.string().trim().max(120, "Время работы слишком длинное").optional().default(""),
    description: z.string().trim().max(500, "Описание слишком длинное").optional().default(""),
  })
  .strict();

function translitRuKz(s: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    ә: "a", ө: "o", ү: "u", ұ: "u", қ: "k", ғ: "g", ң: "n", і: "i", һ: "h",
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

function normalizeOptionalUrl(raw: string) {
  const value = raw.trim();
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error("Сайт: укажите корректный URL, например https://example.kz");
  }
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
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
    }

    assertNoProfanity(input.name, "Название места");
    assertNoProfanity(input.address, "Адрес");
    if (input.description.trim()) {
      assertNoProfanity(input.description, "Описание");
    }

    const city = assertKzCity(input.city, "Город");
    const phone = input.phone.trim()
      ? normalizeKzPhone(input.phone, "Телефон")
      : undefined;
    const website = normalizeOptionalUrl(input.website ?? "");

    const { lat, lng } = await validateKzAddress({
      city,
      address: input.address,
    });

    const slug = `${slugifyAscii(`${input.name}-${city}`)}-${Date.now().toString(
      36,
    )}-${crypto.randomUUID().slice(0, 6)}`;

    const place = await prisma.place.create({
      data: {
        name: input.name.trim(),
        slug,
        categoryId: input.categoryId,
        city,
        address: input.address.trim(),
        phone,
        website,
        workHours: input.workHours.trim() || undefined,
        description: input.description.trim() || undefined,
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
          { error: "Карточка уже существует или slug конфликтует" },
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
        err.message.includes("Описание") ||
        err.message.includes("Сайт") ||
        err.message.includes("недопустимые слова")
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    console.error("POST /api/admin/places failed:", err);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}