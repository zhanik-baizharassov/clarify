import { NextResponse } from "next/server";
import { z } from "zod";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import { validateKzAddress } from "@/server/address/validate";

export const runtime = "nodejs";

const Schema = z.object({
  city: z.string().trim().min(2, "Город обязателен"),
  address: z.string().trim().min(5, "Адрес обязателен"),
});

export async function POST(req: Request) {
  try {
    const ip = getRequestIp(req);

    const ipRateLimit = await enforceRateLimits([
      {
        scope: "address:validate:ip",
        key: ip,
        limit: 12,
        windowSec: 5 * 60,
        errorMessage:
          "Слишком много запросов к проверке адреса. Попробуйте позже.",
      },
    ]);

    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = await req.json().catch(() => ({}));
    const input = Schema.parse(body);

    const result = await validateKzAddress({
      city: input.city,
      address: input.address,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      const msg = e.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Ошибка",
      },
      { status: 400 },
    );
  }
}