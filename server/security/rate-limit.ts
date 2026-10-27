import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
  resetAt: Date;
};

type ConsumeRateLimitInput = {
  scope: string;
  key: string;
  limit: number;
  windowSec: number;
  now?: Date;
};

type RateLimitCheck = ConsumeRateLimitInput & {
  errorMessage?: string;
  /**
   * When the limiter itself fails (database unreachable, pool exhausted) let
   * the request through instead of answering 500. Use only for harmless
   * public reads; auth and write endpoints must keep failing closed.
   */
  failOpen?: boolean;
};

const CLEANUP_SAMPLE_PERCENT = 1;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getFallbackFingerprint(req: Request) {
  const ua = req.headers.get("user-agent")?.trim() || "na";
  return `unknown:${ua.slice(0, 180)}`;
}

export function getRequestIp(req: Request) {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const vercelForwarded = req.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (vercelForwarded) return vercelForwarded;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;

  return getFallbackFingerprint(req);
}

async function maybeCleanupExpiredBuckets() {
  if (crypto.randomInt(100) >= CLEANUP_SAMPLE_PERCENT) return;

  try {
    await prisma.rateLimitBucket.deleteMany({
      where: {
        windowExpiresAt: { lt: new Date() },
      },
    });
  } catch (err) {
    console.error("RATE LIMIT CLEANUP ERROR:", err);
  }
}

export async function consumeRateLimit(
  input: ConsumeRateLimitInput,
): Promise<RateLimitResult> {
  const scope = input.scope.trim();
  const rawKey = input.key.trim();

  if (!scope) {
    throw new Error("Rate limit scope is required");
  }

  if (!rawKey) {
    throw new Error("Rate limit key is required");
  }

  if (!Number.isInteger(input.limit) || input.limit <= 0) {
    throw new Error("Rate limit limit must be a positive integer");
  }

  if (!Number.isInteger(input.windowSec) || input.windowSec <= 0) {
    throw new Error("Rate limit windowSec must be a positive integer");
  }

  await maybeCleanupExpiredBuckets();

  const now = input.now ?? new Date();
  const keyHash = sha256(rawKey);

  const windowExpiresAt = new Date(now.getTime() + input.windowSec * 1000);

  // One atomic upsert: opens a fresh window when none exists or the old one
  // has expired, otherwise counts a hit in the current window. No interactive
  // transaction, so a burst of requests cannot starve the connection pool.
  const rows = await prisma.$queryRaw<
    Array<{ hits: number; windowExpiresAt: Date }>
  >`
    INSERT INTO "RateLimitBucket"
      ("id", "scope", "keyHash", "hits", "windowStartedAt", "windowExpiresAt", "createdAt", "updatedAt")
    VALUES
      (${crypto.randomUUID()}, ${scope}, ${keyHash}, 1, ${now}, ${windowExpiresAt}, ${now}, ${now})
    ON CONFLICT ("scope", "keyHash") DO UPDATE SET
      "hits" = CASE
        WHEN "RateLimitBucket"."windowExpiresAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."hits" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "RateLimitBucket"."windowExpiresAt" <= ${now} THEN ${now}
        ELSE "RateLimitBucket"."windowStartedAt"
      END,
      "windowExpiresAt" = CASE
        WHEN "RateLimitBucket"."windowExpiresAt" <= ${now} THEN ${windowExpiresAt}
        ELSE "RateLimitBucket"."windowExpiresAt"
      END,
      "updatedAt" = ${now}
    RETURNING "hits", "windowExpiresAt"
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Rate limit upsert returned no row");
  }

  const hits = Number(row.hits);

  if (hits > input.limit) {
    return {
      ok: false,
      limit: input.limit,
      remaining: 0,
      retryAfterSec: Math.max(
        1,
        Math.ceil((row.windowExpiresAt.getTime() - now.getTime()) / 1000),
      ),
      resetAt: row.windowExpiresAt,
    };
  }

  return {
    ok: true,
    limit: input.limit,
    remaining: Math.max(0, input.limit - hits),
    retryAfterSec: 0,
    resetAt: row.windowExpiresAt,
  };
}

export function createRateLimitResponse(
  result: RateLimitResult,
  error = "Слишком много запросов. Попробуйте позже.",
  extraBody?: Record<string, unknown>,
) {
  const res = NextResponse.json(
    {
      error,
      code: "RATE_LIMITED",
      retryAfterSec: result.retryAfterSec,
      ...extraBody,
    },
    { status: 429 },
  );

  res.headers.set("Retry-After", String(result.retryAfterSec));
  return res;
}

export async function enforceRateLimits(checks: RateLimitCheck[]) {
  for (const check of checks) {
    let result: RateLimitResult;

    try {
      result = await consumeRateLimit({
        scope: check.scope,
        key: check.key,
        limit: check.limit,
        windowSec: check.windowSec,
        now: check.now,
      });
    } catch (err) {
      if (!check.failOpen) throw err;
      console.error(`RATE LIMIT UNAVAILABLE (fail-open, ${check.scope}):`, err);
      continue;
    }

    if (!result.ok) {
      return createRateLimitResponse(
        result,
        check.errorMessage ?? "Слишком много запросов. Попробуйте позже.",
      );
    }
  }

  return null;
}