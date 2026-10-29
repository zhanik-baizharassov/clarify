import { describe, expect, it } from "vitest";
import {
  COMPANY_PENDING_SIGNUP_COOKIE_NAME,
  USER_PENDING_SIGNUP_COOKIE_NAME,
  buildPendingSignupToken,
  generatePendingSignupToken,
  getPendingSignupCookieName,
  hashPendingSignupToken,
  isPendingSignupTokenMatch,
} from "@/server/auth/pending-signup";

describe("pending signup token", () => {
  it("generates url-safe tokens of 256 bits that differ each time", () => {
    const a = generatePendingSignupToken();
    const b = generatePendingSignupToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashes to a stable sha256 hex digest", () => {
    const h = hashPendingSignupToken("abc");
    expect(h).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashPendingSignupToken("abc")).toBe(h);
    expect(hashPendingSignupToken("abd")).not.toBe(h);
  });

  it("buildPendingSignupToken returns a raw token and its hash", () => {
    const { rawToken, tokenHash } = buildPendingSignupToken();
    expect(tokenHash).toBe(hashPendingSignupToken(rawToken));
    expect(tokenHash).not.toContain(rawToken);
  });

  it("maps flows to cookie names", () => {
    expect(getPendingSignupCookieName("user")).toBe(
      USER_PENDING_SIGNUP_COOKIE_NAME,
    );
    expect(getPendingSignupCookieName("company")).toBe(
      COMPANY_PENDING_SIGNUP_COOKIE_NAME,
    );
    expect(USER_PENDING_SIGNUP_COOKIE_NAME).not.toBe(
      COMPANY_PENDING_SIGNUP_COOKIE_NAME,
    );
  });
});

describe("isPendingSignupTokenMatch", () => {
  const { rawToken, tokenHash } = buildPendingSignupToken();

  it("is true for the matching token", () => {
    expect(isPendingSignupTokenMatch(rawToken, tokenHash)).toBe(true);
  });

  it("is false for a different token", () => {
    expect(isPendingSignupTokenMatch(generatePendingSignupToken(), tokenHash)).toBe(
      false,
    );
  });

  it("is false when either side is null, undefined or empty", () => {
    expect(isPendingSignupTokenMatch(null, tokenHash)).toBe(false);
    expect(isPendingSignupTokenMatch(undefined, tokenHash)).toBe(false);
    expect(isPendingSignupTokenMatch("", tokenHash)).toBe(false);
    expect(isPendingSignupTokenMatch(rawToken, null)).toBe(false);
    expect(isPendingSignupTokenMatch(rawToken, undefined)).toBe(false);
    expect(isPendingSignupTokenMatch(rawToken, "")).toBe(false);
    expect(isPendingSignupTokenMatch(null, null)).toBe(false);
  });

  it("is false (and does not throw) when the stored hash has a different length", () => {
    expect(isPendingSignupTokenMatch(rawToken, tokenHash.slice(0, -1))).toBe(
      false,
    );
    expect(isPendingSignupTokenMatch(rawToken, `${tokenHash}00`)).toBe(false);
    expect(isPendingSignupTokenMatch(rawToken, "short")).toBe(false);
  });

  it("does not accept the hash itself as the raw token", () => {
    expect(isPendingSignupTokenMatch(tokenHash, tokenHash)).toBe(false);
  });
});
