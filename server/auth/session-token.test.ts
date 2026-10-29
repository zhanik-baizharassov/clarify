import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: { session: { deleteMany: vi.fn() } },
}));

import {
  EMAIL_VERIFY_LOGIN_TTL_MS,
  SESSION_TTL_MS,
  buildEmailVerifyLoginToken,
  buildSessionToken,
  generateSessionToken,
  hashSessionToken,
  verifyEmailVerifyLoginToken,
} from "@/server/auth/session-token";

const NOW = new Date("2025-01-01T12:00:00.000Z");
const USER = { userId: "user_123", email: "Person@Example.com" };

beforeEach(() => {
  vi.stubEnv("EMAIL_CODE_PEPPER", "test-pepper-test-pepper-test-pepper");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session tokens", () => {
  it("generates distinct url-safe tokens", () => {
    const a = generateSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSessionToken()).not.toBe(a);
  });

  it("hashSessionToken is a stable sha256 hex digest", () => {
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("buildSessionToken returns the hash of the raw token and a 30 day expiry", () => {
    const { rawToken, tokenHash, expiresAt } = buildSessionToken(NOW);
    expect(tokenHash).toBe(hashSessionToken(rawToken));
    expect(expiresAt.getTime() - NOW.getTime()).toBe(SESSION_TTL_MS);
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("email verify login token", () => {
  it("verifies a freshly built token", () => {
    const { token, expiresAt } = buildEmailVerifyLoginToken(
      USER.userId,
      USER.email,
      NOW,
    );
    expect(expiresAt.getTime() - NOW.getTime()).toBe(EMAIL_VERIFY_LOGIN_TTL_MS);
    expect(verifyEmailVerifyLoginToken(token, USER, NOW)).toBe(true);
  });

  it("compares the email case-insensitively and ignores surrounding spaces", () => {
    const { token } = buildEmailVerifyLoginToken(USER.userId, USER.email, NOW);
    expect(
      verifyEmailVerifyLoginToken(
        token,
        { userId: USER.userId, email: "  person@example.COM " },
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects the token for another user or another email", () => {
    const { token } = buildEmailVerifyLoginToken(USER.userId, USER.email, NOW);
    expect(
      verifyEmailVerifyLoginToken(token, { ...USER, userId: "user_999" }, NOW),
    ).toBe(false);
    expect(
      verifyEmailVerifyLoginToken(token, { ...USER, email: "other@example.com" }, NOW),
    ).toBe(false);
  });

  it("is valid right up to expiry and rejected at and after it", () => {
    const { token, expiresAt } = buildEmailVerifyLoginToken(
      USER.userId,
      USER.email,
      NOW,
    );
    expect(
      verifyEmailVerifyLoginToken(token, USER, new Date(expiresAt.getTime() - 1)),
    ).toBe(true);
    expect(verifyEmailVerifyLoginToken(token, USER, expiresAt)).toBe(false);
    expect(
      verifyEmailVerifyLoginToken(token, USER, new Date(expiresAt.getTime() + 1)),
    ).toBe(false);
  });

  it("rejects a token whose payload was tampered with (signature kept)", () => {
    const { token } = buildEmailVerifyLoginToken(USER.userId, USER.email, NOW);
    const [userId, emailB64, expires, signature] = token.split(".");

    // Different user id.
    expect(
      verifyEmailVerifyLoginToken(
        ["user_999", emailB64, expires, signature].join("."),
        { ...USER, userId: "user_999" },
        NOW,
      ),
    ).toBe(false);

    // Extended expiry.
    const farFuture = String(Number(expires) + 365 * 24 * 3600 * 1000);
    expect(
      verifyEmailVerifyLoginToken(
        [userId, emailB64, farFuture, signature].join("."),
        USER,
        NOW,
      ),
    ).toBe(false);

    // Swapped email.
    const otherEmail = Buffer.from("attacker@example.com").toString("base64url");
    expect(
      verifyEmailVerifyLoginToken(
        [userId, otherEmail, expires, signature].join("."),
        { userId: USER.userId, email: "attacker@example.com" },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects a tampered or truncated signature", () => {
    const { token } = buildEmailVerifyLoginToken(USER.userId, USER.email, NOW);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyEmailVerifyLoginToken(flipped, USER, NOW)).toBe(false);
    expect(verifyEmailVerifyLoginToken(token.slice(0, -4), USER, NOW)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyEmailVerifyLoginToken("", USER, NOW)).toBe(false);
    expect(verifyEmailVerifyLoginToken("a.b.c", USER, NOW)).toBe(false);
    expect(verifyEmailVerifyLoginToken("a.b.c.d.e", USER, NOW)).toBe(false);
    expect(verifyEmailVerifyLoginToken("a.b.c.d", USER, NOW)).toBe(false);
  });

  it("rejects a token signed with a different pepper", () => {
    const { token } = buildEmailVerifyLoginToken(USER.userId, USER.email, NOW);
    vi.stubEnv("EMAIL_CODE_PEPPER", "a-completely-different-pepper-value");
    expect(verifyEmailVerifyLoginToken(token, USER, NOW)).toBe(false);
  });

  it("throws when EMAIL_CODE_PEPPER is not configured", () => {
    vi.stubEnv("EMAIL_CODE_PEPPER", "  ");
    expect(() =>
      buildEmailVerifyLoginToken(USER.userId, USER.email, NOW),
    ).toThrow("EMAIL_CODE_PEPPER");
  });
});
