import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import {
  SESSION_COOKIE_NAME,
  hashSessionToken,
  maybeCleanupExpiredSessions,
} from "@/server/auth/session-token";

export function isDynamicServerUsageError(
  err: unknown,
): err is { digest: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  await maybeCleanupExpiredSessions();

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  const now = new Date();

  if (session.expiresAt < now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (!session.user.emailVerifiedAt) {
    await prisma.session.deleteMany({ where: { userId: session.user.id } });
    return null;
  }

  if (session.user.blockedUntil && session.user.blockedUntil > now) {
    await prisma.session.deleteMany({ where: { userId: session.user.id } });
    return null;
  }

  if (session.user.role === "COMPANY") {
    const company = await prisma.company.findUnique({
      where: { ownerId: session.user.id },
      select: { blockedUntil: true },
    });

    if (company?.blockedUntil && company.blockedUntil > now) {
      await prisma.session.deleteMany({ where: { userId: session.user.id } });
      return null;
    }
  }

  return session.user;
}