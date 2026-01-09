import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with timeout configuration
 *
 * Per Digitesia Standard (H2 - Timeouts for all I/O):
 * - Query timeout: 30 seconds (MAX)
 * - Prevents long-running queries from blocking
 * - Exceptions require Exception Protocol for complex reports
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Query timeout enforcement
    transactionOptions: {
      maxWait: 5000, // Max 5s to acquire transaction
      timeout: 30000, // Max 30s for transaction to complete
    },
  });

// Log slow queries in development
if (env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: any) => {
    if (e.duration > 1000) {
      // Warn about queries > 1s
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
