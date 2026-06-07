import type { Subscription, User } from '@/stores/auth-store';
import type { ExportSettings } from '@/stores/director-store';

type DirectorExportQuality = ExportSettings['quality'];

function resolveDirectorExportQuality(input: {
  readonly role?: User['role'] | null;
  readonly tier?: Subscription['tier'] | null;
}): DirectorExportQuality {
  if (input.role === 'ADMIN') {
    return '1080p';
  }

  if (input.tier === 'CREATOR' || input.tier === 'PRO') {
    return '1080p';
  }

  return '720p';
}

/**
 * Resolve the read-only AI Director output settings from the current user entitlement.
 */
export function resolveDirectorEffectiveExportSettings(
  exportSettings: ExportSettings,
  input: {
    readonly role?: User['role'] | null;
    readonly tier?: Subscription['tier'] | null;
  },
): ExportSettings {
  return {
    ...exportSettings,
    aspectRatio: '9:16',
    quality: resolveDirectorExportQuality(input),
  };
}
