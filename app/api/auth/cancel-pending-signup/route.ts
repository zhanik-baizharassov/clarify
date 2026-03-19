import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { enforceRateLimits, getRequestIp } from "@/server/security/rate-limit";
import { cleanupExpiredPendingSignups } from "@/server/maintenance/cleanup";
import { enforceSameOrigin } from "@/server/security/csrf";
import {
  clearPendingSignupCookie,
  getPendingSignupCookieName,
  hashPendingSignupToken,
} from "@/server/auth/pending-signup";

export const runtime = "nodejs";

const BodySchema = z.object({
  flow: z.enum(["user", "company"]),
});

const GENERIC_CANCEL_ERROR =
  "Не удалось начать регистрацию заново. Подтвердите email текущим кодом или дождитесь истечения срока подтверждения.";

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;

    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "auth:cancel-pending-signup:ip",
        key: ip,
        limit: 20,
        windowSec: 10 * 60,
        errorMessage: "Слишком много запросов. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const now = new Date();

    await cleanupExpiredPendingSignups(now);

    const store = await cookies();
    const rawToken =
      store.get(getPendingSignupCookieName(body.flow))?.value ?? "";

    if (!rawToken) {
      return NextResponse.json({ error: GENERIC_CANCEL_ERROR }, { status: 400 });
    }

    const tokenHash = hashPendingSignupToken(rawToken);

    if (body.flow === "company") {
      const pending = await prisma.pendingCompanySignup.findUnique({
        where: { pendingTokenHash: tokenHash },
        select: { id: true },
      });

      const res = NextResponse.json({ ok: true });
      clearPendingSignupCookie(res, "company");

      if (!pending) {
        return res;
      }

      await prisma.pendingCompanySignup.delete({
        where: { id: pending.id },
      });

      return res;
    }

    const pending = await prisma.pendingUserSignup.findUnique({
      where: { pendingTokenHash: tokenHash },
      select: { id: true },
    });

    const res = NextResponse.json({ ok: true });
    clearPendingSignupCookie(res, "user");

    if (!pending) {
      return res;
    }

    await prisma.pendingUserSignup.delete({
      where: { id: pending.id },
    });

    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Некорректный запрос" },
        { status: 400 },
      );
    }

    console.error("CANCEL PENDING SIGNUP ERROR:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}