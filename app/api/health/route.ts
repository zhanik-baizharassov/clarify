import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for uptime monitors. Returns no data, only whether
 * the app can reach its database.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { ok: true, db: "up", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("HEALTH CHECK FAILED:", err);

    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
