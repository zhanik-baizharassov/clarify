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
  const clean = String(code).replace(/\D/g, "").slice(0, 6);
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${clean}`)
    .digest("hex");
}

export function isCodeHashMatch(code: string, expectedHash: string) {
  const actualHash = hashCode(code);

  const actualBuf = Buffer.from(actualHash, "hex");
  const expectedBuf = Buffer.from(expectedHash, "hex");

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function codeTtlMs() {
  const raw = Number(process.env.EMAIL_CODE_TTL_MIN);
  const min = Number.isFinite(raw) ? raw : 10;
  return Math.max(1, min) * 60 * 1000;
}