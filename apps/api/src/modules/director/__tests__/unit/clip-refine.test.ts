import { describe, expect, it } from 'vitest';
import { applyClipRefineSettings, resolveClipRefineSettings } from '@/modules/director/clip-refine';

describe('applyClipRefineSettings', () => {
  it('removes leading and trailing silence using transcript segments', () => {
    const refined = applyClipRefineSettings(
      {
        startMs: 10_000,
        endMs: 22_000,
        transcript: {
          segments: [
            { startMs: 1_500, endMs: 3_000, text: 'Halo semuanya' },
            { startMs: 4_000, endMs: 9_500, text: 'ini inti pembahasan' },
          ],
        },
      },
      { removeSilence: true },
    );

    expect(refined.startMs).toBe(11_380);
    expect(refined.endMs).toBe(19_680);
    const segments = refined.transcript?.segments ?? [];

    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]).toEqual({
      startMs: 120,
      endMs: 1_620,
      text: 'Halo semuanya',
    });
  });

  it('keeps clip unchanged when removeSilence is disabled', () => {
    const draft = {
      startMs: 1_000,
      endMs: 6_000,
      transcript: {
        segments: [{ startMs: 800, endMs: 4_000, text: 'No change' }],
      },
    };

    expect(applyClipRefineSettings(draft, { removeSilence: false })).toEqual(draft);
  });

  it('skips greeting filler when hook optimization is enabled', () => {
    const refined = applyClipRefineSettings(
      {
        startMs: 0,
        endMs: 18_000,
        transcript: {
          segments: [
            { startMs: 200, endMs: 1_800, text: 'Halo guys, di video ini aku mau kasih tahu' },
            {
              startMs: 3_400,
              endMs: 8_000,
              text: 'Cara bikin hook yang bikin orang berhenti scroll',
            },
          ],
        },
      },
      { removeSilence: true, optimizeHook: true },
    );

    expect(refined.startMs).toBe(3_300);
    const segments = refined.transcript?.segments ?? [];

    expect(segments[0]?.text).toContain('Cara bikin hook');
    expect(segments[0]?.startMs).toBe(100);
  });

  it('keeps cinematic mode conservative when auto suggestion is cinematic', () => {
    const settings = resolveClipRefineSettings(
      { contentMode: 'auto' },
      { contentModeSuggestion: 'cinematic' },
    );

    expect(settings).toMatchObject({
      contentMode: 'auto',
      faceTracking: false,
      removeSilence: false,
      optimizeHook: false,
      stabilize: false,
    });
  });
});
