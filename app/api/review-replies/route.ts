import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  reviewId: z.string().min(1),
  text: z.string().trim().min(2).max(2000),
});

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "COMPANY") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const company = await prisma.company.findFirst({ where: { ownerId: user.id }, select: { id: true, name: true } });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const review = await prisma.review.findUnique({
      where: { id: input.reviewId },
      include: { place: { select: { companyId: true } } },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    // ✅ отвечать можно только на отзывы по своим карточкам (Place)
    if (review.place.companyId !== company.id) {
      return NextResponse.json({ error: "Нет прав отвечать на этот отзыв" }, { status: 403 });
    }

    const exists = await prisma.reviewReply.findFirst({
      where: { reviewId: input.reviewId, companyId: company.id },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ error: "Вы уже отвечали на этот отзыв" }, { status: 409 });

    const reply = await prisma.reviewReply.create({
      data: { reviewId: input.reviewId, companyId: company.id, text: input.text },
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("REPLY ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}