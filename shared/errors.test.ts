import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorMessage, isZodError } from "@/shared/errors";

describe("errorMessage", () => {
  it("returns the message of an Error", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("reads message from plain objects", () => {
    expect(errorMessage({ message: "from object" }, "fallback")).toBe(
      "from object",
    );
  });

  it("falls back for empty, missing or non-string messages", () => {
    expect(errorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(errorMessage({ message: 42 }, "fallback")).toBe("fallback");
    expect(errorMessage({}, "fallback")).toBe("fallback");
  });

  it("falls back for non-object values", () => {
    expect(errorMessage(undefined, "fallback")).toBe("fallback");
    expect(errorMessage(null, "fallback")).toBe("fallback");
    expect(errorMessage("text", "fallback")).toBe("fallback");
  });
});

describe("isZodError", () => {
  it("recognises a real zod error", () => {
    const result = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(isZodError(result.error)).toBe(true);
      expect(typeof result.error.issues[0]?.message).toBe("string");
    }
  });

  it("rejects other values", () => {
    expect(isZodError(new Error("x"))).toBe(false);
    expect(isZodError({ name: "ZodError" })).toBe(false);
    expect(isZodError(null)).toBe(false);
  });
});
