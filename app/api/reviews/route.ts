import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertNoProfanity } from "@/lib/profanity";

export const runtime = "nodejs";

const CreateReviewSchema = z.object({
  placeSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5).max(5000),
  tagSlugs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = CreateReviewSchema.parse(body);

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "USER") {
      return NextResponse.json({ error: "Компания не может оставлять отзывы" }, { status: 403 });
    }

    // ✅ profanity-check
    assertNoProfanity(input.text, "Отзыв");

    const place = await prisma.place.findUnique({ where: { slug: input.placeSlug } });
    if (!place) return NextResponse.json({ error: "Place not found" }, { status: 404 });

    const tags = input.tagSlugs?.length
      ? await prisma.tag.findMany({ where: { slug: { in: input.tagSlugs } } })
      : [];

    const created = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          placeId: place.id,
          authorId: user.id, // ✅ всегда
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
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные формы";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (err?.message?.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("REVIEWS POST ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}