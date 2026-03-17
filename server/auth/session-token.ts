import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const EMAIL_VERIFY_LOGIN_COOKIE_NAME = "email_verify_login";
export const EMAIL_VERIFY_LOGIN_TTL_MS = 15 * 60 * 1000;

const SESSION_CLEANUP_SAMPLE_PERCENT = 1;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function mustEmailPepper() {
  const pepper = process.env.EMAIL_CODE_PEPPER?.trim();
  if (!pepper) {
    throw new Error("Auth: env EMAIL_CODE_PEPPER is required");
  }
  return pepper;
}

function signEmailVerifyLoginPayload(payload: string) {
  return crypto
    .createHmac("sha256", `email-verify-login:${mustEmailPepper()}`)
    .update(payload)
    .digest("base64url");
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildSessionToken(now = new Date()) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

export function buildEmailVerifyLoginToken(
  userId: string,
  email: string,
  now = new Date(),
) {
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFY_LOGIN_TTL_MS);
  const emailB64 = Buffer.from(email.trim().toLowerCase(), "utf8").toString(
    "base64url",
  );
  const payload = `${userId}.${emailB64}.${expiresAt.getTime()}`;
  const signature = signEmailVerifyLoginPayload(payload);

  return {
    token: `${payload}.${signature}`,
    expiresAt,
  };
}

export function verifyEmailVerifyLoginToken(
  token: string,
  expected: { userId: string; email: string },
  now = new Date(),
) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [userId, emailB64, expiresRaw, signature] = parts;
  const payload = `${userId}.${emailB64}.${expiresRaw}`;
  const expectedSignature = signEmailVerifyLoginPayload(payload);

  const actualBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");

  if (actualBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return false;

  const expiresAtMs = Number(expiresRaw);
  if (!Number.isFinite(expiresAtMs)) return false;
  if (expiresAtMs <= now.getTime()) return false;

  let decodedEmail = "";
  try {
    decodedEmail = Buffer.from(emailB64, "base64url").toString("utf8");
  } catch {
    return false;
  }

  return (
    userId === expected.userId &&
    decodedEmail.trim().toLowerCase() === expected.email.trim().toLowerCase()
  );
}

export function setSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date,
) {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: new Date(0),
  });
}

export function setEmailVerifyLoginCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date,
) {
  res.cookies.set(EMAIL_VERIFY_LOGIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: expiresAt,
  });
}

export function clearEmailVerifyLoginCookie(res: NextResponse) {
  res.cookies.set(EMAIL_VERIFY_LOGIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: new Date(0),
  });
}

export async function maybeCleanupExpiredSessions(now = new Date()) {
  if (crypto.randomInt(100) >= SESSION_CLEANUP_SAMPLE_PERCENT) return;

  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
  } catch (err) {
    console.error("SESSION CLEANUP ERROR:", err);
  }
}