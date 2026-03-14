import { NextResponse } from "next/server";
import { runMaintenanceCleanup } from "@/server/maintenance/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "CRON_SECRET is not configured",
    };
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
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