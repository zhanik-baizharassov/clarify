import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration test for consumeRateLimit against a real PostgreSQL.
 *
 * Runs only when TEST_DATABASE_URL is set. The Prisma client in
 * @/server/db/prisma reads DATABASE_URL, so point both at the same database:
 *
 *   TEST_DATABASE_URL=postgresql://... DATABASE_URL=postgresql://... npm test
 *
 * Every row is created under a unique per-run scope and deleted afterwards.
 * NEVER point this at a production database.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  describe.skip("consumeRateLimit (database) - skipped: set TEST_DATABASE_URL (and DATABASE_URL to the same value) to run", () => {
    it("requires TEST_DATABASE_URL", () => {});
  });
} else {
  // The app's Prisma client reads DATABASE_URL; make sure it is the test DB.
  process.env.DATABASE_URL = testDatabaseUrl;

  describe("consumeRateLimit (database)", () => {
    let prisma: typeof import("@/server/db/prisma").prisma;
    let consumeRateLimit: typeof import("@/server/security/rate-limit").consumeRateLimit;

    beforeAll(async () => {
      // Imported lazily so DATABASE_URL is already pointing at the test DB.
      ({ prisma } = await import("@/server/db/prisma"));
      ({ consumeRateLimit } = await import("@/server/security/rate-limit"));
    });

    const runId = crypto.randomUUID();
    const scopeOf = (name: string) => `vitest:${runId}:${name}`;

    afterAll(async () => {
      if (!prisma) return;
      await prisma.rateLimitBucket.deleteMany({
        where: { scope: { startsWith: `vitest:${runId}:` } },
      });
      await prisma.$disconnect();
    });

    it("lets exactly `limit` of 25 concurrent calls through", async () => {
      const input = {
        scope: scopeOf("concurrent"),
        key: "client-a",
        limit: 5,
        windowSec: 60,
      };

      const results = await Promise.all(
        Array.from({ length: 25 }, () => consumeRateLimit(input)),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(5);
      expect(results.filter((r) => !r.ok)).toHaveLength(20);

      // remaining counts down 4..0 across the allowed calls, never negative.
      const remaining = results
        .filter((r) => r.ok)
        .map((r) => r.remaining)
        .sort((a, b) => b - a);
      expect(remaining).toEqual([4, 3, 2, 1, 0]);

      for (const r of results.filter((r) => !r.ok)) {
        expect(r.remaining).toBe(0);
        expect(r.retryAfterSec).toBeGreaterThanOrEqual(1);
        // each call samples its own clock, so rounding up may add one second
        expect(r.retryAfterSec).toBeLessThanOrEqual(61);
      }

      const rows = await prisma.rateLimitBucket.findMany({
        where: { scope: input.scope },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].hits).toBe(25);
    });

    it("blocks the (limit+1)-th sequential call and reports Retry-After", async () => {
      const input = {
        scope: scopeOf("sequential"),
        key: "client-b",
        limit: 3,
        windowSec: 120,
      };
      const now = new Date();

      for (let i = 0; i < 3; i++) {
        const r = await consumeRateLimit({ ...input, now });
        expect(r.ok).toBe(true);
        expect(r.retryAfterSec).toBe(0);
      }

      const blocked = await consumeRateLimit({
        ...input,
        now: new Date(now.getTime() + 10_000),
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.retryAfterSec).toBe(110);
      expect(blocked.resetAt.getTime()).toBe(now.getTime() + 120_000);
    });

    it("opens a fresh window once the previous one has expired", async () => {
      const input = {
        scope: scopeOf("expiry"),
        key: "client-c",
        limit: 2,
        windowSec: 60,
      };
      const t0 = new Date();

      expect((await consumeRateLimit({ ...input, now: t0 })).ok).toBe(true);
      expect((await consumeRateLimit({ ...input, now: t0 })).ok).toBe(true);
      expect((await consumeRateLimit({ ...input, now: t0 })).ok).toBe(false);

      // Still inside the window just before it ends.
      const almost = new Date(t0.getTime() + 59_000);
      expect((await consumeRateLimit({ ...input, now: almost })).ok).toBe(false);

      // At/after expiry the counter resets to 1.
      const later = new Date(t0.getTime() + 61_000);
      const reset = await consumeRateLimit({ ...input, now: later });
      expect(reset.ok).toBe(true);
      expect(reset.remaining).toBe(1);
      expect(reset.resetAt.getTime()).toBe(later.getTime() + 60_000);

      expect((await consumeRateLimit({ ...input, now: later })).ok).toBe(true);
      expect((await consumeRateLimit({ ...input, now: later })).ok).toBe(false);
    });

    it("keeps different keys and different scopes independent", async () => {
      const base = { limit: 1, windowSec: 60 };
      const scope = scopeOf("independent");

      const a1 = await consumeRateLimit({ ...base, scope, key: "key-a" });
      const b1 = await consumeRateLimit({ ...base, scope, key: "key-b" });
      expect(a1.ok).toBe(true);
      expect(b1.ok).toBe(true);

      const a2 = await consumeRateLimit({ ...base, scope, key: "key-a" });
      expect(a2.ok).toBe(false);

      const otherScope = await consumeRateLimit({
        ...base,
        scope: scopeOf("independent-other"),
        key: "key-a",
      });
      expect(otherScope.ok).toBe(true);
    });

    it("rejects invalid input before touching the database", async () => {
      const scope = scopeOf("invalid");
      await expect(
        consumeRateLimit({ scope: " ", key: "k", limit: 1, windowSec: 1 }),
      ).rejects.toThrow("scope");
      await expect(
        consumeRateLimit({ scope, key: " ", limit: 1, windowSec: 1 }),
      ).rejects.toThrow("key");
      await expect(
        consumeRateLimit({ scope, key: "k", limit: 0, windowSec: 1 }),
      ).rejects.toThrow("limit");
      await expect(
        consumeRateLimit({ scope, key: "k", limit: 1, windowSec: 1.5 }),
      ).rejects.toThrow("windowSec");
    });
  });
}
