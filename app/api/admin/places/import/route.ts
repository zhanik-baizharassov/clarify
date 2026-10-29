import crypto from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";
import { enforceSameOrigin } from "@/server/security/csrf";
import {
  enforceRateLimits,
  getRequestIp,
} from "@/server/security/rate-limit";
import {
  buildCategoryLookup,
  buildPlaceSlug,
  placeKey,
  validateImportRow,
  type ImportPlaceData,
} from "@/server/admin/places-import";
import { IMPORT_MAX_ROWS_PER_REQUEST } from "@/shared/places-import-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 10;

const Schema = z
  .object({
    rows: z
      .array(
        z.object({
          line: z.number().int().min(1).max(10_000_000).optional(),
          data: z.record(z.string().max(60), z.string().max(3000)),
        }),
      )
      .min(1, "Нет строк для импорта")
      .max(
        IMPORT_MAX_ROWS_PER_REQUEST,
        `За один запрос можно отправить не больше ${IMPORT_MAX_ROWS_PER_REQUEST} строк`,
      ),
    dryRun: z.boolean().optional(),
  })
  .strict();

type RowResult = {
  row: number;
  status: "created" | "duplicate" | "invalid";
  error?: string;
  slug?: string;
};

const DUPLICATE_MESSAGE = "Такая карточка уже существует по этому адресу";

const rateLimitMessage =
  "Слишком много запросов на импорт. Подождите несколько минут и повторите.";

export async function POST(req: Request) {
  try {
    const csrf = enforceSameOrigin(req);
    if (csrf) return csrf;

    const ip = getRequestIp(req);

    // A big file is sent in chunks of 200 rows (dry run + real run), so the
    // limits are higher than for the single-card route.
    const ipRateLimit = await enforceRateLimits([
      {
        scope: "admin:places:import:ip",
        key: ip,
        limit: 80,
        windowSec: 10 * 60,
        errorMessage: rateLimitMessage,
      },
    ]);
    if (ipRateLimit) return ipRateLimit;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const actorRateLimit = await enforceRateLimits([
      {
        scope: "admin:places:import:admin",
        key: user.id,
        limit: 80,
        windowSec: 10 * 60,
        errorMessage: rateLimitMessage,
      },
    ]);
    if (actorRateLimit) return actorRateLimit;

    const input = Schema.parse(await req.json());
    const dryRun = input.dryRun === true;

    // Categories are resolved once per request.
    const categories = buildCategoryLookup(
      await prisma.category.findMany({
        select: { id: true, name: true, slug: true, isActive: true },
      }),
    );

    const results: RowResult[] = input.rows.map((r, i) => ({
      row: r.line ?? i + 2,
      status: "invalid",
    }));

    // 1) Validate every row independently.
    type Candidate = { index: number; place: ImportPlaceData };
    const candidates: Candidate[] = [];

    for (let i = 0; i < input.rows.length; i += 1) {
      const checked = await validateImportRow(input.rows[i].data, categories);
      if (checked.ok) {
        candidates.push({ index: i, place: checked.place });
      } else {
        results[i].error = checked.error;
      }
    }

    // 2) Duplicates: already in the database, or earlier in this same request.
    const existing = candidates.length
      ? await prisma.place.findMany({
          where: {
            city: { in: [...new Set(candidates.map((c) => c.place.city))] },
            name: { in: [...new Set(candidates.map((c) => c.place.name))] },
            address: {
              in: [...new Set(candidates.map((c) => c.place.address))],
            },
          },
          select: { city: true, address: true, name: true },
        })
      : [];

    const seen = new Set(
      existing.map((p) => placeKey(p.city, p.address ?? "", p.name)),
    );

    const toCreate: Candidate[] = [];
    for (const c of candidates) {
      const key = placeKey(c.place.city, c.place.address, c.place.name);
      if (seen.has(key)) {
        results[c.index].status = "duplicate";
        results[c.index].error = DUPLICATE_MESSAGE;
      } else {
        seen.add(key);
        toCreate.push(c);
      }
    }

    // 3) Write (each row is its own statement: one failure cannot touch another).
    if (dryRun) {
      for (const c of toCreate) results[c.index].status = "created";
    } else {
      for (let i = 0; i < toCreate.length; i += CONCURRENCY) {
        await Promise.all(
          toCreate.slice(i, i + CONCURRENCY).map(async ({ index, place }) => {
            const slug = buildPlaceSlug(
              place.name,
              place.city,
              crypto.randomUUID(),
            );
            try {
              await prisma.place.create({
                data: {
                  name: place.name,
                  slug,
                  categoryId: place.categoryId,
                  city: place.city,
                  address: place.address,
                  phone: place.phone,
                  description: place.description,
                  website: place.website,
                  workHours: place.workHours,
                  lat: place.lat,
                  lng: place.lng,
                  companyId: null,
                },
                select: { id: true },
              });
              results[index].status = "created";
              results[index].slug = slug;
            } catch (err) {
              if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
              ) {
                // Lost a race with a concurrent insert of the same card.
                results[index].status = "duplicate";
                results[index].error = DUPLICATE_MESSAGE;
              } else {
                console.error("POST /api/admin/places/import row failed:", err);
                results[index].status = "invalid";
                results[index].error =
                  "Не удалось сохранить строку, повторите импорт";
              }
            }
          }),
        );
      }
    }

    const summary = { created: 0, duplicate: 0, invalid: 0 };
    for (const r of results) summary[r.status] += 1;

    return NextResponse.json({ dryRun, results, summary });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues[0]?.message ?? "Неверные данные";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }

    console.error("POST /api/admin/places/import failed:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
