import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { sendEmailVerificationCode } from "@/server/email/mailer";
import { generate6DigitCode, hashCode, codeTtlMs } from "@/server/email/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().min(3).max(320).email(),
});

const COOLDOWN_SEC = 60;

export async function POST(req: Request) {
  try {
    const { email } = BodySchema.parse(await req.json().catch(() => ({})));

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Аккаунт с таким email не найден" },
        { status: 404 },
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Email уже подтверждён" },
        { status: 400 },
      );
    }

    const existing = await prisma.emailVerification.findUnique({
      where: { userId_email: { userId: user.id, email } },
      select: { createdAt: true },
    });

    if (existing) {
      const ageMs = Date.now() - existing.createdAt.getTime();
      const leftSec = Math.ceil((COOLDOWN_SEC * 1000 - ageMs) / 1000);

      if (leftSec > 0) {
        return NextResponse.json(
          { error: `Подождите ${leftSec}с и попробуйте снова`, retryAfterSec: leftSec },
          { status: 429 },
        );
      }
    }

    const code = generate6DigitCode();
    const ttlMs = codeTtlMs();
    const ttlMinutes = Math.max(1, Math.round(ttlMs / 60_000));

    await prisma.emailVerification.upsert({
      where: { userId_email: { userId: user.id, email } },
      create: {
        userId: user.id,
        email,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + ttlMs),
        attempts: 0,
      },
      update: {
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + ttlMs),
        attempts: 0,
        createdAt: new Date(), // чтобы cooldown работал
      },
    });

    await sendEmailVerificationCode(email, code, { ttlMinutes });

    return NextResponse.json({ ok: true, cooldownSec: COOLDOWN_SEC, ttlMinutes });
  } catch (err: any) {
    console.error("POST /api/auth/resend-code failed:", err);

    const isZod = err?.name === "ZodError";
    return NextResponse.json(
      { error: isZod ? "Некорректный email" : "Internal Server Error" },
      { status: isZod ? 400 : 500 },
    );
  }
}