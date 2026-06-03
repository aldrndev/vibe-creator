import { z } from 'zod';

export const adminUserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);
export const adminSubscriptionTierSchema = z.enum(['FREE', 'CREATOR', 'PRO']);

export const adminUserSortBySchema = z.enum(['createdAt', 'name', 'email', 'exportsUsed']);
export const adminSortOrderSchema = z.enum(['asc', 'desc']);

const optionalTrimmedString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const adminUserIdParamsSchema = z.object({
  userId: z.string().cuid(),
});

export const adminAnnouncementIdParamsSchema = z.object({
  id: z.string().cuid(),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalTrimmedString,
  tier: adminSubscriptionTierSchema.or(z.literal('ALL')).default('ALL'),
  status: adminUserStatusSchema.or(z.literal('ALL')).default('ACTIVE'),
  sortBy: adminUserSortBySchema.default('createdAt'),
  sortOrder: adminSortOrderSchema.default('desc'),
});

export const adminActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUpdateSubscriptionSchema = z.object({
  tier: adminSubscriptionTierSchema,
  validDays: z.number().int().min(1).max(365).optional().default(30),
  resetUsage: z.boolean().optional().default(false),
});

export const adminUpdateUserStatusSchema = z.object({
  status: adminUserStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

export const adminCreateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(1000),
});

export const adminUpdateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diubah.',
  });

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUpdateSubscriptionInput = z.infer<typeof adminUpdateSubscriptionSchema>;
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>;
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
