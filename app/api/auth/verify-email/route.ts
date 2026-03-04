// app/api/auth/verify-email/route.ts
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
    const input = Schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, emailVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Email не найден" }, { status: 400 });
    }

    // ✅ если уже подтверждён — просто логиним
    if (user.emailVerifiedAt) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

      const res = NextResponse.json({ ok: true, alreadyVerified: true });
      setSessionCookie(res, token, expiresAt);
      return res;
    }

    const rec = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email: input.email } },
      select: { codeHash: true, expiresAt: true, attempts: true },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Код не найден. Нажмите «Отправить заново»." },
        { status: 400 },
      );
    }

    if (rec.expiresAt < new Date()) {
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

    const ok = hashCode(input.code) === rec.codeHash;

    if (!ok) {
      await prisma.emailVerification.update({
        where: { userId_email: { userId: user.id, email: input.email } },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    // ✅ подтверждаем + удаляем код + создаём сессию атомарно
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });

      await tx.emailVerification.delete({
        where: { userId_email: { userId: user.id, email: input.email } },
      });

      await tx.session.create({ data: { userId: user.id, token, expiresAt } });
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