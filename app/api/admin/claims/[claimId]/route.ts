import { NextResponse } from "next/server";
import { ClaimStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";
import { readJsonBody } from "@/server/security/json";
import { isZodError } from "@/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
  })
  .strict();

// Бросается внутри транзакции после привязки места, чтобы откатить её:
// иначе при отказе привязка companyId осталась бы, а заявка — PENDING.
class ClaimTxAbort extends Error {
  constructor(readonly reason: "already_processed" | "place_taken") {
    super(reason);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;
    const { claimId } = await params;
    const input = Schema.parse(await readJsonBody(req));

    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    if (!claimId) {
      return NextResponse.json({ error: "Не указана заявка" }, { status: 400 });
    }

    if (input.action === "REJECT") {
      const rejectResult = await prisma.claim.updateMany({
        where: {
          id: claimId,
          status: ClaimStatus.PENDING,
        },
        data: {
          status: ClaimStatus.REJECTED,
        },
      });

      if (rejectResult.count === 0) {
        const existing = await prisma.claim.findUnique({
          where: { id: claimId },
          select: { id: true, status: true },
        });

        if (!existing) {
          return NextResponse.json(
            { error: "Заявка не найдена" },
            { status: 404 },
          );
        }

        return NextResponse.json(
          { error: "Эта заявка уже была обработана" },
          { status: 409 },
        );
      }

      const rejected = await prisma.claim.findUnique({
        where: { id: claimId },
        select: { id: true, status: true },
      });

      return NextResponse.json(rejected);
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentClaim = await tx.claim.findUnique({
        where: { id: claimId },
        select: {
          id: true,
          status: true,
          placeId: true,
          companyId: true,
        },
      });

      if (!currentClaim) {
        return { type: "not_found" as const };
      }

      if (currentClaim.status !== ClaimStatus.PENDING) {
        return { type: "already_processed" as const };
      }

      const placeBindResult = await tx.place.updateMany({
        where: {
          id: currentClaim.placeId,
          OR: [{ companyId: null }, { companyId: currentClaim.companyId }],
        },
        data: {
          companyId: currentClaim.companyId,
        },
      });

      if (placeBindResult.count === 0) {
        return { type: "place_taken" as const };
      }

      const existingApprovedClaim = await tx.claim.findFirst({
        where: {
          placeId: currentClaim.placeId,
          status: ClaimStatus.APPROVED,
          id: { not: currentClaim.id },
        },
        select: {
          id: true,
          companyId: true,
        },
      });

      if (existingApprovedClaim) {
        throw new ClaimTxAbort(
          existingApprovedClaim.companyId === currentClaim.companyId
            ? "already_processed"
            : "place_taken",
        );
      }

      const approveResult = await tx.claim.updateMany({
        where: {
          id: currentClaim.id,
          status: ClaimStatus.PENDING,
        },
        data: {
          status: ClaimStatus.APPROVED,
        },
      });

      if (approveResult.count === 0) {
        throw new ClaimTxAbort("already_processed");
      }

      await tx.claim.updateMany({
        where: {
          placeId: currentClaim.placeId,
          status: ClaimStatus.PENDING,
          id: { not: currentClaim.id },
        },
        data: {
          status: ClaimStatus.REJECTED,
        },
      });

      const approvedClaim = await tx.claim.findUnique({
        where: { id: currentClaim.id },
        select: {
          id: true,
          status: true,
          placeId: true,
          companyId: true,
        },
      });

      return {
        type: "ok" as const,
        claim: approvedClaim,
      };
    }).catch((e: unknown) => {
      if (e instanceof ClaimTxAbort) {
        return e.reason === "place_taken"
          ? { type: "place_taken" as const }
          : { type: "already_processed" as const };
      }
      throw e;
    });

    if (result.type === "not_found") {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (result.type === "already_processed") {
      return NextResponse.json(
        { error: "Эта заявка уже была обработана" },
        { status: 409 },
      );
    }

    if (result.type === "place_taken") {
      return NextResponse.json(
        { error: "У карточки уже есть другая подтверждённая компания" },
        { status: 409 },
      );
    }

    return NextResponse.json(result.claim);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Не удалось обработать заявку" },
        { status: 400 },
      );
    }

    if (isZodError(err)) {
      const msg = err.issues[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("PATCH /api/admin/claims/[claimId] failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
