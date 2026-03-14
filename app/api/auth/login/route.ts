import { NextResponse } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import {
  buildSessionToken,
  maybeCleanupExpiredSessions,
  setSessionCookie,
} from "@/server/auth/session-token";
import { maybeRunMaintenanceCleanup } from "@/server/maintenance/cleanup";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

const GENERIC_LOGIN_ERROR = "Не удалось войти. Проверьте введённые данные.";

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:login:ip",
        key: ip,
        limit: 20,
        windowSec: 10 * 60,
        errorMessage: "Слишком много попыток входа. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const input = Schema.parse(await req.json());
    const email = input.email.trim().toLowerCase();

    const identityRateLimit = await enforceRateLimits([
      {
        scope: "auth:login:email",
        key: email,
        limit: 8,
        windowSec: 10 * 60,
        errorMessage:
          "Слишком много попыток входа для этого email. Попробуйте позже.",
      },
    ]);

    if (identityRateLimit) {
      return identityRateLimit;
    }

    const now = new Date();

    await maybeRunMaintenanceCleanup(now);
    await maybeCleanupExpiredSessions(now);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        emailVerifiedAt: true,
        role: true,
        blockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: GENERIC_LOGIN_ERROR },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);

    if (!ok) {
      return NextResponse.json(
        { error: GENERIC_LOGIN_ERROR },
        { status: 401 },
      );
    }

    if (user.blockedUntil && user.blockedUntil > now) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json(
        { error: GENERIC_LOGIN_ERROR },
        { status: 401 },
      );
    }

    if (user.role === "COMPANY") {
      const company = await prisma.company.findUnique({
        where: { ownerId: user.id },
        select: {
          blockedUntil: true,
        },
      });

      if (company?.blockedUntil && company.blockedUntil > now) {
        await prisma.session.deleteMany({
          where: { userId: user.id },
        });

        return NextResponse.json(
          { error: GENERIC_LOGIN_ERROR },
          { status: 401 },
        );
      }
    }

    if (!user.emailVerifiedAt) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json(
        { error: GENERIC_LOGIN_ERROR },
        { status: 401 },
      );
    }

    const sessionToken = buildSessionToken(now);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sessionToken.tokenHash,
        expiresAt: sessionToken.expiresAt,
      },
    });

    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, sessionToken.rawToken, sessionToken.expiresAt);

    return res;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при входе" },
      { status: 500 },
    );
  }
}