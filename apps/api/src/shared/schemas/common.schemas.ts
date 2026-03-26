/**
 * Shared Response Schemas
 * Common response patterns for API documentation
 */

import { z } from 'zod';

// ============================================================================
// Common Error Response
// ============================================================================

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ============================================================================
// Common Success Patterns
// ============================================================================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

export const messageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export const deleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.null(),
});

// ============================================================================
// Common Pagination
// ============================================================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  cursor: z.string().optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

// ============================================================================
// Common ID Params
// ============================================================================

export const idParamsSchema = z.object({
  id: z.string(),
});

// ============================================================================
// User Schema (shared across modules)
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});

export const subscriptionSchema = z
  .object({
    tier: z.enum(['FREE', 'CREATOR', 'PRO']),
    status: z.string(),
    exportsUsed: z.number(),
    exportsLimit: z.number(),
    validUntil: z.date().nullable(),
  })
  .nullable();
