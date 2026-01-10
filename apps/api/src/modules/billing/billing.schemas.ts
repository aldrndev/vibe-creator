/**
 * Billing Module Schemas
 * API documentation for billing endpoints
 */

import { z } from "zod";

// ============================================================================
// Request Schemas
// ============================================================================

export const topupRequestSchema = z.object({
  packageId: z.string(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const streamPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  minutes: z.number(),
  price: z.number(),
  currency: z.string(),
});

export const quotaResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    remaining: z.number(),
    total: z.number(),
    used: z.number(),
    cycleEnd: z.date(),
  }),
});

export const packagesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(streamPackageSchema),
});

export const topupResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    invoiceUrl: z.string(),
    invoiceId: z.string(),
  }),
});

export const webhookResponseSchema = z.object({
  success: z.literal(true),
});

export const errorResponseSchema = z.object({
  success: z.literal(false).optional(),
  error: z.string(),
});

// ============================================================================
// Route Schema Options
// ============================================================================

export const getQuotaRouteSchema = {
  tags: ["Billing"],
  summary: "Get user quota",
  description: "Get current billing cycle quota information.",
  response: {
    200: quotaResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const getPackagesRouteSchema = {
  tags: ["Billing"],
  summary: "Get available packages",
  description: "List all available stream minute packages.",
  security: [], // Public
  response: {
    200: packagesResponseSchema,
  },
};

export const createTopupRouteSchema = {
  tags: ["Billing"],
  summary: "Request topup invoice",
  description: "Create an invoice for purchasing stream minutes.",
  body: topupRequestSchema,
  response: {
    200: topupResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const webhookRouteSchema = {
  tags: ["Billing"],
  summary: "Xendit webhook",
  description: "Handle payment provider webhooks.",
  security: [], // Uses signature verification
  response: {
    200: webhookResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
};
