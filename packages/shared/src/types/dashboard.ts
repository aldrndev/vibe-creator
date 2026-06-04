import { z } from 'zod';

export const dashboardToolSchema = z.enum([
  'ai-director',
  'video-studio',
  'loop-creator',
  'reaction-video',
  'live-stream',
]);

export const dashboardLifecycleStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'DELETED',
  'DOWNLOAD_EXPIRED',
]);

export const dashboardQuotaTierSchema = z.enum(['FREE', 'CREATOR', 'PRO', 'ADMIN']);

export const dashboardStatsSchema = z.object({
  activeProjects: z.number().int().nonnegative(),
  prompts: z.number().int().nonnegative(),
  exports: z.number().int().nonnegative(),
  downloads: z.number().int().nonnegative(),
});

export const dashboardQuotaSummarySchema = z.object({
  tier: dashboardQuotaTierSchema,
  exportsUsed: z.number().int().nonnegative(),
  exportsLimit: z.number().int().nonnegative().nullable(),
  remaining: z.number().int().nonnegative().nullable(),
  usagePercent: z.number().min(0).max(100),
  isUnlimited: z.boolean(),
});

export const dashboardRecentWorkspaceSchema = z.object({
  id: z.string().min(1),
  tool: dashboardToolSchema,
  title: z.string(),
  status: z.string(),
  lifecycleStatus: dashboardLifecycleStatusSchema,
  continueUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1).nullable(),
  updatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
});

export const dashboardLatestExportSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sourceTool: dashboardToolSchema,
  downloadUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1).nullable(),
  completedAt: z.iso.datetime().nullable(),
  downloadExpiresAt: z.iso.datetime(),
});

export const dashboardSummaryResponseSchema = z.object({
  stats: dashboardStatsSchema,
  quota: dashboardQuotaSummarySchema,
  recentWorkspaces: z.array(dashboardRecentWorkspaceSchema),
  latestExport: dashboardLatestExportSchema.nullable(),
  expiringSoon: z.array(dashboardRecentWorkspaceSchema),
});

export type DashboardTool = z.infer<typeof dashboardToolSchema>;
export type DashboardQuotaTier = z.infer<typeof dashboardQuotaTierSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type DashboardQuotaSummary = z.infer<typeof dashboardQuotaSummarySchema>;
export type DashboardRecentWorkspace = z.infer<typeof dashboardRecentWorkspaceSchema>;
export type DashboardLatestExport = z.infer<typeof dashboardLatestExportSchema>;
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>;
