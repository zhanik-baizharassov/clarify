// shared/errors.ts
// Helpers for working with `unknown` caught values (client/server-safe).

/** Human-readable message of a caught value, or `fallback` when it has none. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }

  return fallback;
}

export type ZodLikeError = {
  name: "ZodError";
  issues: { message?: string }[];
};

/** Detects a thrown zod validation error without depending on the zod class identity. */
export function isZodError(error: unknown): error is ZodLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "ZodError" &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}
