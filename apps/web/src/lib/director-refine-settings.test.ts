import { describe, expect, it } from 'vitest';
import {
  applyContentModePreset,
  getEffectiveRefineSettings,
  getResolvedContentMode,
} from '@/lib/director-refine-settings';
import type { Candidate, RefineSettings, SelectedClip } from '@/stores/director-store';

function createCandidate(): Candidate {
  return {
    id: 'candidate-1',
    startMs: 0,
    endMs: 24_000,
    score: 0.88,
    metadata: {
      scoreBreakdown: {
        energy: 48,
        dialogDensity: 36,
        durationFit: 92,
        visualPenalty: 6,
        topSignals: ['Durasi 92', 'Energy 48', 'Dialog 36'],
        badges: ['Highlight', 'Durasi Pas', 'Sinematik'],
        contentModeSuggestion: 'cinematic',
      },
    },
  };
}

function createClip(): SelectedClip {
  return {
    id: 'clip-1',
    candidateId: 'candidate-1',
    orderIndex: 0,
    candidate: createCandidate(),
  };
}

describe('director refine settings', () => {
  it('uses candidate suggestion when content mode is auto', () => {
    const settings: RefineSettings = {
      contentMode: 'auto',
    };

    expect(getResolvedContentMode(createCandidate(), settings)).toBe('cinematic');
  });

  it('applies preset defaults for cinematic clips', () => {
    const settings = getEffectiveRefineSettings(createClip(), {
      contentMode: 'auto',
    });

    expect(settings).toMatchObject({
      contentMode: 'auto',
      faceTracking: false,
      removeSilence: false,
      optimizeHook: false,
      stabilize: false,
    });
  });

  it('creates explicit override settings when a mode button is picked', () => {
    expect(applyContentModePreset(createCandidate(), 'podcast')).toMatchObject({
      contentMode: 'podcast',
      faceTracking: true,
      removeSilence: true,
      optimizeHook: true,
    });
  });

  it('enables tracking stabilization for product-review mode', () => {
    expect(applyContentModePreset(createCandidate(), 'product-review')).toMatchObject({
      contentMode: 'product-review',
      faceTracking: true,
      stabilize: true,
    });
  });

  it('keeps interview mode safe by default with face tracking off', () => {
    expect(applyContentModePreset(createCandidate(), 'interview')).toMatchObject({
      contentMode: 'interview',
      faceTracking: false,
      removeSilence: true,
      optimizeHook: true,
    });
  });
});
