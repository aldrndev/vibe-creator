import { describe, expect, it } from 'vitest';
import {
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
  notificationPreferencesUpdateSchema,
} from '../user-preferences.schemas';

describe('user preferences schemas', () => {
  it('accepts valid notification preference updates', () => {
    const result = notificationPreferencesUpdateSchema.parse({ email: false, push: true });

    expect(result).toEqual({ email: false, push: true });
  });

  it('rejects empty updates', () => {
    expect(() => notificationPreferencesUpdateSchema.parse({})).toThrow(
      'Minimal satu preferensi harus diubah',
    );
  });

  it('rejects unknown notification keys', () => {
    expect(() => notificationPreferencesUpdateSchema.parse({ email: true, sms: true })).toThrow();
  });

  it('normalizes invalid stored preferences to defaults', () => {
    expect(normalizeNotificationPreferences({ email: true })).toEqual(
      defaultNotificationPreferences,
    );
  });

  it('preserves valid stored preferences', () => {
    const preferences = { email: false, push: true, marketing: true };

    expect(normalizeNotificationPreferences(preferences)).toEqual(preferences);
  });
});
