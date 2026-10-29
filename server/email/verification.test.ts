import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  codeTtlMs,
  generate6DigitCode,
  hashCode,
  isCodeHashMatch,
} from "@/server/email/verification";

beforeEach(() => {
  vi.stubEnv("EMAIL_CODE_PEPPER", "test-pepper-test-pepper-test-pepper");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generate6DigitCode", () => {
  it("always returns exactly 6 digits (including leading zeros)", () => {
    for (let i = 0; i < 500; i++) {
      expect(generate6DigitCode()).toMatch(/^\d{6}$/);
    }
  });

  it("pads small numbers with leading zeros", () => {
    let value = 42;
    const spy = vi
      .spyOn(crypto, "randomInt")
      .mockImplementation((() => value) as unknown as typeof crypto.randomInt);
    try {
      expect(generate6DigitCode()).toBe("000042");
      value = 0;
      expect(generate6DigitCode()).toBe("000000");
      value = 999_999;
      expect(generate6DigitCode()).toBe("999999");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("hashCode / isCodeHashMatch", () => {
  it("round-trips", () => {
    const hash = hashCode("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(isCodeHashMatch("123456", hash)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const hash = hashCode("123456");
    expect(isCodeHashMatch("654321", hash)).toBe(false);
    expect(isCodeHashMatch("123457", hash)).toBe(false);
  });

  it("ignores non-digits and anything past 6 digits in the input", () => {
    const hash = hashCode("123456");
    expect(hashCode("123 456")).toBe(hash);
    expect(hashCode("12-34-56")).toBe(hash);
    expect(hashCode("1234567")).toBe(hash);
  });

  it("depends on the pepper", () => {
    const first = hashCode("123456");
    vi.stubEnv("EMAIL_CODE_PEPPER", "another-pepper-another-pepper");
    expect(hashCode("123456")).not.toBe(first);
    expect(isCodeHashMatch("123456", first)).toBe(false);
  });

  it("returns false for a malformed or differently sized stored hash", () => {
    expect(isCodeHashMatch("123456", "")).toBe(false);
    expect(isCodeHashMatch("123456", "abcd")).toBe(false);
    expect(isCodeHashMatch("123456", "zz".repeat(32))).toBe(false);
  });

  it("throws when EMAIL_CODE_PEPPER is missing", () => {
    vi.stubEnv("EMAIL_CODE_PEPPER", "");
    expect(() => hashCode("123456")).toThrow("EMAIL_CODE_PEPPER");
  });
});

describe("codeTtlMs", () => {
  it("defaults to 10 minutes", () => {
    vi.stubEnv("EMAIL_CODE_TTL_MIN", undefined);
    expect(codeTtlMs()).toBe(10 * 60_000);
  });

  it("reads EMAIL_CODE_TTL_MIN and clamps to at least 1 minute", () => {
    vi.stubEnv("EMAIL_CODE_TTL_MIN", "15");
    expect(codeTtlMs()).toBe(15 * 60_000);
    vi.stubEnv("EMAIL_CODE_TTL_MIN", "0");
    expect(codeTtlMs()).toBe(60_000);
  });

  it("falls back to 10 minutes for a non-numeric value", () => {
    vi.stubEnv("EMAIL_CODE_TTL_MIN", "abc");
    expect(codeTtlMs()).toBe(10 * 60_000);
  });
});
