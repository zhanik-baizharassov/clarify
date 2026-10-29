import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceSameOrigin } from "@/server/security/csrf";

const APP = "https://app.example.com";

function req(headers: Record<string, string> = {}) {
  return new Request(`${APP}/api/thing`, { method: "POST", headers });
}

async function status(res: Response | null) {
  return res ? res.status : null;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enforceSameOrigin in production", () => {
  function prod(appOrigin: string | null = APP) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", appOrigin ?? undefined);
  }

  it("fails closed (500) when APP_ORIGIN is not configured", async () => {
    prod(null);
    const res = enforceSameOrigin(req({ origin: APP }));
    expect(res?.status).toBe(500);
    expect(await res?.json()).toEqual({
      error: "CSRF protection is not configured",
    });
  });

  it("also fails closed when APP_ORIGIN is not a valid URL", () => {
    prod("not a url");
    expect(enforceSameOrigin(req({ origin: APP }))?.status).toBe(500);
  });

  it("allows a matching Origin", () => {
    prod();
    expect(enforceSameOrigin(req({ origin: APP }))).toBeNull();
  });

  it("normalizes APP_ORIGIN (path, trailing slash, case)", () => {
    prod("HTTPS://App.Example.com/some/path/");
    expect(enforceSameOrigin(req({ origin: APP }))).toBeNull();
  });

  it("rejects a mismatched Origin with 403", async () => {
    prod();
    const res = enforceSameOrigin(req({ origin: "https://evil.example.net" }));
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "Cross-site request blocked" });
  });

  it("rejects a different scheme or port of the same host", async () => {
    prod();
    expect(await status(enforceSameOrigin(req({ origin: "http://app.example.com" })))).toBe(403);
    expect(await status(enforceSameOrigin(req({ origin: "https://app.example.com:8443" })))).toBe(403);
  });

  it("accepts only APP_ORIGIN: the request Host header does not widen the allow-list", () => {
    prod();
    const res = enforceSameOrigin(
      req({
        origin: "https://other.example.org",
        "x-forwarded-host": "other.example.org",
        "x-forwarded-proto": "https",
      }),
    );
    expect(res?.status).toBe(403);
  });

  it("without Origin: rejects a foreign Referer", () => {
    prod();
    expect(
      enforceSameOrigin(req({ referer: "https://evil.example.net/page" }))?.status,
    ).toBe(403);
  });

  it("without Origin: allows a matching Referer", () => {
    prod();
    expect(enforceSameOrigin(req({ referer: `${APP}/page?x=1` }))).toBeNull();
  });

  it("an Origin match wins over a foreign Referer (Referer is only a fallback)", () => {
    prod();
    expect(
      enforceSameOrigin(
        req({ origin: APP, referer: "https://evil.example.net/" }),
      ),
    ).toBeNull();
  });

  it("without Origin/Referer: blocks Sec-Fetch-Site: cross-site", () => {
    prod();
    expect(
      enforceSameOrigin(req({ "sec-fetch-site": "cross-site" }))?.status,
    ).toBe(403);
  });

  it("without Origin/Referer: allows same-origin, same-site, none", () => {
    prod();
    for (const v of ["same-origin", "same-site", "none"]) {
      expect(enforceSameOrigin(req({ "sec-fetch-site": v }))).toBeNull();
    }
  });

  it("a request with none of the headers is let through (non-browser clients)", () => {
    prod();
    expect(enforceSameOrigin(req())).toBeNull();
  });

  it("treats an unparsable Origin like a missing one and falls back to Sec-Fetch-Site", () => {
    prod();
    expect(
      enforceSameOrigin(req({ origin: "null", "sec-fetch-site": "cross-site" }))
        ?.status,
    ).toBe(403);
  });
});

describe("enforceSameOrigin outside production", () => {
  function dev(appOrigin?: string) {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ORIGIN", appOrigin);
  }

  it("does not require APP_ORIGIN", () => {
    dev(undefined);
    expect(
      enforceSameOrigin(
        req({ host: "localhost:3000", origin: "http://localhost:3000" }),
      ),
    ).toBeNull();
  });

  it("accepts the request's own origin (host + http for localhost)", () => {
    dev(undefined);
    expect(
      enforceSameOrigin(
        req({ "x-forwarded-host": "localhost:3000", origin: "http://localhost:3000" }),
      ),
    ).toBeNull();
  });

  it("accepts both APP_ORIGIN and the request origin", () => {
    dev(APP);
    expect(enforceSameOrigin(req({ origin: APP }))).toBeNull();
    expect(
      enforceSameOrigin(
        req({ "x-forwarded-host": "localhost:3000", origin: "http://localhost:3000" }),
      ),
    ).toBeNull();
  });

  it("still rejects a foreign Origin", () => {
    dev(undefined);
    expect(
      enforceSameOrigin(
        req({
          "x-forwarded-host": "localhost:3000",
          origin: "https://evil.example.net",
        }),
      )?.status,
    ).toBe(403);
  });

  it("still blocks cross-site fetches without Origin/Referer", () => {
    dev(APP);
    expect(
      enforceSameOrigin(req({ "sec-fetch-site": "cross-site" }))?.status,
    ).toBe(403);
  });
});
