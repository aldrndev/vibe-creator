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

export const projectAssetFileParamsSchema = z.object({
  assetId: z.string(),
});

export const attachProjectAssetRequestSchema = z.object({
  assetId: z.string().min(1),
  uploadToken: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.enum(['VIDEO', 'AUDIO', 'IMAGE']),
  libraryPurpose: z.enum(['media', 'background', 'reaction']).optional(),
  mimeType: z.string().optional(),
  size: z.number().nonnegative().optional(),
  durationMs: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
});

export const attachStudioAssetRequestSchema = z.object({
  studioAssetId: z.string().min(1),
  assetId: z.string().min(1).optional(),
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
  projectId: z.string().optional(),
  type: z.string(),
  name: z.string().optional(),
  sourceUrl: z.string().nullable().optional(),
  r2Key: z.string().optional(),
  metadata: z.unknown().optional(),
  createdAt: z.date(),
});

const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  mode: z.enum(['STORY', 'TIMELINE']),
  storyData: z.unknown().nullable(),
  status: z.enum(['DRAFT', 'PROCESSING', 'COMPLETED']).optional(),
  expiresAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  lastOpenedAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  lifecycleStatus: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED']).optional(),
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
    410: errorResponseSchema,
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
    410: errorResponseSchema,
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
