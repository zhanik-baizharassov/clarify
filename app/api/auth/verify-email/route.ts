import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import { hashCode } from "@/server/email/verification";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Код должен быть из 6 цифр"),
});

function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function POST(req: Request) {
  try {
    const parsed = Schema.parse(await req.json());
    const email = parsed.email.trim().toLowerCase();
    const code = parsed.code;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        emailVerifiedAt: true,
        blockedUntil: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверный email или код" },
        { status: 400 },
      );
    }

    const now = new Date();

    if (user.blockedUntil && user.blockedUntil > now) {
      return NextResponse.json(
        {
          error: "Аккаунт заблокирован модерацией Clarify",
          code: "ACCOUNT_BLOCKED",
        },
        { status: 423 },
      );
    }

    if (user.role === "COMPANY") {
      const company = await prisma.company.findUnique({
        where: { ownerId: user.id },
        select: { blockedUntil: true },
      });

      if (company?.blockedUntil && company.blockedUntil > now) {
        return NextResponse.json(
          {
            error: "Компания заблокирована модерацией Clarify",
            code: "COMPANY_BLOCKED",
          },
          { status: 423 },
        );
      }
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        {
          error: "Email уже подтверждён. Войдите по паролю.",
          code: "ALREADY_VERIFIED",
        },
        { status: 409 },
      );
    }

    const rec = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email } },
      select: { codeHash: true, expiresAt: true, attempts: true },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Неверный email или код" },
        { status: 400 },
      );
    }

    if (rec.expiresAt < now) {
      return NextResponse.json(
        { error: "Код истёк. Нажмите «Отправить заново»." },
        { status: 400 },
      );
    }

    if (rec.attempts >= 5) {
      return NextResponse.json(
        { error: "Слишком много попыток. Отправьте новый код." },
        { status: 400 },
      );
    }

    const ok = hashCode(code) === rec.codeHash;

    if (!ok) {
      await prisma.emailVerification.update({
        where: { userId_email: { userId: user.id, email } },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });

      await tx.emailVerification.delete({
        where: { userId_email: { userId: user.id, email } },
      });

      await tx.session.create({
        data: { userId: user.id, token, expiresAt },
      });
    });

    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("VERIFY EMAIL ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}