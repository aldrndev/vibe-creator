import { z } from 'zod';

export const notificationPreferencesSchema = z
  .object({
    email: z.boolean(),
    push: z.boolean(),
    marketing: z.boolean(),
  })
  .strict();

export const notificationPreferencesUpdateSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    marketing: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu preferensi harus diubah',
  });

export const userPreferencesDataSchema = z.object({
  notifications: notificationPreferencesSchema,
  updatedAt: z.date(),
});

export const userPreferencesResponseSchema = z.object({
  success: z.literal(true),
  data: userPreferencesDataSchema,
});

export const userPreferencesErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const getUserPreferencesRouteSchema = {
  tags: ['User'],
  summary: 'Get current user preferences',
  description: 'Retrieve persisted preferences for the authenticated user.',
  response: {
    200: userPreferencesResponseSchema,
    401: userPreferencesErrorResponseSchema,
  },
};

export const updateUserPreferencesRouteSchema = {
  tags: ['User'],
  summary: 'Update current user notification preferences',
  description: 'Persist notification preferences for the authenticated user.',
  body: notificationPreferencesUpdateSchema,
  response: {
    200: userPreferencesResponseSchema,
    400: userPreferencesErrorResponseSchema,
    401: userPreferencesErrorResponseSchema,
  },
};

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type NotificationPreferencesUpdate = z.infer<typeof notificationPreferencesUpdateSchema>;

export const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  push: false,
  marketing: false,
};

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return defaultNotificationPreferences;
}
