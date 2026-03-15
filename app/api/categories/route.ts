import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [activeCategories, usedCategoryRows] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      prisma.place.findMany({
        distinct: ["categoryId"],
        select: {
          categoryId: true,
        },
      }),
    ]);

    const usedCategoryIds = usedCategoryRows
      .map((row) => row.categoryId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const usedCategories = usedCategoryIds.length
      ? await prisma.category.findMany({
          where: {
            id: { in: usedCategoryIds },
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        })
      : [];

    const categories = Array.from(
      new Map(
        [...activeCategories, ...usedCategories].map((category) => [
          category.id,
          category,
        ]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, "ru-RU"));

    return NextResponse.json({ items: categories }, { status: 200 });
  } catch (err) {
    console.error("CATEGORIES GET ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}