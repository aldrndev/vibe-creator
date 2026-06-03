import {
  createDefaultUserPreferences,
  findUserPreferences,
  upsertUserNotificationPreferences,
} from './user-preferences.repository';
import {
  type NotificationPreferences,
  type NotificationPreferencesUpdate,
  normalizeNotificationPreferences,
} from './user-preferences.schemas';

export interface UserPreferencesView {
  notifications: NotificationPreferences;
  updatedAt: Date;
}

export async function getUserPreferences(userId: string): Promise<UserPreferencesView> {
  const existing = await findUserPreferences(userId);
  const record = existing ?? (await createDefaultUserPreferences(userId));

  return {
    notifications: normalizeNotificationPreferences(record.notifications),
    updatedAt: record.updatedAt,
  };
}

export async function updateUserPreferences(
  userId: string,
  update: NotificationPreferencesUpdate,
): Promise<UserPreferencesView> {
  const current = await getUserPreferences(userId);
  const nextNotifications: NotificationPreferences = {
    ...current.notifications,
    ...update,
  };

  const updated = await upsertUserNotificationPreferences(userId, nextNotifications);

  return {
    notifications: normalizeNotificationPreferences(updated.notifications),
    updatedAt: updated.updatedAt,
  };
}
