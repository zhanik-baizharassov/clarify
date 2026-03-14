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

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${scope}),
        hashtext(${keyHash})
      )
    `;

    const existing = await tx.rateLimitBucket.findUnique({
      where: {
        scope_keyHash: {
          scope,
          keyHash,
        },
      },
    });

    const freshWindowExpiresAt = new Date(now.getTime() + input.windowSec * 1000);

    if (!existing) {
      await tx.rateLimitBucket.create({
        data: {
          scope,
          keyHash,
          hits: 1,
          windowStartedAt: now,
          windowExpiresAt: freshWindowExpiresAt,
        },
      });

      return {
        ok: true,
        limit: input.limit,
        remaining: Math.max(0, input.limit - 1),
        retryAfterSec: 0,
        resetAt: freshWindowExpiresAt,
      };
    }

    if (existing.windowExpiresAt <= now) {
      await tx.rateLimitBucket.update({
        where: {
          scope_keyHash: {
            scope,
            keyHash,
          },
        },
        data: {
          hits: 1,
          windowStartedAt: now,
          windowExpiresAt: freshWindowExpiresAt,
        },
      });

      return {
        ok: true,
        limit: input.limit,
        remaining: Math.max(0, input.limit - 1),
        retryAfterSec: 0,
        resetAt: freshWindowExpiresAt,
      };
    }

    if (existing.hits >= input.limit) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((existing.windowExpiresAt.getTime() - now.getTime()) / 1000),
      );

      return {
        ok: false,
        limit: input.limit,
        remaining: 0,
        retryAfterSec,
        resetAt: existing.windowExpiresAt,
      };
    }

    const nextHits = existing.hits + 1;

    await tx.rateLimitBucket.update({
      where: {
        scope_keyHash: {
          scope,
          keyHash,
        },
      },
      data: {
        hits: nextHits,
      },
    });

    return {
      ok: true,
      limit: input.limit,
      remaining: Math.max(0, input.limit - nextHits),
      retryAfterSec: 0,
      resetAt: existing.windowExpiresAt,
    };
  });
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
    const result = await consumeRateLimit({
      scope: check.scope,
      key: check.key,
      limit: check.limit,
      windowSec: check.windowSec,
      now: check.now,
    });

    if (!result.ok) {
      return createRateLimitResponse(
        result,
        check.errorMessage ?? "Слишком много запросов. Попробуйте позже.",
      );
    }
  }

  return null;
}