import { NextResponse } from "next/server";
import { z } from "zod";
import { validateKzAddress } from "@/server/address/validate";

export const runtime = "nodejs";

const Schema = z.object({
  city: z.string().trim().min(2, "Город обязателен"),
  address: z.string().trim().min(5, "Адрес обязателен"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = Schema.parse(body);

    const result = await validateKzAddress({
      city: input.city,
      address: input.address,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const msg = e.issues?.[0]?.message ?? "Неверные данные";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Ошибка" },
      { status: 400 },
    );
  }
}