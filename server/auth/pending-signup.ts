import crypto from "crypto";
import { NextResponse } from "next/server";

export type PendingSignupFlow = "user" | "company";

export const USER_PENDING_SIGNUP_COOKIE_NAME = "pending_user_signup";
export const COMPANY_PENDING_SIGNUP_COOKIE_NAME = "pending_company_signup";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getPendingSignupCookieName(flow: PendingSignupFlow) {
  return flow === "company"
    ? COMPANY_PENDING_SIGNUP_COOKIE_NAME
    : USER_PENDING_SIGNUP_COOKIE_NAME;
}

export function generatePendingSignupToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPendingSignupToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildPendingSignupToken() {
  const rawToken = generatePendingSignupToken();

  return {
    rawToken,
    tokenHash: hashPendingSignupToken(rawToken),
  };
}

export function isPendingSignupTokenMatch(
  rawToken: string | null | undefined,
  tokenHash: string | null | undefined,
) {
  if (!rawToken || !tokenHash) return false;

  const actual = Buffer.from(hashPendingSignupToken(rawToken), "utf8");
  const expected = Buffer.from(tokenHash, "utf8");

  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(actual, expected);
}

export function setPendingSignupCookie(
  res: NextResponse,
  flow: PendingSignupFlow,
  token: string,
  expiresAt: Date,
) {
  res.cookies.set(getPendingSignupCookieName(flow), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: expiresAt,
  });
}

export function clearPendingSignupCookie(
  res: NextResponse,
  flow: PendingSignupFlow,
) {
  res.cookies.set(getPendingSignupCookieName(flow), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: new Date(0),
  });
}