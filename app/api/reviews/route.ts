import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
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
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "reviews:create:ip",
        key: ip,
        limit: 20,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток отправки отзывов. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const input = CreateReviewSchema.parse(await req.json());
    const trimmedText = input.text.trim();

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

    const userRateLimit = await enforceRateLimits([
      {
        scope: "reviews:create:user",
        key: user.id,
        limit: 5,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток отправки отзывов с этого аккаунта. Попробуйте позже.",
      },
    ]);

    if (userRateLimit) {
      return userRateLimit;
    }

    assertNoProfanity(trimmedText, "Отзыв");

    const created = await prisma.$transaction(async (tx) => {
      const place = await tx.place.findUnique({
        where: { slug: input.placeSlug },
        select: { id: true },
      });

      if (!place) {
        throw new Error("PLACE_NOT_FOUND");
      }

      const uniqTagSlugs = input.tagSlugs
        ? Array.from(new Set(input.tagSlugs.map((s) => s.trim()).filter(Boolean)))
        : [];

      const tags = uniqTagSlugs.length
        ? await tx.tag.findMany({
            where: {
              slug: { in: uniqTagSlugs },
              isActive: true,
            },
            select: { id: true, slug: true },
          })
        : [];

      if (uniqTagSlugs.length && tags.length !== uniqTagSlugs.length) {
        throw new Error("INVALID_TAGS");
      }

      const review = await tx.review.create({
        data: {
          placeId: place.id,
          authorId: user.id,
          rating: input.rating,
          text: trimmedText,
          status: "PUBLISHED",
          tags: tags.length
            ? {
                createMany: {
                  data: tags.map((t) => ({ tagId: t.id })),
                },
              }
            : undefined,
        },
      });

      await tx.$executeRaw`
        UPDATE "Place"
        SET
          "avgRating" = (("avgRating" * "ratingCount") + ${input.rating}) / ("ratingCount" + 1),
          "ratingCount" = "ratingCount" + 1
        WHERE "id" = ${place.id}
      `;

      return review;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "PLACE_NOT_FOUND") {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }

    if (err instanceof Error && err.message === "INVALID_TAGS") {
      return NextResponse.json(
        { error: "Один или несколько тегов недоступны" },
        { status: 400 },
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Вы уже оставляли отзыв для этого места" },
        { status: 409 },
      );
    }

    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные формы";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && err.message.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("REVIEWS POST ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}