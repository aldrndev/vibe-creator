import { describe, expect, it } from 'vitest';
import { getContentModePreset, guessContentMode } from '@/modules/director/content-mode';

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
});
