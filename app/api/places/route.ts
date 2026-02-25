import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category") ?? undefined; // slug категории
  const city = (searchParams.get("city") ?? "").trim() || undefined;

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? "10")));
  const skip = (page - 1) * pageSize;

  const where: any = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.place.findMany({
      where,
      include: { category: true },
      orderBy: [{ avgRating: "desc" }, { ratingCount: "desc" }, { name: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.place.count({ where }),
  ]);

  return NextResponse.json({ items, page, pageSize, total });
}