import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z
  .object({
    placeId: z.string().min(1, "Карточка места обязательна"),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }

    if (user.role !== "COMPANY") {
      return NextResponse.json({ error: "Только компании могут заявлять права" }, { status: 403 });
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

    const place = await prisma.place.findUnique({
      where: { id: input.placeId },
      select: { id: true, companyId: true, name: true },
    });

    if (!place) {
      return NextResponse.json({ error: "Карточка места не найдена" }, { status: 404 });
    }

    if (place.companyId) {
      if (place.companyId === company.id) {
        return NextResponse.json(
          { error: "Эта карточка уже принадлежит вашей компании" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "У этой карточки уже есть подтверждённая компания" },
        { status: 409 },
      );
    }

    const existingClaim = await prisma.claim.findFirst({
      where: {
        placeId: place.id,
        companyId: company.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingClaim?.status === "PENDING") {
      return NextResponse.json(
        { error: "Вы уже отправили заявку на эту карточку" },
        { status: 409 },
      );
    }

    if (existingClaim?.status === "APPROVED") {
      return NextResponse.json(
        { error: "Заявка уже была одобрена ранее" },
        { status: 409 },
      );
    }

    const claim = await prisma.claim.create({
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

    return NextResponse.json(claim, { status: 201 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Не удалось создать заявку" },
        { status: 400 },
      );
    }

    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("POST /api/claims failed:", err);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}