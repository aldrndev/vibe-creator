/**
 * Auth Module Schemas
 * Centralized Zod schemas for API documentation (Swagger)
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const loginRequestSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(1, 'Password diperlukan'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

export const registerRequestSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  turnstileToken: z.string().min(1, 'Captcha diperlukan'),
});

// ============================================================================
// Response Schemas
// ============================================================================

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});

const subscriptionSchema = z
  .object({
    tier: z.enum(['FREE', 'CREATOR', 'PRO']),
    status: z.string(),
    exportsUsed: z.number(),
    exportsLimit: z.number(),
    validUntil: z.date().nullable(),
  })
  .nullable();

export const authSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: userSchema,
    subscription: subscriptionSchema,
    accessToken: z.string(),
    expiresAt: z.date(),
  }),
});

export const meResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: userSchema,
    subscription: subscriptionSchema,
  }),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ============================================================================
// Route Schema Options (for Fastify)
// ============================================================================

export const loginRouteSchema = {
  tags: ['Authentication'],
  summary: 'User login',
  description: 'Authenticate user with email and password. Requires Turnstile captcha.',
  body: loginRequestSchema,
  response: {
    200: authSuccessResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
  security: [], // Public endpoint
};

export const registerRouteSchema = {
  tags: ['Authentication'],
  summary: 'User registration',
  description: 'Create a new user account with email verification.',
  body: registerRequestSchema,
  response: {
    201: authSuccessResponseSchema,
    400: errorResponseSchema,
  },
  security: [], // Public endpoint
};

export const refreshRouteSchema = {
  tags: ['Authentication'],
  summary: 'Refresh access token',
  description: 'Obtain new access token using refresh token cookie.',
  response: {
    200: authSuccessResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
  security: [], // Uses cookie, not bearer
};

export const logoutRouteSchema = {
  tags: ['Authentication'],
  summary: 'User logout',
  description: 'Invalidate current session and clear auth cookies.',
  response: {
    200: logoutResponseSchema,
  },
  security: [], // Can work without auth
};

export const meRouteSchema = {
  tags: ['Authentication'],
  summary: 'Get current user',
  description: 'Retrieve authenticated user profile and subscription info.',
  response: {
    200: meResponseSchema,
    401: errorResponseSchema,
  },
};
