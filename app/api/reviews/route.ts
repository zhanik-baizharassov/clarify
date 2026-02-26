import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const CreateReviewSchema = z.object({
  placeSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5).max(5000),
  tagSlugs: z.array(z.string()).optional(),
  authorName: z.string().min(2).max(80).optional(),
  authorPhone: z.string().min(5).max(30).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const input = CreateReviewSchema.parse(body);

  const user = await getSessionUser();
  const isUser = user?.role === "USER";

  const place = await prisma.place.findUnique({ where: { slug: input.placeSlug } });
  if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

  const tags = input.tagSlugs?.length
    ? await prisma.tag.findMany({ where: { slug: { in: input.tagSlugs } } })
    : [];

  const created = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        placeId: place.id,
        rating: input.rating,
        text: input.text,

        // ✅ главное: автор проставляется автоматически для залогиненного USER
        authorId: isUser ? user!.id : undefined,

        // гостевые поля — только для гостя (для USER можно подставить имя из профиля)
        authorName: isUser ? (user?.name ?? null) : (input.authorName ?? null),
        authorPhone: isUser ? null : (input.authorPhone ?? null),

        status: "PUBLISHED",
        tags: tags.length
          ? { createMany: { data: tags.map((t) => ({ tagId: t.id })) } }
          : undefined,
      },
    });

    // пересчёт рейтинга (быстрый MVP)
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