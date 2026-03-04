import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ items: tags });
  } catch (err) {
    console.error("GET /api/tags failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}