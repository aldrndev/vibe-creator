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
  stylePreset: 'viral-pop',
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
    expect(scene.presetLabel).toBe('Podcast Short');
    expect(scene.subtitleContainerClass).toContain('items-center');
    expect(scene.subtitleTextClass).toContain('tracking');
    expect(scene.appliedFeatureLabels).toContain('Subtitle Karaoke');
    expect(scene.appliedFeatureLabels).toContain('Mode Podcast');
    expect(scene.appliedFeatureLabels).toContain('Audio Rata');
  });

  it('keeps portrait frame filled when fokus subjek dimatikan', () => {
    const scene = deriveLivePreviewScene(exportSettings, subtitleStyle, clip, {
      ...refineSettings,
      faceTracking: false,
    });

    expect(scene.aspectClass).toBe('aspect-9/16');
    expect(scene.mediaClass).toBe('object-cover');
  });

  it('shows stabilize metadata on scene when stabilize is enabled', () => {
    const scene = deriveLivePreviewScene(exportSettings, subtitleStyle, clip, {
      ...refineSettings,
      stabilize: true,
      contentMode: 'general',
    });

    expect(scene.mediaClass).toContain('will-change-transform');
    expect(scene.frameClass).toContain('shadow');
    expect(scene.appliedFeatureLabels).toContain('Stabilize');
    expect(scene.appliedFeatureLabels).toContain('Mode Podcast');
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

  it('shows one word at a time for word-by-word animation mode', () => {
    const draft = deriveLivePreviewDraft(clip, refineSettings);

    expect(getLivePreviewSubtitleText(draft, 200, 'word')).toBe('Ini');
    expect(getLivePreviewSubtitleText(draft, 800, 'word')).toBe('contoh');
    expect(getLivePreviewSubtitleText(draft, 1_600, 'word')).toBe('');
  });

  it('keeps typewriter behavior even when words timestamps are missing', () => {
    const clipWithoutWords: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          {
            startMs: 0,
            endMs: 2_000,
            text: 'Ini contoh hook cepat',
          },
        ],
      },
    };
    const draft = deriveLivePreviewDraft(clipWithoutWords, refineSettings);

    expect(getLivePreviewSubtitleText(draft, 250, 'typewriter')).toBe('Ini');
    expect(getLivePreviewSubtitleText(draft, 1_100, 'typewriter')).not.toBe(
      'Ini contoh hook cepat',
    );
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
    expect(draft?.durationMs).toBe(12_900);
    expect(draft?.transcriptSegments[0]?.text).toBe(
      'Ini inti hook yang langsung masuk ke poin utama.',
    );
    expect(draft?.transcriptSegments[0]?.startMs).toBe(100);
  });

  it('preserves a long visual tail when transcript ends before selected duration', () => {
    const longTailClip: SelectedClip = {
      ...clip,
      candidate: { ...clip.candidate, startMs: 0, endMs: 60_000 },
      transcript: {
        segments: [
          {
            startMs: 0,
            endMs: 40_000,
            text: 'Transkrip berhenti sebelum akhir visual.',
          },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(longTailClip, refineSettings);

    expect(draft?.durationMs).toBe(60_000);
    expect(draft?.transcriptSegments.at(-1)?.endMs).toBe(40_000);
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

  it('keeps previous subtitle briefly visible before next close segment starts', () => {
    const closeGapClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Segment pertama.' },
          { startMs: 1_260, endMs: 2_000, text: 'Segment kedua.' },
        ],
      },
    };

    const draft = deriveLivePreviewDraft(closeGapClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 1_150, 'none')).toBe('Segment pertama.');
    expect(getLivePreviewSubtitleText(draft, 1_240, 'none')).toBe('');
    expect(getLivePreviewSubtitleText(draft, 1_261, 'none')).toBe('Segment kedua.');
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

  it('skips empty-text segments so subtitle does not appear before speech', () => {
    const clipWithEmptySegment: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 2_000, text: '' },
          { startMs: 0, endMs: 2_000, text: '   ' },
          { startMs: 2_500, endMs: 4_000, text: 'Baru mulai bicara di sini.' },
        ],
      },
    };
    const noTrimSettings: RefineSettings = {
      contentMode: 'general',
      removeSilence: false,
      optimizeHook: false,
      faceTracking: false,
      stabilize: false,
    };
    const draft = deriveLivePreviewDraft(clipWithEmptySegment, noTrimSettings);

    expect(getLivePreviewSubtitleText(draft, 500, 'none')).toBe('');
    expect(getLivePreviewSubtitleText(draft, 1_500, 'none')).toBe('');
    expect(getLivePreviewSubtitleText(draft, 3_000, 'none')).toBe('Baru mulai bicara di sini.');
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

  it('shows full segment text in cinematic phrase mode', () => {
    const draft = deriveLivePreviewDraft(clipWithManyWords, undefined);

    expect(getLivePreviewSubtitleText(draft, 1_200, 'phrase')).toBe(
      'Ini contoh hook yang langsung bikin orang penasaran dan berhenti scroll.',
    );
  });

  it('combines close subtitle segments into one speaker turn in phrase mode', () => {
    const closeGapClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Kita bahas hook dulu.' },
          { startMs: 1_200, endMs: 2_200, text: 'Lalu lanjut ke CTA yang jelas.' },
        ],
      },
    };
    const draft = deriveLivePreviewDraft(closeGapClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 500, 'phrase')).toBe(
      'Kita bahas hook dulu. Lalu lanjut ke CTA yang jelas.',
    );
  });

  it('keeps phrase turns separated when speaker changes', () => {
    const closeGapClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Speaker satu dulu.', speaker: 'SPEAKER_00' },
          { startMs: 1_200, endMs: 2_000, text: 'Speaker dua masuk.', speaker: 'SPEAKER_01' },
        ],
      },
    };
    const draft = deriveLivePreviewDraft(closeGapClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 500, 'phrase')).toBe('Speaker satu dulu.');
    expect(getLivePreviewSubtitleText(draft, 1_300, 'phrase')).toBe('Speaker dua masuk.');
  });

  it('returns empty string before segment starts in phrase mode', () => {
    const lateSegmentClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          {
            startMs: 2_000,
            endMs: 5_000,
            text: 'Late start.',
          },
        ],
      },
    };

    const noTrimSettings: RefineSettings = {
      contentMode: 'general',
      removeSilence: false,
      optimizeHook: false,
      faceTracking: false,
      stabilize: false,
    };
    const draft = deriveLivePreviewDraft(lateSegmentClip, noTrimSettings);

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

  it('shows merged speaker turn text when segments are close in line mode', () => {
    const closeGapClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Opening hook dulu.' },
          { startMs: 1_220, endMs: 2_000, text: 'Baru masuk value utama.' },
        ],
      },
    };
    const draft = deriveLivePreviewDraft(closeGapClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 400, 'line')).toBe(
      'Opening hook dulu. Baru masuk value utama.',
    );
  });

  it('keeps line subtitle separated when speaker changes', () => {
    const closeGapClip: SelectedClip = {
      ...clip,
      transcript: {
        segments: [
          { startMs: 0, endMs: 1_000, text: 'Host membuka.', speaker: 'SPEAKER_00' },
          { startMs: 1_220, endMs: 2_000, text: 'Guest menjawab.', speaker: 'SPEAKER_01' },
        ],
      },
    };
    const draft = deriveLivePreviewDraft(closeGapClip, undefined);

    expect(getLivePreviewSubtitleText(draft, 400, 'line')).toBe('Host membuka.');
    expect(getLivePreviewSubtitleText(draft, 1_400, 'line')).toBe('Guest menjawab.');
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
  it('maps top to 30% anchor from top', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, position: 'top' },
      clip,
      undefined,
    );

    expect(scene.subtitleContainerClass).toContain('pt-[30%]');
  });

  it('maps bottom to 30% anchor from bottom', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, position: 'bottom' },
      clip,
      undefined,
    );

    expect(scene.subtitleContainerClass).toContain('pb-[30%]');
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

  it('maps viral pop animation to an enlarged preview text class', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      { ...subtitleStyle, animation: 'pop-word' },
      clip,
      undefined,
    );

    expect(scene.subtitleTextClass).toContain('scale-110');
  });

  it('maps subtitle color, background, and font tokens into preview style', () => {
    const scene = deriveLivePreviewScene(
      exportSettings,
      {
        ...subtitleStyle,
        fontToken: 'F_SERIF',
        textColorToken: 'C_ORANGE',
        bgColorToken: 'BG_TRANSPARENT',
      },
      clip,
      undefined,
    );

    expect(scene.subtitleTextStyle.fontFamily).toContain('Georgia');
    expect(scene.subtitleTextStyle.color).toBe('#FF8C1A');
    expect(scene.subtitleTextStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});
