import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SESSION_CLEANUP_SAMPLE_PERCENT = 1;

function isProduction() {
  return process.env.NODE_ENV === "production";
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