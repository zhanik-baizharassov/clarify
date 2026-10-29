import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: { $queryRaw: vi.fn(), rateLimitBucket: { deleteMany: vi.fn() } },
}));

import { createRateLimitResponse, getRequestIp } from "@/server/security/rate-limit";

function req(headers: Record<string, string>) {
  return new Request("https://example.com/api/x", { headers });
}

describe("getRequestIp", () => {
  it("prefers x-vercel-forwarded-for (first element)", () => {
    expect(
      getRequestIp(
        req({
          "x-vercel-forwarded-for": "1.1.1.1, 9.9.9.9",
          "x-real-ip": "2.2.2.2",
          "x-forwarded-for": "3.3.3.3",
        }),
      ),
    ).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    expect(
      getRequestIp(req({ "x-real-ip": " 2.2.2.2 ", "x-forwarded-for": "3.3.3.3" })),
    ).toBe("2.2.2.2");
  });

  it("then to the first element of x-forwarded-for", () => {
    expect(
      getRequestIp(req({ "x-forwarded-for": "3.3.3.3, 4.4.4.4, 5.5.5.5" })),
    ).toBe("3.3.3.3");
  });

  it("ignores client-controllable headers such as cf-connecting-ip", () => {
    expect(
      getRequestIp(
        req({
          "cf-connecting-ip": "6.6.6.6",
          "true-client-ip": "7.7.7.7",
          "x-forwarded-for": "3.3.3.3",
        }),
      ),
    ).toBe("3.3.3.3");

    const ip = getRequestIp(
      req({ "cf-connecting-ip": "6.6.6.6", "user-agent": "UA/1.0" }),
    );
    expect(ip).not.toContain("6.6.6.6");
    expect(ip).toBe("unknown:UA/1.0");
  });

  it("falls back to a user-agent fingerprint when no IP header is present", () => {
    expect(getRequestIp(req({ "user-agent": "  Mozilla/5.0  " }))).toBe(
      "unknown:Mozilla/5.0",
    );
    expect(getRequestIp(req({}))).toBe("unknown:na");
  });

  it("truncates a very long user agent in the fingerprint", () => {
    const ip = getRequestIp(req({ "user-agent": "a".repeat(500) }));
    expect(ip).toBe(`unknown:${"a".repeat(180)}`);
  });

  it("skips empty header values", () => {
    expect(
      getRequestIp(req({ "x-vercel-forwarded-for": " ", "x-real-ip": "2.2.2.2" })),
    ).toBe("2.2.2.2");
  });
});

describe("createRateLimitResponse", () => {
  it("returns 429 with Retry-After and a RATE_LIMITED body", async () => {
    const res = createRateLimitResponse({
      ok: false,
      limit: 5,
      remaining: 0,
      retryAfterSec: 42,
      resetAt: new Date(),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const body = await res.json();
    expect(body).toMatchObject({ code: "RATE_LIMITED", retryAfterSec: 42 });
  });
});
