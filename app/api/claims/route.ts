import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import { getSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z
  .object({
    placeId: z.string().min(1, "Карточка места обязательна"),
  })
  .strict();

const CLAIM_RETRY_COOLDOWN_SEC = 3 * 60 * 60;

type AppRouteError = Error & {
  status?: number;
  appErrorCode?: string;
  extra?: Record<string, unknown>;
};

function formatDurationFromSeconds(totalSec: number) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes} мин ${seconds} с` : `${minutes} мин`;
  }

  return `${seconds} с`;
}

function createAppError(
  message: string,
  status: number,
  code: string,
  extra?: Record<string, unknown>,
) {
  const err = new Error(message) as AppRouteError;

  err.status = status;
  err.appErrorCode = code;
  err.extra = extra;
  return err;
}

function isAppRouteError(err: unknown): err is AppRouteError {
  return err instanceof Error;
}

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "claims:create:ip",
        key: ip,
        limit: 20,
        windowSec: 30 * 60,
        errorMessage:
          "Слишком много попыток отправки claim-заявок. Попробуйте позже.",
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
      return NextResponse.json(
        { error: "Только компании могут заявлять права" },
        { status: 403 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: user.id },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Сначала завершите регистрацию компании" },
        { status: 400 },
      );
    }

    const companyRateLimit = await enforceRateLimits([
      {
        scope: "claims:create:company",
        key: company.id,
        limit: 6,
        windowSec: 60 * 60,
        errorMessage:
          "Слишком много заявок на права от этой компании. Попробуйте позже.",
      },
    ]);

    if (companyRateLimit) {
      return companyRateLimit;
    }

    const claim = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${company.id}),
          hashtext(${input.placeId})
        )
      `;

      const place = await tx.place.findUnique({
        where: { id: input.placeId },
        select: { id: true, companyId: true, name: true },
      });

      if (!place) {
        throw createAppError("Карточка места не найдена", 404, "PLACE_NOT_FOUND");
      }

      if (place.companyId) {
        if (place.companyId === company.id) {
          throw createAppError(
            "Эта карточка уже принадлежит вашей компании",
            409,
            "PLACE_ALREADY_OWNED_BY_YOU",
          );
        }

        throw createAppError(
          "У этой карточки уже есть подтверждённая компания",
          409,
          "PLACE_ALREADY_MANAGED",
        );
      }

      const claims = await tx.claim.findMany({
        where: {
          placeId: place.id,
          companyId: company.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      const hasPending = claims.some((item) => item.status === "PENDING");
      if (hasPending) {
        throw createAppError(
          "Вы уже отправили заявку на эту карточку",
          409,
          "CLAIM_ALREADY_PENDING",
        );
      }

      const hasApproved = claims.some((item) => item.status === "APPROVED");
      if (hasApproved) {
        throw createAppError(
          "Заявка уже была одобрена ранее",
          409,
          "CLAIM_ALREADY_APPROVED",
        );
      }

      const latestRejected =
        claims.find((item) => item.status === "REJECTED") ?? null;

      if (latestRejected) {
        const retryAfterSec =
          CLAIM_RETRY_COOLDOWN_SEC -
          Math.floor((Date.now() - latestRejected.createdAt.getTime()) / 1000);

        if (retryAfterSec > 0) {
          throw createAppError(
            `Повторную заявку можно отправить через ${formatDurationFromSeconds(
              retryAfterSec,
            )}`,
            429,
            "CLAIM_RETRY_COOLDOWN",
            { retryAfterSec },
          );
        }
      }

      return tx.claim.create({
        data: {
          placeId: place.id,
          companyId: company.id,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (err: unknown) {
    if (isAppRouteError(err) && err.appErrorCode) {
      return NextResponse.json(
        {
          error: err.message ?? "Ошибка",
          code: err.appErrorCode,
          ...(err.extra ?? {}),
        },
        { status: err.status ?? 400 },
      );
    }

    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("POST /api/claims failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}