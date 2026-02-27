import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertNoProfanity } from "@/lib/profanity";
import { assertKzCity, assertKzMobilePhone, isKzCity, isKzMobilePhone } from "@/lib/kz";

export const runtime = "nodejs";

const Schema = z.object({
  categoryId: z.string().min(1),
  city: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .refine((v) => isKzCity(v), "Выберите город Казахстана"),
  address: z.string().trim().min(5).max(200),
  phone: z
    .string()
    .trim()
    .min(1, "Введите номер телефона")
    .refine((v) => isKzMobilePhone(v), "Введите казахстанский номер"),
  workHours: z.string().trim().min(2).max(120),
});

function slugifyAscii(s: string) {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "company";
}

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "COMPANY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const company = await prisma.company.findFirst({
      where: { ownerId: user.id },
      select: { id: true, name: true, bin: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    // ✅ нормализация/валидация KZ
    const city = assertKzCity(input.city);
    const phone = assertKzMobilePhone(input.phone);

    // ✅ profanity-check
    assertNoProfanity(company.name, "Название компании");
    assertNoProfanity(input.address, "Адрес филиала");

    const slug = `${slugifyAscii(company.name)}-${company.bin ?? company.id.slice(0, 6)}-${Date.now().toString(
      36
    )}-${crypto.randomUUID().slice(0, 6)}`;

    const place = await prisma.place.create({
      data: {
        name: company.name,
        slug,
        categoryId: input.categoryId,
        city, // ✅ нормализованный
        address: input.address,
        phone, // ✅ нормализованный
        workHours: input.workHours,
        companyId: company.id,
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json(place, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err?.message === "Введите казахстанский номер") {
      return NextResponse.json({ error: "Введите казахстанский номер" }, { status: 400 });
    }
    console.error("CREATE BRANCH ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}