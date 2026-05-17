import { z } from 'zod';

export const workspaceToolSchema = z.enum(['ai-director', 'video-studio', 'exports']);
export const workspaceKindSchema = z.enum(['ai-director', 'video-studio']);
export const workspaceStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED']);

export const recentWorkspacesQuerySchema = z.object({
  tool: workspaceToolSchema.optional(),
  status: workspaceStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

export const lastActiveWorkspaceQuerySchema = z.object({
  tool: z.enum(['ai-director', 'video-studio']),
});

export const workspaceParamsSchema = z.object({
  kind: workspaceKindSchema,
  id: z.string().min(1),
});

export type WorkspaceTool = z.infer<typeof workspaceToolSchema>;
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;
export type RecentWorkspacesQuery = z.infer<typeof recentWorkspacesQuerySchema>;
