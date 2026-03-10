import { NextResponse } from "next/server";
import { assertKzCity } from "@/shared/kz/kz";

export const runtime = "nodejs";

function norm(s: string | null | undefined) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

type SuggestItem = {
  value: string;
  label: string;
  lat: number | null;
  lng: number | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = norm(searchParams.get("q"));
    const cityRaw = norm(searchParams.get("city"));

    if (!q || q.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const city = assertKzCity(cityRaw, "Город");

    const key = process.env.TWOGIS_GEOCODER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Не настроен TWOGIS_GEOCODER_API_KEY" },
        { status: 500 },
      );
    }

    const url = new URL("https://catalog.api.2gis.com/3.0/suggests");
    url.searchParams.set("q", `${city} ${q}`);
    url.searchParams.set("suggest_type", "address");
    url.searchParams.set("type", "building");
    url.searchParams.set("fields", "items.point");
    url.searchParams.set("key", key);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json(
            { error: "2GIS отклонил запрос. Проверьте API key." },
            { status: 500 },
          );
        }

        if (res.status === 429) {
          return NextResponse.json(
            { error: "2GIS временно ограничил запросы. Попробуйте позже." },
            { status: 429 },
          );
        }

        return NextResponse.json(
          { error: "2GIS Suggest временно недоступен." },
          { status: 502 },
        );
      }

      const data = (await res.json().catch(() => null)) as
        | {
            result?: {
              items?: Array<{
                name?: string;
                full_name?: string;
                address_name?: string;
                point?: {
                  lat?: number;
                  lon?: number;
                };
              }>;
            };
          }
        | null;

      const rawItems = Array.isArray(data?.result?.items)
        ? data.result.items
        : [];

      const seen = new Set<string>();
      const items: SuggestItem[] = [];

      for (const item of rawItems) {
        const addressName = norm(item?.address_name);
        const fullName = norm(item?.full_name);
        const name = norm(item?.name);

        const value = addressName || name || fullName;
        const label = fullName || addressName || name;

        if (!value || !label) continue;
        if (seen.has(value.toLowerCase())) continue;

        seen.add(value.toLowerCase());

        const lat =
          typeof item?.point?.lat === "number" ? item.point.lat : null;
        const lng =
          typeof item?.point?.lon === "number" ? item.point.lon : null;

        items.push({
          value,
          label,
          lat,
          lng,
        });

        if (items.length >= 6) break;
      }

      return NextResponse.json({ items });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    if (err instanceof Error && err.message) {
      if (err.message.includes("Город")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Не удалось получить подсказки адреса" },
      { status: 500 },
    );
  }
}