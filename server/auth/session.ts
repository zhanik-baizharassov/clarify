import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";

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
  const token = store.get("session")?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  // ✅ Верификация обязательна для всех
  if (!session.user.emailVerifiedAt) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  return session.user;
}