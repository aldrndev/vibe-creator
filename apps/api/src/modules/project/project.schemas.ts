/**
 * Project Module Schemas
 * Centralized Zod schemas for API documentation (Swagger)
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const createProjectRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  mode: z.enum(['STORY', 'TIMELINE']).optional(),
  storyData: z.looseObject({}).optional(),
});

export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  mode: z.enum(['STORY', 'TIMELINE']).optional(),
  storyData: z.looseObject({}).optional(),
});

export const projectIdParamsSchema = z.object({
  id: z.string(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  cursor: z.string().optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const assetSchema = z.object({
  id: z.string(),
  type: z.string(),
  url: z.string().nullable(),
  filename: z.string().nullable(),
  mimeType: z.string().nullable(),
  createdAt: z.date(),
});

const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  mode: z.enum(['STORY', 'TIMELINE']),
  storyData: z.unknown().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const projectWithAssetsSchema = projectSchema.extend({
  assets: z.array(assetSchema),
});

const projectWithCountSchema = projectSchema.extend({
  _count: z.object({
    assets: z.number(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const projectResponseSchema = z.object({
  success: z.literal(true),
  data: projectWithAssetsSchema,
});

export const projectListResponseSchema = z.object({
  success: z.literal(true),
  data: z.union([
    z.object({
      items: z.array(projectWithCountSchema),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
    z.array(projectWithCountSchema),
  ]),
  meta: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

export const deleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.null(),
});

// ============================================================================
// Route Schema Options
// ============================================================================

export const listProjectsRouteSchema = {
  tags: ['Projects'],
  summary: 'List projects',
  description: 'Get paginated list of user projects. Supports cursor or offset pagination.',
  querystring: listProjectsQuerySchema,
  response: {
    200: projectListResponseSchema,
  },
};

export const getProjectRouteSchema = {
  tags: ['Projects'],
  summary: 'Get project by ID',
  description: 'Retrieve a single project with its assets.',
  params: projectIdParamsSchema,
  response: {
    200: projectResponseSchema,
    404: errorResponseSchema,
  },
};

export const createProjectRouteSchema = {
  tags: ['Projects'],
  summary: 'Create new project',
  description: 'Create a new video project.',
  body: createProjectRequestSchema,
  response: {
    201: projectResponseSchema,
    400: errorResponseSchema,
  },
};

export const updateProjectRouteSchema = {
  tags: ['Projects'],
  summary: 'Update project',
  description: 'Update an existing project.',
  params: projectIdParamsSchema,
  body: updateProjectRequestSchema,
  response: {
    200: projectResponseSchema,
    404: errorResponseSchema,
  },
};

export const deleteProjectRouteSchema = {
  tags: ['Projects'],
  summary: 'Delete project',
  description: 'Delete a project and all its assets.',
  params: projectIdParamsSchema,
  response: {
    200: deleteResponseSchema,
    404: errorResponseSchema,
  },
};
