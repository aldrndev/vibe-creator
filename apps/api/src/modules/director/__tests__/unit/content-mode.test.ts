import { describe, expect, it } from 'vitest';
import {
  getContentModePreset,
  guessContentMode,
  resolveContentMode,
} from '@/modules/director/content-mode';

describe('content-mode', () => {
  it('classifies energetic low-dialog segments as product-review', () => {
    const mode = guessContentMode({
      durationSeconds: 42,
      energyScore: 82,
      dialogDensityScore: 46,
      visualPenalty: 18,
      tags: ['HIGH ENERGY'],
    });

    expect(mode).toBe('product-review');
  });

  it('uses stabilized tracking preset for product-review', () => {
    expect(getContentModePreset('product-review')).toMatchObject({
      faceTracking: true,
      removeSilence: true,
      optimizeHook: true,
      stabilize: true,
    });
  });

  it('classifies dense high-energy dialog as interview and disables tracking by default', () => {
    const mode = guessContentMode({
      durationSeconds: 46,
      energyScore: 74,
      dialogDensityScore: 82,
      visualPenalty: 20,
      tags: ['DENSE SPEECH', 'HIGH ENERGY'],
    });

    expect(mode).toBe('interview');
    expect(getContentModePreset('interview')).toMatchObject({
      faceTracking: false,
      removeSilence: true,
      optimizeHook: true,
    });
  });

  it('maps dense speech outside interview profile into podcast recommendation', () => {
    const mode = guessContentMode({
      durationSeconds: 18,
      energyScore: 78,
      dialogDensityScore: 74,
      visualPenalty: 44,
      tags: ['DENSE SPEECH', 'HIGH ENERGY'],
    });

    expect(mode).toBe('podcast');
  });

  it('falls back to podcast for uncategorized clips', () => {
    const mode = guessContentMode({
      durationSeconds: 10,
      energyScore: 50,
      dialogDensityScore: 50,
      visualPenalty: 40,
      tags: [],
    });

    expect(mode).toBe('podcast');
  });

  it('normalizes legacy explicit mode into podcast when resolving final mode', () => {
    const mode = resolveContentMode('talking-head', {
      durationSeconds: 38,
      energyScore: 72,
      dialogDensityScore: 80,
      visualPenalty: 20,
      tags: ['DENSE SPEECH'],
    });

    expect(mode).toBe('podcast');
  });
});
