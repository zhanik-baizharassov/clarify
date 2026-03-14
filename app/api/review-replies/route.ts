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

const Schema = z.object({
  reviewId: z.string().min(1),
  text: z.string().trim().min(2).max(2000),
});

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "review-replies:create:ip",
        key: ip,
        limit: 20,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток отправки ответов компании. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const input = Schema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }

    if (user.role !== "COMPANY") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 404 });
    }

    const companyRateLimit = await enforceRateLimits([
      {
        scope: "review-replies:create:company",
        key: company.id,
        limit: 10,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток отправки ответов от этой компании. Попробуйте позже.",
      },
    ]);

    if (companyRateLimit) {
      return companyRateLimit;
    }

    assertNoProfanity(input.text, "Ответ компании");

    const review = await prisma.review.findFirst({
      where: {
        id: input.reviewId,
        status: "PUBLISHED",
      },
      include: {
        place: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Отзыв не найден или недоступен" },
        { status: 404 },
      );
    }

    if (review.place.companyId !== company.id) {
      return NextResponse.json(
        { error: "Нет прав отвечать на этот отзыв" },
        { status: 403 },
      );
    }

    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: input.reviewId,
        companyId: company.id,
        text: input.text.trim(),
      },
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Вы уже отвечали на этот отзыв" },
        { status: 409 },
      );
    }

    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof Error && err.message.includes("недопустимые слова")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("REVIEW REPLY ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}