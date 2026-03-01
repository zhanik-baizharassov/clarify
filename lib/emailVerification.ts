import crypto from "crypto";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Email verification: env ${name} is required`);
  return v;
}

export function generate6DigitCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export function hashCode(code: string) {
  const pepper = must(process.env.EMAIL_CODE_PEPPER, "EMAIL_CODE_PEPPER");
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${code}`)
    .digest("hex");
}

export function codeTtlMs() {
  const min = Number(process.env.EMAIL_CODE_TTL_MIN ?? 10);
  return Math.max(1, min) * 60 * 1000;
}