import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (check .env / .env.local)");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    // Fail with a clear error instead of waiting forever for a connection.
    connectionTimeoutMillis: 10_000,
    // Release idle connections quickly: serverless instances come and go and
    // the database (Neon) suspends when idle.
    idleTimeoutMillis: 10_000,
    max: 10,
  });

  return new PrismaClient({
    adapter,
    // Default maxWait is 2s, which is too tight when a burst of requests
    // competes for connections (e.g. a cold database).
    transactionOptions: { maxWait: 8_000, timeout: 15_000 },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
