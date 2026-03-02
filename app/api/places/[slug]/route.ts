import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = await prisma.place.findUnique({
    where: { slug: slug },
    include: {
      category: true,
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          tags: { include: { tag: true } },
          replies: { include: { company: true } },
        },
      },
    },
  });

  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(place);
}