import { prisma } from "@/server/db/prisma";

export type MaintenanceCleanupSummary = {
  pendingUserSignups: number;
  pendingCompanySignups: number;
  sessions: number;
  emailVerifications: number;
  rateLimitBuckets: number;
};

export async function cleanupExpiredPendingSignups(now = new Date()) {
  const [pendingUserSignups, pendingCompanySignups] = await Promise.all([
    prisma.pendingUserSignup.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    }),
    prisma.pendingCompanySignup.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    }),
  ]);

  return {
    pendingUserSignups: pendingUserSignups.count,
    pendingCompanySignups: pendingCompanySignups.count,
  };
}

export async function runMaintenanceCleanup(
  now = new Date(),
): Promise<MaintenanceCleanupSummary> {
  const [pending, sessions, emailVerifications, rateLimitBuckets] =
    await Promise.all([
      cleanupExpiredPendingSignups(now),
      prisma.session.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      }),
      prisma.emailVerification.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      }),
      prisma.rateLimitBucket.deleteMany({
        where: {
          windowExpiresAt: { lt: now },
        },
      }),
    ]);

  return {
    pendingUserSignups: pending.pendingUserSignups,
    pendingCompanySignups: pending.pendingCompanySignups,
    sessions: sessions.count,
    emailVerifications: emailVerifications.count,
    rateLimitBuckets: rateLimitBuckets.count,
  };
}