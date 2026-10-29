import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js reads .env.local, Prisma CLI does not, so load it here too.
// dotenv never overrides variables that are already set, so the first call
// wins: real process env (CI, Vercel) > .env.local > .env.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
