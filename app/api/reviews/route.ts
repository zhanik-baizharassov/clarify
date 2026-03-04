// app/api/reviews/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { assertNoProfanity } from "@/server/security/profanity";

export const runtime = "nodejs";

const CreateReviewSchema = z.object({
  placeSlug: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(5).max(5000),
  tagSlugs: z.array(z.string().trim().min(1)).optional(),
});

export async function POST(req: Request) {
  try {
    const input = CreateReviewSchema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (user.role !== "USER") {
      return NextResponse.json(
        { error: "Компания не может оставлять отзывы" },
        { status: 403 },
      );
    }

    assertNoProfanity(input.text, "Отзыв");

    const created = await prisma.$transaction(async (tx) => {
      const place = await tx.place.findUnique({
        where: { slug: input.placeSlug },
        select: { id: true, avgRating: true, ratingCount: true },
      });
      if (!place) {
        // бросаем ошибку, чтобы выйти из транзакции
        throw new Error("PLACE_NOT_FOUND");
      }

      // ✅ защита от дубля (1 отзыв на 1 место от 1 юзера)
      const already = await tx.review.findFirst({
        where: { placeId: place.id, authorId: user.id },
        select: { id: true },
      });
      if (already) {
        throw new Error("REVIEW_ALREADY_EXISTS");
      }

      const uniqTagSlugs = input.tagSlugs
        ? Array.from(new Set(input.tagSlugs.map((s) => s.trim()).filter(Boolean)))
        : [];

      const tags = uniqTagSlugs.length
        ? await tx.tag.findMany({ where: { slug: { in: uniqTagSlugs } } })
        : [];

      const review = await tx.review.create({
        data: {
          placeId: place.id,
          authorId: user.id,
          rating: input.rating,
          text: input.text,
          status: "PUBLISHED",
          tags: tags.length
            ? { createMany: { data: tags.map((t) => ({ tagId: t.id })) } }
            : undefined,
        },
      });

      // ✅ безопаснее: считаем от актуального place внутри tx
      const newCount = place.ratingCount + 1;
      const newAvg =
        (place.avgRating * place.ratingCount + input.rating) / newCount;

      await tx.place.update({
        where: { id: place.id },
        data: { ratingCount: newCount, avgRating: newAvg },
      });

      return review;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.message === "PLACE_NOT_FOUND") {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }
    if (err?.message === "REVIEW_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "Вы уже оставляли отзыв для этого места" },
        { status: 409 },
      );
    }

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