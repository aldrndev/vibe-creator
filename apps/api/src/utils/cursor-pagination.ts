/**
 * Cursor Pagination Utilities
 * Implements cursor-based pagination for high-cardinality endpoints
 */

import { z } from "zod";

/**
 * Cursor pagination query schema
 */
export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CursorQuery = z.infer<typeof cursorQuerySchema>;

/**
 * Cursor pagination result
 */
export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Encode cursor from ID and timestamp
 */
export function encodeCursor(id: string, createdAt: Date): string {
  const data = { id, ts: createdAt.toISOString() };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

/**
 * Decode cursor to ID and timestamp
 */
export function decodeCursor(cursor: string): { id: string; ts: Date } | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const data = JSON.parse(json) as { id: string; ts: string };
    return { id: data.id, ts: new Date(data.ts) };
  } catch {
    return null;
  }
}

/**
 * Build Prisma where clause for cursor pagination
 */
export function buildCursorWhere<
  T extends { createdAt?: unknown; id?: unknown }
>(
  cursor: string | undefined,
  baseWhere: T
): T & { OR?: Array<{ createdAt?: unknown; id?: unknown }> } {
  if (!cursor) return baseWhere;

  const decoded = decodeCursor(cursor);
  if (!decoded) return baseWhere;

  return {
    ...baseWhere,
    OR: [
      { createdAt: { lt: decoded.ts } },
      { createdAt: decoded.ts, id: { lt: decoded.id } },
    ],
  };
}

/**
 * Create cursor pagination result from items
 */
export function createCursorResult<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = resultItems[resultItems.length - 1];
  const nextCursor =
    hasMore && lastItem ? encodeCursor(lastItem.id, lastItem.createdAt) : null;

  return {
    items: resultItems,
    nextCursor,
    hasMore,
  };
}

/**
 * Prisma orderBy for cursor pagination
 */
export const cursorOrderBy = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];
