import { describe, expect, it } from 'vitest';
import {
  deriveLivePreviewDraft,
  deriveLivePreviewScene,
  getLivePreviewSubtitleText,
} from '@/components/director/steps/editing-live-preview-utils';
import type {
  ExportSettings,
  RefineSettings,
  SelectedClip,
  SubtitleStyle,
} from '@/stores/director-store';

const exportSettings: ExportSettings = {
  aspectRatio: '9:16',
  quality: '1080p',
  includeSubtitles: true,
  normalizeAudio: true,
};

const subtitleStyle: SubtitleStyle = {
  fontToken: 'F_INTER',
  fontSize: 28,
  textColorToken: 'C_WHITE',
  bgColorToken: 'C_BLACK',
  position: 'center',
  animation: 'typewriter',
};

const refineSettings: RefineSettings = {
  contentMode: 'auto',
  faceTracking: true,
  removeSilence: true,
  optimizeHook: true,
  stabilize: false,
};

const clip: SelectedClip = {
  id: 'clip-1',
  candidateId: 'candidate-1',
  orderIndex: 0,
  candidate: {
    id: 'candidate-1',
    startMs: 0,
    endMs: 15_000,
    score: 0.88,
    previewStorageKey: 'director/previews/preview.jpg',
  },
  transcript: {
    segments: [
      {
        startMs: 0,
        endMs: 2_000,
        text: 'Ini contoh hook yang langsung bikin orang penasaran.',
        words: [
          {
            startMs: 0,
            endMs: 400,
            text: 'Ini',
          },
          {
            startMs: 450,
            endMs: 900,
            text: 'contoh',
          },
          {
            startMs: 950,
            endMs: 1_400,
            text: 'hook',
          },
        ],
      },
    ],
  },
};

describe('deriveLivePreviewScene', () => {
  it('uses portrait focus styling when fokus subjek aktif', () => {
    const scene = deriveLivePreviewScene(exportSettings, subtitleStyle, clip, refineSettings);

    expect(scene.aspectClass).toBe('aspect-9/16');
    expect(scene.mediaClass).toContain('object-cover');
    expect(scene.presetLabel).toBe('Fokus Subjek Aktif');
    expect(scene.subtitleContainerClass).toContain('items-center');
    expect(scene.subtitleTextClass).toContain('tracking');
    expect(scene.appliedFeatureLabels).toContain('Subtitle Sinkron');
    expect(scene.appliedFeatureLabels).toContain('Fokus Subjek');
  });

  it('falls back to safe sample text when transcript is unavailable', () => {
    const scene = deriveLivePreviewScene(
      { ...exportSettings, aspectRatio: '16:9' },
      { ...subtitleStyle, position: 'bottom', animation: 'none' },
      undefined,
      { ...refineSettings, faceTracking: false },
    );

    expect(scene.aspectClass).toBe('aspect-video');
    expect(scene.mediaClass).toBe('object-contain');
    expect(scene.subtitleSample).toContain('Hook cepat');
    expect(scene.presetLabel).toBe('Landscape Aman');
  });

  it('syncs subtitle text with current playback time for typewriter mode', () => {
    const draft = deriveLivePreviewDraft(clip, refineSettings);

    expect(getLivePreviewSubtitleText(draft, 200, 'typewriter')).toBe('Ini');
    expect(getLivePreviewSubtitleText(draft, 800, 'typewriter')).toBe('Ini contoh');
    expect(getLivePreviewSubtitleText(draft, 1_600, 'typewriter')).toBe('Ini contoh hook');
  });

  it('falls back to full segment text when animation is not typewriter', () => {
    const draft = deriveLivePreviewDraft(clip, refineSettings);

    expect(getLivePreviewSubtitleText(draft, 800, 'fade')).toBe(
      'Ini contoh hook yang langsung bikin orang penasaran.',
    );
  });

  it('builds a refined draft preview window for silence removal and hook optimization', () => {
    const clipWithLeadIn: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          {
            startMs: 1_000,
            endMs: 1_500,
            text: 'Halo guys',
          },
          {
            startMs: 2_200,
            endMs: 4_000,
            text: 'Ini inti hook yang langsung masuk ke poin utama.',
          },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(clipWithLeadIn, refineSettings);

    expect(draft).not.toBeNull();
    expect(draft?.startOffsetMs).toBe(2_100);
    expect(draft?.durationMs).toBe(2_080);
    expect(draft?.transcriptSegments[0]?.text).toBe(
      'Ini inti hook yang langsung masuk ke poin utama.',
    );
    expect(draft?.transcriptSegments[0]?.startMs).toBe(100);
  });
});

