import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/services/api';

const adminTierSchema = z.enum(['FREE', 'CREATOR', 'PRO']);
const adminStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);
const adminSortBySchema = z.enum(['createdAt', 'name', 'email', 'exportsUsed']);
const adminSortOrderSchema = z.enum(['asc', 'desc']);

const subscriptionSchema = z.object({
  tier: adminTierSchema,
  status: z.string(),
  exportsUsed: z.number(),
  exportsLimit: z.number(),
  validUntil: z.string().nullable().optional(),
});

const userDataSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  role: z.string(),
  status: adminStatusSchema,
  deletedAt: z.string().nullable().optional(),
  suspendedAt: z.string().nullable().optional(),
  suspensionReason: z.string().nullable().optional(),
  createdAt: z.string(),
  subscription: subscriptionSchema.nullable(),
  _count: z.object({ projects: z.number(), exports: z.number() }),
});

const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

const userListResponseSchema = z.object({
  users: z.array(userDataSchema),
  pagination: paginationSchema,
});

const adminStatsSchema = z.object({
  users: z.object({
    total: z.number(),
    recent: z.number(),
    byTier: z.object({ free: z.number(), creator: z.number(), pro: z.number() }),
    byStatus: z.object({ active: z.number(), suspended: z.number(), deleted: z.number() }),
  }),
  projects: z.number(),
  exports: z.object({ total: z.number(), recent: z.number() }),
  revenue: z.object({ total: z.number(), payments: z.number() }),
});

const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const activitySchema = z.object({
  activity: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['export', 'payment', 'signup']),
      createdAt: z.string(),
      status: z.string().optional(),
      amount: z.number().optional(),
      tier: adminTierSchema.optional(),
      user: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
      name: z.string().optional(),
    }),
  ),
});

export type AdminTier = z.infer<typeof adminTierSchema>;
export type AdminUserStatus = z.infer<typeof adminStatusSchema>;
export type AdminSortBy = z.infer<typeof adminSortBySchema>;
export type AdminSortOrder = z.infer<typeof adminSortOrderSchema>;
export type AdminStats = z.infer<typeof adminStatsSchema>;
export type UserData = z.infer<typeof userDataSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type AdminActivity = z.infer<typeof activitySchema>['activity'][number];

export interface AdminUserFilters {
  page: number;
  limit: number;
  search: string;
  tier: AdminTier | 'ALL';
  status: AdminUserStatus | 'ALL';
  sortBy: AdminSortBy;
  sortOrder: AdminSortOrder;
}

export interface UpdateSubscriptionInput {
  userId: string;
  tier: AdminTier;
  validDays: number;
  resetUsage: boolean;
}

export interface UpdateUserStatusInput {
  userId: string;
  status: AdminUserStatus;
  reason?: string;
}

const adminKeys = {
  stats: ['admin', 'stats'] as const,
  activity: ['admin', 'activity'] as const,
  users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
  announcements: ['admin', 'announcements'] as const,
};

function buildUserQuery(filters: AdminUserFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    tier: filters.tier,
    status: filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return params.toString();
}

async function getParsed<T>(endpoint: string, schema: z.ZodSchema<T>): Promise<T> {
  const response = await api.get<unknown>(endpoint);
  if (!response.success) {
    throw new Error(response.error?.message ?? 'Gagal memuat data admin');
  }

  const parsed = schema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error('Response admin tidak valid');
  }

  return parsed.data;
}

async function mutateParsed<T>(
  endpoint: string,
  method: 'patch' | 'post' | 'delete',
  schema: z.ZodSchema<T>,
  body?: unknown,
): Promise<T> {
  const response =
    method === 'patch'
      ? await api.patch<unknown>(endpoint, body)
      : method === 'post'
        ? await api.post<unknown>(endpoint, body)
        : await api.delete<unknown>(endpoint);

  if (!response.success) {
    throw new Error(response.error?.message ?? 'Operasi admin gagal');
  }

  const parsed = schema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error('Response admin tidak valid');
  }

  return parsed.data;
}

export function useAdminData(filters: AdminUserFilters) {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: adminKeys.stats,
    queryFn: () => getParsed('/admin/stats', adminStatsSchema),
  });
  const activityQuery = useQuery({
    queryKey: adminKeys.activity,
    queryFn: () => getParsed('/admin/activity?limit=12', activitySchema),
  });
  const usersQuery = useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => getParsed(`/admin/users?${buildUserQuery(filters)}`, userListResponseSchema),
  });
  const announcementsQuery = useQuery({
    queryKey: adminKeys.announcements,
    queryFn: () => getParsed('/admin/announcements', z.array(announcementSchema)),
  });

  const invalidateAdminData = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['announcements'] }),
    ]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: (input: UpdateSubscriptionInput) =>
      mutateParsed(`/admin/users/${input.userId}/subscription`, 'patch', subscriptionSchema, {
        tier: input.tier,
        validDays: input.validDays,
        resetUsage: input.resetUsage,
      }),
    onSuccess: invalidateAdminData,
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: (input: UpdateUserStatusInput) =>
      mutateParsed(
        `/admin/users/${input.userId}/status`,
        'patch',
        userDataSchema.pick({
          id: true,
          email: true,
          name: true,
          status: true,
          suspendedAt: true,
          deletedAt: true,
          suspensionReason: true,
        }),
        {
          status: input.status,
          reason: input.reason,
        },
      ),
    onSuccess: invalidateAdminData,
  });

  const softDeleteUserMutation = useMutation({
    mutationFn: (userId: string) =>
      mutateParsed(
        `/admin/users/${userId}`,
        'delete',
        userDataSchema.pick({
          id: true,
          email: true,
          name: true,
          status: true,
          suspendedAt: true,
          deletedAt: true,
          suspensionReason: true,
        }),
      ),
    onSuccess: invalidateAdminData,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (input: { title: string; content: string }) =>
      mutateParsed('/admin/announcements', 'post', announcementSchema, input),
    onSuccess: invalidateAdminData,
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<Announcement> }) =>
      mutateParsed(`/admin/announcements/${input.id}`, 'patch', announcementSchema, input.data),
    onSuccess: invalidateAdminData,
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) =>
      mutateParsed(`/admin/announcements/${id}`, 'delete', z.object({ message: z.string() })),
    onSuccess: invalidateAdminData,
  });

  return {
    statsQuery,
    activityQuery,
    usersQuery,
    announcementsQuery,
    updateSubscriptionMutation,
    updateUserStatusMutation,
    softDeleteUserMutation,
    createAnnouncementMutation,
    updateAnnouncementMutation,
    deleteAnnouncementMutation,
  };
}
