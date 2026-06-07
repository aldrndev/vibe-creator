import { describe, expect, it } from 'vitest';
import { resolveDirectorEffectiveExportSettings } from '@/lib/director-export-entitlement';
import type { ExportSettings } from '@/stores/director-store';

const baseExportSettings: ExportSettings = {
  aspectRatio: '16:9',
  quality: '1080p',
  includeSubtitles: true,
  normalizeAudio: true,
};

describe('AI Director export entitlement', () => {
  it('normalizes all output to portrait Short format', () => {
    const settings = resolveDirectorEffectiveExportSettings(baseExportSettings, {
      role: 'USER',
      tier: 'CREATOR',
    });

    expect(settings.aspectRatio).toBe('9:16');
  });

  it('uses 720p for Free users', () => {
    const settings = resolveDirectorEffectiveExportSettings(baseExportSettings, {
      role: 'USER',
      tier: 'FREE',
    });

    expect(settings.quality).toBe('720p');
  });

  it('uses 1080p for Creator, Pro, and Admin users', () => {
    expect(
      resolveDirectorEffectiveExportSettings(baseExportSettings, {
        role: 'USER',
        tier: 'CREATOR',
      }).quality,
    ).toBe('1080p');
    expect(
      resolveDirectorEffectiveExportSettings(baseExportSettings, {
        role: 'USER',
        tier: 'PRO',
      }).quality,
    ).toBe('1080p');
    expect(
      resolveDirectorEffectiveExportSettings(baseExportSettings, {
        role: 'ADMIN',
        tier: 'FREE',
      }).quality,
    ).toBe('1080p');
  });
});