describe('getLivePreviewSubtitleText timing fix', () => {
  it('returns empty string when currentTimeMs is in a gap between segments', () => {
    const multiSegmentClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Segment pertama.' },
          { startMs: 3_000, endMs: 5_000, text: 'Segment kedua.' },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(multiSegmentClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 1_500, 'none')).toBe('');
    expect(getLivePreviewSubtitleText(draft, 2_500, 'fade')).toBe('');
  });

  it('returns empty string before the first segment starts', () => {
    const lateStartClip: SelectedClip = {
      ...clip,
      candidate: { ...clip.candidate, startMs: 0, endMs: 10_000 },
      transcript: {
        segments: [{ startMs: 2_000, endMs: 4_000, text: 'Mulai bicara di sini.' }],
      },
    };

    const noTrimSettings: RefineSettings = {
      contentMode: 'cinematic',
      removeSilence: false,
      optimizeHook: false,
      faceTracking: false,
      stabilize: false,
    };
    const draft = deriveLivePreviewDraft(lateStartClip, noTrimSettings);

    expect(getLivePreviewSubtitleText(draft, 500, 'none')).toBe('');
    expect(getLivePreviewSubtitleText(draft, 1_999, 'none')).toBe('');
  });

  it('shows segment text when currentTimeMs is within active segment', () => {
    const draft = deriveLivePreviewDraft(clip, undefined);

    expect(getLivePreviewSubtitleText(draft, 500, 'none')).toBe(
      'Ini contoh hook yang langsung bikin orang penasaran.',
    );
  });

  it('returns empty string when draft has no transcript segments', () => {
    expect(getLivePreviewSubtitleText(null, 1_000, 'none')).toBe('');

    const emptyDraft = deriveLivePreviewDraft({ ...clip, transcript: { segments: [] } }, undefined);

    expect(getLivePreviewSubtitleText(emptyDraft, 1_000, 'fade')).toBe('');
  });
});

describe('getLivePreviewSubtitleText phrase mode', () => {
  const clipWithManyWords: SelectedClip = {
    ...clip,
    transcript: {
      segments: [
        {
          startMs: 0,
          endMs: 5_000,
          text: 'Ini contoh hook yang langsung bikin orang penasaran dan berhenti scroll.',
          words: [
            { startMs: 0, endMs: 300, text: 'Ini' },
            { startMs: 350, endMs: 700, text: 'contoh' },
            { startMs: 750, endMs: 1_100, text: 'hook' },
            { startMs: 1_150, endMs: 1_500, text: 'yang' },
            { startMs: 1_550, endMs: 1_900, text: 'langsung' },
            { startMs: 1_950, endMs: 2_300, text: 'bikin' },
            { startMs: 2_350, endMs: 2_700, text: 'orang' },
            { startMs: 2_750, endMs: 3_100, text: 'penasaran' },
          ],
        },
      ],
    },
  };

  it('shows first phrase group (4 words) at the start', () => {
    const draft = deriveLivePreviewDraft(clipWithManyWords, undefined);

    expect(getLivePreviewSubtitleText(draft, 1_200, 'phrase')).toBe('Ini contoh hook yang');
  });

  it('shows second phrase group when enough words are visible', () => {
    const draft = deriveLivePreviewDraft(clipWithManyWords, undefined);

    expect(getLivePreviewSubtitleText(draft, 2_000, 'phrase')).toBe(
      'langsung bikin orang penasaran',
    );
  });

  it('returns empty string before any word starts in phrase mode', () => {
    const lateWordClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          {
            startMs: 0,
            endMs: 5_000,
            text: 'Late start.',
            words: [{ startMs: 2_000, endMs: 3_000, text: 'Late' }],
          },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(lateWordClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 500, 'phrase')).toBe('');
  });
});

describe('getLivePreviewSubtitleText line mode', () => {
  it('shows the full segment text in line mode', () => {
    const draft = deriveLivePreviewDraft(clip, undefined);

    expect(getLivePreviewSubtitleText(draft, 500, 'line')).toBe(
      'Ini contoh hook yang langsung bikin orang penasaran.',
    );
  });

  it('returns empty string when not in any segment in line mode', () => {
    const gappedClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Awal.' },
          { startMs: 3_000, endMs: 5_000, text: 'Akhir.' },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(gappedClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 2_000, 'line')).toBe('');
  });
});

describe('deriveLivePreviewScene positions', () => {
  it('maps cinema-bottom to correct container class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, position: 'cinema-bottom' },
      clip,
      undefined,
    );

    expect(scene.subtitleContainerClass).toContain('pb-[15%]');
  });

  it('maps safe-bottom to correct container class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, position: 'safe-bottom' },
      clip,
      undefined,
    );

    expect(scene.subtitleContainerClass).toContain('pb-[10%]');
  });

  it('maps lower-third to correct container class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, position: 'lower-third' },
      clip,
      undefined,
    );

    expect(scene.subtitleContainerClass).toContain('pb-[33%]');
  });

  it('maps phrase animation to correct text class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, animation: 'phrase' },
      clip,
      undefined,
    );

    expect(scene.subtitleTextClass).toContain('tracking-[0.02em]');
  });

  it('maps line animation to correct text class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, animation: 'line' },
      clip,
      undefined,
    );

    expect(scene.subtitleTextClass).toContain('opacity-90');
  });
});
