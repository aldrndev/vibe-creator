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

export const updateProfileRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama wajib diisi')
      .max(80, 'Nama maksimal 80 karakter')
      .optional(),
    avatarUrl: z.url('URL avatar tidak valid').nullable().optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.avatarUrl !== undefined, {
    message: 'Minimal satu field profil harus diubah',
  });

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter')
      .max(128, 'Password baru maksimal 128 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
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

export const profileResponseSchema = meResponseSchema;

export const changePasswordResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
    revokedSessions: z.number().int().nonnegative(),
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

export const updateProfileRouteSchema = {
  tags: ['Authentication'],
  summary: 'Update current user profile',
  description: 'Update authenticated user profile fields.',
  body: updateProfileRequestSchema,
  response: {
    200: profileResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

export const changePasswordRouteSchema = {
  tags: ['Authentication'],
  summary: 'Change current user password',
  description: 'Verify current password and store a new password hash.',
  body: changePasswordRequestSchema,
  response: {
    200: changePasswordResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    429: errorResponseSchema,
  },
};

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
