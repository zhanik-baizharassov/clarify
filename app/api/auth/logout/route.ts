import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import {
  clearEmailVerifyLoginCookie,
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  hashSessionToken,
  maybeCleanupExpiredSessions,
} from "@/server/auth/session-token";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  await maybeCleanupExpiredSessions();

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  clearEmailVerifyLoginCookie(res);
  return res;
}