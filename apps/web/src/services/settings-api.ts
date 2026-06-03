import type { ApiResponse } from '@vibe-creator/shared';
import { z } from 'zod';
import { api } from '@/services/api';

export const notificationPreferencesSchema = z
  .object({
    email: z.boolean(),
    push: z.boolean(),
    marketing: z.boolean(),
  })
  .strict();

export const userPreferencesSchema = z.object({
  notifications: notificationPreferencesSchema,
  updatedAt: z.string(),
});

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});

export const subscriptionSchema = z
  .object({
    tier: z.enum(['FREE', 'CREATOR', 'PRO']),
    status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']),
    exportsUsed: z.number(),
    exportsLimit: z.number(),
    validUntil: z.string().nullable(),
  })
  .nullable();

export const profileResponseDataSchema = z.object({
  user: userProfileSchema,
  subscription: subscriptionSchema,
});

export const changePasswordResponseDataSchema = z.object({
  message: z.string(),
  revokedSessions: z.number(),
});

export const paymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  tier: z.enum(['FREE', 'CREATOR', 'PRO']),
  status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'FAILED']),
  xenditInvoiceId: z.string().nullable(),
  xenditPaymentId: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const paymentHistorySchema = z.object({
  payments: z.array(paymentSchema),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type ProfileResponseData = z.infer<typeof profileResponseDataSchema>;
export type ChangePasswordResponseData = z.infer<typeof changePasswordResponseDataSchema>;
export type PaymentRecord = z.infer<typeof paymentSchema>;

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const response = await api.get<UserPreferences>('/user/preferences');
  return userPreferencesSchema.parse(assertSuccess(response));
}

export async function updateUserPreferences(
  input: Partial<NotificationPreferences>,
): Promise<UserPreferences> {
  const response = await api.patch<UserPreferences>('/user/preferences', input);
  return userPreferencesSchema.parse(assertSuccess(response));
}

export async function updateProfile(input: {
  name?: string;
  avatarUrl?: string | null;
}): Promise<ProfileResponseData> {
  const response = await api.patch<ProfileResponseData>('/auth/profile', input);
  return profileResponseDataSchema.parse(assertSuccess(response));
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangePasswordResponseData> {
  const response = await api.post<ChangePasswordResponseData>('/auth/change-password', input);
  return changePasswordResponseDataSchema.parse(assertSuccess(response));
}

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  const response = await api.get<{ payments: PaymentRecord[] }>('/payment/history');
  return paymentHistorySchema.parse(assertSuccess(response)).payments;
}
