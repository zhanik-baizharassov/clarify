import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const CreateReviewSchema = z.object({
  placeSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5).max(5000),
  tagSlugs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const input = CreateReviewSchema.parse(body);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "USER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const place = await prisma.place.findUnique({ where: { slug: input.placeSlug } });
  if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

  const tags = input.tagSlugs?.length
    ? await prisma.tag.findMany({ where: { slug: { in: input.tagSlugs } } })
    : [];

  const created = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        placeId: place.id,
        authorId: user.id, // ✅
        authorName: user.name ?? null,
        rating: input.rating,
        text: input.text,
        status: "PUBLISHED",
        tags: tags.length
          ? { createMany: { data: tags.map((t) => ({ tagId: t.id })) } }
          : undefined,
      },
    });

    const newCount = place.ratingCount + 1;
    const newAvg = (place.avgRating * place.ratingCount + input.rating) / newCount;

    await tx.place.update({
      where: { id: place.id },
      data: { ratingCount: newCount, avgRating: newAvg },
    });

    return review;
  });

  return NextResponse.json(created, { status: 201 });
}