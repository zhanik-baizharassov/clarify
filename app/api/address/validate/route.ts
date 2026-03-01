import { NextResponse } from "next/server";
import { validateKzAddress } from "@/lib/address";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const city = String(body?.city ?? "");
    const address = String(body?.address ?? "");

    const result = await validateKzAddress({ city, address });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Ошибка" },
      { status: 400 },
    );
  }
}