/**
 * Common Response Schemas
 * Shared Zod schemas for API response validation
 */

import { z } from "zod";

// ============================================================================
// BASE RESPONSE WRAPPERS
// ============================================================================

/**
 * Success response wrapper
 */
export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

/**
 * Error response wrapper
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

/**
 * Paginated response wrapper
 */
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      hasMore: z.boolean(),
    }),
  });

/**
 * Cursor-paginated response wrapper
 */
export const cursorPaginatedSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
  });

// ============================================================================
// COMMON ENTITY SCHEMAS
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["USER", "ADMIN"]),
});

export const subscriptionSchema = z.object({
  tier: z.enum(["FREE", "CREATOR", "PRO"]),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]),
  exportsUsed: z.number(),
  exportsLimit: z.number(),
  validUntil: z.date().nullable(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const promptSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  category: z.string(),
  createdAt: z.date(),
});

// ============================================================================
// AUTH RESPONSE SCHEMAS
// ============================================================================

export const authResponseSchema = z.object({
  user: userSchema,
  subscription: subscriptionSchema.nullable(),
  accessToken: z.string(),
  expiresAt: z.date(),
});

export const loginResponseSchema = successResponseSchema(authResponseSchema);
export const registerResponseSchema = successResponseSchema(authResponseSchema);
export const refreshResponseSchema = successResponseSchema(authResponseSchema);
export const meResponseSchema = successResponseSchema(
  z.object({
    user: userSchema,
    subscription: subscriptionSchema.nullable(),
  })
);

// ============================================================================
// PROJECT RESPONSE SCHEMAS
// ============================================================================

export const projectListResponseSchema = paginatedResponseSchema(projectSchema);
export const projectDetailResponseSchema = successResponseSchema(projectSchema);
export const projectCreateResponseSchema = successResponseSchema(projectSchema);
export const projectUpdateResponseSchema = successResponseSchema(projectSchema);
export const projectDeleteResponseSchema = successResponseSchema(
  z.object({ message: z.string() })
);

// ============================================================================
// PROMPT RESPONSE SCHEMAS
// ============================================================================

export const promptListResponseSchema = paginatedResponseSchema(promptSchema);
export const promptDetailResponseSchema = successResponseSchema(promptSchema);
export const promptCreateResponseSchema = successResponseSchema(promptSchema);

// ============================================================================
// PAYMENT RESPONSE SCHEMAS
// ============================================================================

export const invoiceResponseSchema = successResponseSchema(
  z.object({
    invoiceUrl: z.string(),
    paymentId: z.string(),
  })
);

export const subscriptionResponseSchema = successResponseSchema(
  z.object({
    tier: z.string(),
    status: z.string(),
    exportsUsed: z.number(),
    exportsLimit: z.number(),
    validUntil: z.date().nullable(),
    price: z.number(),
    isUnlimited: z.boolean(),
  })
);

export const paymentHistorySchema = z.object({
  id: z.string(),
  amount: z.number(),
  tier: z.string(),
  status: z.string(),
  createdAt: z.date(),
});

export const paymentHistoryResponseSchema = successResponseSchema(
  z.array(paymentHistorySchema)
);

// ============================================================================
// ADMIN RESPONSE SCHEMAS
// ============================================================================

export const adminStatsSchema = z.object({
  totalUsers: z.number(),
  activeSubscriptions: z.number(),
  totalRevenue: z.number(),
  todaySignups: z.number(),
});

export const adminStatsResponseSchema = successResponseSchema(adminStatsSchema);

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  createdAt: z.date(),
  subscription: subscriptionSchema.nullable(),
});

export const adminUsersResponseSchema = successResponseSchema(
  z.object({
    users: z.array(adminUserSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })
);

// ============================================================================
// EXPORT RESPONSE SCHEMAS
// ============================================================================

export const exportJobSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  progress: z.number(),
  outputUrl: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
});

export const exportStartResponseSchema = successResponseSchema(
  z.object({ jobId: z.string() })
);

export const exportStatusResponseSchema =
  successResponseSchema(exportJobSchema);

export const exportHistoryResponseSchema = successResponseSchema(
  z.array(exportJobSchema)
);

// ============================================================================
// DOWNLOAD RESPONSE SCHEMAS
// ============================================================================

export const downloadSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  platform: z.string(),
  status: z.string(),
  filePath: z.string().nullable(),
  createdAt: z.date(),
});

export const downloadStartResponseSchema = successResponseSchema(
  z.object({
    downloadId: z.string(),
    status: z.string(),
  })
);

export const downloadHistoryResponseSchema = successResponseSchema(
  z.array(downloadSchema)
);

// ============================================================================
// STREAM RESPONSE SCHEMAS
// ============================================================================

export const streamSessionSchema = z.object({
  id: z.string(),
  platform: z.string(),
  status: z.enum(["STARTING", "LIVE", "ENDED", "FAILED"]),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  durationMinutesBilled: z.number().nullable(),
});

export const streamStartResponseSchema = successResponseSchema(
  z.object({ streamId: z.string() })
);

export const streamStatusResponseSchema = successResponseSchema(
  streamSessionSchema.extend({ isActive: z.boolean() })
);

export const streamHistoryResponseSchema = successResponseSchema(
  z.array(streamSessionSchema)
);

// ============================================================================
// DIRECTOR RESPONSE SCHEMAS
// ============================================================================

export const directorSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const directorSessionResponseSchema = successResponseSchema(
  directorSessionSchema
);
export const directorSessionListResponseSchema = successResponseSchema(
  z.array(directorSessionSchema)
);

// ============================================================================
// BILLING RESPONSE SCHEMAS
// ============================================================================

export const quotaCycleSchema = z.object({
  id: z.string(),
  quotaMinutesBase: z.number(),
  quotaMinutesTopup: z.number(),
  quotaMinutesUsed: z.number(),
  startsAt: z.date(),
  endsAt: z.date(),
});

export const billingQuotaResponseSchema =
  successResponseSchema(quotaCycleSchema);

// ============================================================================
// ANNOUNCEMENT RESPONSE SCHEMAS
// ============================================================================

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const announcementListResponseSchema = successResponseSchema(
  z.array(announcementSchema)
);

export const announcementResponseSchema =
  successResponseSchema(announcementSchema);

// ============================================================================
// GENERIC RESPONSE SCHEMAS
// ============================================================================

export const messageResponseSchema = successResponseSchema(
  z.object({ message: z.string() })
);

export const healthResponseSchema = successResponseSchema(
  z.object({
    status: z.literal("ok"),
    timestamp: z.string(),
  })
);
