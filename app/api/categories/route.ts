// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items: categories }, { status: 200 });
  } catch (err) {
    console.error("CATEGORIES GET ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}