/**
 * Download Module Schemas
 * API documentation for video download endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const createDownloadRequestSchema = z.object({
  url: z.url(),
});

export const jobIdParamsSchema = z.object({
  jobId: z.string(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  cursor: z.string().optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const createJobResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    jobId: z.string(),
    status: z.string(),
    platform: z.string().nullable(),
  }),
});

export const jobStatusResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    status: z.string(),
    progress: z.number().nullable(),
    title: z.string().nullable(),
    sourceUrl: z.string().url(),
    error: z.string().nullable(),
  }),
});

export const historyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        sourceUrl: z.string(),
        platform: z.string().nullable(),
        status: z.string(),
        title: z.string().nullable(),
        createdAt: z.date(),
      }),
    ),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const deleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    deleted: z.boolean(),
  }),
});

// ============================================================================
// Route Schema Options
// ============================================================================

export const createDownloadRouteSchema = {
  tags: ['Media'],
  summary: 'Create download job',
  description: 'Create a new video download job from a URL (YouTube, TikTok, etc).',
  body: createDownloadRequestSchema,
  response: {
    201: createJobResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
};

export const getJobStatusRouteSchema = {
  tags: ['Media'],
  summary: 'Get download job status',
  description: 'Check the status of a download job.',
  params: jobIdParamsSchema,
  response: {
    200: jobStatusResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const getJobFileRouteSchema = {
  tags: ['Media'],
  summary: 'Download completed file',
  description: 'Download the completed video file.',
  params: jobIdParamsSchema,
  response: {
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const getHistoryRouteSchema = {
  tags: ['Media'],
  summary: 'Get download history',
  description: "Get user's download history with cursor pagination.",
  querystring: historyQuerySchema,
  response: {
    200: historyResponseSchema,
    401: errorResponseSchema,
  },
};

export const deleteJobRouteSchema = {
  tags: ['Media'],
  summary: 'Delete download job',
  description: 'Delete a download job and its associated file.',
  params: jobIdParamsSchema,
  response: {
    200: deleteResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
  },
};
