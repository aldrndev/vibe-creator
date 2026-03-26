/**
 * Upload Module Schemas
 * API documentation for file upload endpoints
 */

import { z } from 'zod';

// ============================================================================
// Response Schemas
// ============================================================================

export const uploadResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    filename: z.string(),
    uploadToken: z.string(),
    mimetype: z.string(),
    size: z.number(),
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
// Route Schema Options
// ============================================================================

export const uploadVideoRouteSchema = {
  tags: ['Media'],
  summary: 'Upload video file',
  description: 'Upload a video file for processing. Maximum size depends on subscription.',
  consumes: ['multipart/form-data'],
  response: {
    200: uploadResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    415: errorResponseSchema,
    500: errorResponseSchema,
  },
};
