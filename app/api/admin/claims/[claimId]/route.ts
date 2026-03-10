import { NextResponse } from "next/server";
import { ClaimStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const { claimId } = await params;
    const input = Schema.parse(await req.json());

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

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        status: true,
        placeId: true,
        companyId: true,
        place: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (claim.status !== ClaimStatus.PENDING) {
      return NextResponse.json(
        { error: "Эта заявка уже была обработана" },
        { status: 409 },
      );
    }

    if (input.action === "REJECT") {
      const rejected = await prisma.claim.update({
        where: { id: claim.id },
        data: { status: ClaimStatus.REJECTED },
        select: { id: true, status: true },
      });

      return NextResponse.json(rejected);
    }

    if (
      claim.place.companyId &&
      claim.place.companyId !== claim.companyId
    ) {
      return NextResponse.json(
        { error: "У карточки уже есть другая подтверждённая компания" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const approvedClaim = await tx.claim.update({
        where: { id: claim.id },
        data: { status: ClaimStatus.APPROVED },
        select: { id: true, status: true, placeId: true, companyId: true },
      });

      await tx.place.update({
        where: { id: claim.placeId },
        data: { companyId: claim.companyId },
      });

      await tx.claim.updateMany({
        where: {
          placeId: claim.placeId,
          status: ClaimStatus.PENDING,
          id: { not: claim.id },
        },
        data: { status: ClaimStatus.REJECTED },
      });

      return approvedClaim;
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Не удалось обработать заявку" },
        { status: 400 },
      );
    }

    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("PATCH /api/admin/claims/[claimId] failed:", err);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}