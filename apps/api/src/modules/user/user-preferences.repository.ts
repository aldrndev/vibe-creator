import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from './user-preferences.schemas';

export interface UserPreferencesRecord {
  notifications: unknown;
  updatedAt: Date;
}

export async function findUserPreferences(userId: string): Promise<UserPreferencesRecord | null> {
  return prisma.userPreference.findUnique({
    where: { userId },
    select: {
      notifications: true,
      updatedAt: true,
    },
  });
}

export async function createDefaultUserPreferences(userId: string): Promise<UserPreferencesRecord> {
  return prisma.userPreference.create({
    data: {
      userId,
      notifications: defaultNotificationPreferences as Prisma.InputJsonValue,
    },
    select: {
      notifications: true,
      updatedAt: true,
    },
  });
}

export async function upsertUserNotificationPreferences(
  userId: string,
  notifications: NotificationPreferences,
): Promise<UserPreferencesRecord> {
  return prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      notifications: notifications as Prisma.InputJsonValue,
    },
    update: {
      notifications: notifications as Prisma.InputJsonValue,
    },
    select: {
      notifications: true,
      updatedAt: true,
    },
  });
}
