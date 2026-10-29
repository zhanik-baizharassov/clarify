import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMaintenanceCleanup } from "@/server/maintenance/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secureEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch: compare against self (constant
  // work) and force a mismatch instead.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "CRON_SECRET is not configured",
    };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!secureEqual(authHeader, `Bearer ${secret}`)) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
  };
}

export async function GET(req: Request) {
  const auth = isAuthorized(req);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  const now = new Date();
  const summary = await runMaintenanceCleanup(now);

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    summary,
  });
}