import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with PostgreSQL adapter (Prisma 7)
 *
 * Per Digitesia Standard (H2 - Timeouts for all I/O):
 * - Query timeout: 30 seconds (MAX)
 * - Prevents long-running queries from blocking
 */

// Create pg Pool for adapter
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Create adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    transactionOptions: {
      maxWait: 5000,
      timeout: 30000,
    },
  });

// Log slow queries in development
if (env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: { query: string; duration: number }) => {
    if (e.duration > 1000) {
      logger.warn(
        {
          query: e.query,
          duration: e.duration,
        },
        "Slow query detected"
      );
    }
  });
}

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
