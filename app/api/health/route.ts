import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Liveness/readiness probe for uptime monitors. Returns no data, only whether
 * the app can reach its database.
 *
 * - `/api/health?shallow=1` answers without touching the database, so a
 *   monitor can ping it every few minutes without keeping a scale-to-zero
 *   database (Neon free tier) awake.
 * - `/api/health` runs the full check including `SELECT 1`; use it rarely.
 */
export async function GET(req: Request) {
  const shallow = new URL(req.url).searchParams.get("shallow");
  if (shallow === "1" || shallow === "true") {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { ok: true, db: "up", latencyMs: Date.now() - startedAt },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("HEALTH CHECK FAILED:", err);

    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: NO_STORE },
    );
  }
}
