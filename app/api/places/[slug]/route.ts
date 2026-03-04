import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const slug = params?.slug;

  if (!slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const place = await prisma.place.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          tags: { include: { tag: true } },
          replies: {
            include: {
              company: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(place);
}