import { getEffectiveRefineSettings } from '@/lib/director-refine-settings';
import type {
  ExportSettings,
  RefineSettings,
  SelectedClip,
  SubtitleStyle,
} from '@/stores/director-store';

export interface LivePreviewScene {
  aspectClass: string;
  mediaClass: string;
  frameClass: string;
  subtitleContainerClass: string;
  subtitleTextClass: string;
  subtitleSample: string;
  presetLabel: string;
  appliedFeatureLabels: string[];
}

export interface LivePreviewDraft {
  startOffsetMs: number;
  durationMs: number;
  transcriptSegments: NonNullable<SelectedClip['transcript']>['segments'];
}

const LEADING_SPEECH_PADDING_MS = 120;
const TRAILING_SPEECH_PADDING_MS = 180;
const MIN_CLIP_DURATION_MS = 800;
const MAX_HOOK_TRIM_MS = 6_000;
const HOOK_PADDING_MS = 100;
const hookFillerPatterns = [
  /\bhalo\b/i,
  /\bhai\b/i,
  /\bguys\b/i,
  /\bteman-teman\b/i,
  /\bwelcome back\b/i,
  /\bdi video ini\b/i,
  /\bpada video ini\b/i,
  /\bkali ini\b/i,
] as const;

function getAspectClass(aspectRatio: ExportSettings['aspectRatio']): string {
  switch (aspectRatio) {
    case '16:9':
      return 'aspect-video';
    case '1:1':
      return 'aspect-square';
    default:
      return 'aspect-9/16';
  }
}

function getPresetLabel(
  exportSettings: ExportSettings,
  refineSettings: RefineSettings | undefined,
): string {
  if (exportSettings.aspectRatio === '9:16' && refineSettings?.faceTracking) {
    return 'Fokus Subjek Aktif';
  }

  if (exportSettings.aspectRatio === '16:9') {
    return 'Landscape Aman';
  }

  if (exportSettings.aspectRatio === '1:1') {
    return 'Format Persegi';
  }

  return 'Portrait Standar';
}

function getSubtitleSample(clip: SelectedClip | undefined): string {
  const sample = clip?.transcript?.segments
    ?.map((segment) => segment.text.trim())
    .find((text) => text.length > 0);

  if (!sample) {
    return 'Hook cepat yang langsung bikin orang berhenti scroll.';
  }

  return sample.length > 72 ? `${sample.slice(0, 69).trimEnd()}...` : sample;
}

function clampMs(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isLikelyHookFiller(text: string): boolean {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return false;
  }

  return hookFillerPatterns.some((pattern) => pattern.test(normalizedText));
}

function getLeadingTrimMs(
  segments: NonNullable<SelectedClip['transcript']>['segments'],
  settings: RefineSettings | undefined,
  clipDurationMs: number,
): number {
  const firstSegment = segments[0];
  if (!firstSegment) {
    return 0;
  }

  const silenceTrimMs = settings?.removeSilence
    ? Math.max(0, firstSegment.startMs - LEADING_SPEECH_PADDING_MS)
    : 0;

  if (!settings?.optimizeHook || segments.length < 2 || !isLikelyHookFiller(firstSegment.text)) {
    return silenceTrimMs;
  }

  const secondSegment = segments[1];
  if (!secondSegment) {
    return silenceTrimMs;
  }

  const hookTrimMs = Math.max(0, secondSegment.startMs - HOOK_PADDING_MS);
  const boundedHookTrimMs = Math.min(hookTrimMs, MAX_HOOK_TRIM_MS, clipDurationMs / 2);

  return Math.max(silenceTrimMs, boundedHookTrimMs);
}

function getAppliedFeatureLabels(
  exportSettings: ExportSettings,
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): string[] {
  const labels: string[] = [];

  if (exportSettings.includeSubtitles) {
    labels.push(clip?.transcript?.segments?.length ? 'Subtitle Sinkron' : 'Subtitle Simulasi');
  }

  if (refineSettings?.faceTracking && exportSettings.aspectRatio === '9:16') {
    labels.push('Fokus Subjek');
  }

  if (refineSettings?.removeSilence) {
    labels.push('Hapus Diam');
  }

  if (refineSettings?.optimizeHook) {
    labels.push('Hook Cepat');
  }

  if (exportSettings.normalizeAudio) {
    labels.push('Audio Rata');
  }

  return labels.slice(0, 4);
}

const PHRASE_GROUP_SIZE = 4;

function getActiveSegment(
  segments: NonNullable<SelectedClip['transcript']>['segments'],
  currentTimeMs: number,
) {
  return (
    segments.find(
      (segment) => currentTimeMs >= segment.startMs && currentTimeMs <= segment.endMs,
    ) ?? null
  );
}

function getPhraseGroupWords(
  words: NonNullable<NonNullable<SelectedClip['transcript']>['segments'][number]['words']>,
  currentTimeMs: number,
) {
  const visibleWords = words.filter((word) => currentTimeMs >= word.startMs);
  if (visibleWords.length === 0) {
    return [];
  }

  const currentGroupIndex = Math.floor((visibleWords.length - 1) / PHRASE_GROUP_SIZE);
  const groupStart = currentGroupIndex * PHRASE_GROUP_SIZE;
  const groupEnd = Math.min(groupStart + PHRASE_GROUP_SIZE, words.length);

  return words.slice(groupStart, groupEnd);
}

export function getLivePreviewSubtitleText(
  draft: LivePreviewDraft | null,
  currentTimeMs: number,
  animation: SubtitleStyle['animation'],
): string {
  const segments = draft?.transcriptSegments;
  if (!segments?.length) {
    return '';
  }

  const activeSegment = getActiveSegment(segments, currentTimeMs);

  if (!activeSegment) {
    return '';
  }

  if (animation === 'typewriter' && activeSegment.words?.length) {
    const phraseWords = getPhraseGroupWords(activeSegment.words, currentTimeMs);
    const visibleWords = phraseWords.filter((word) => currentTimeMs >= word.startMs);
    if (visibleWords.length === 0) {
      return '';
    }

    return visibleWords.map((word) => word.text).join(' ');
  }

  if (animation === 'phrase' && activeSegment.words?.length) {
    const phraseWords = getPhraseGroupWords(activeSegment.words, currentTimeMs);
    if (phraseWords.length === 0) {
      return '';
    }

    return phraseWords.map((word) => word.text).join(' ');
  }

  return activeSegment.text;
}

export function deriveLivePreviewDraft(
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): LivePreviewDraft | null {
  if (!clip) {
    return null;
  }

  const baseStartOffsetMs = Math.max(0, clip.trimStartMs ?? 0);
  const baseEndOffsetMs = Math.max(0, clip.trimEndMs ?? 0);
  const candidateDurationMs = Math.max(0, clip.candidate.endMs - clip.candidate.startMs);
  const baseDurationMs = candidateDurationMs - baseStartOffsetMs - baseEndOffsetMs;
  const transcriptSegments =
    clip.transcript?.segments.filter((segment) => segment.endMs > segment.startMs) ?? [];
  const effectiveRefineSettings = getEffectiveRefineSettings(clip, refineSettings);

  if (baseDurationMs <= MIN_CLIP_DURATION_MS || transcriptSegments.length === 0) {
    return {
      startOffsetMs: baseStartOffsetMs,
      durationMs: Math.max(baseDurationMs, MIN_CLIP_DURATION_MS),
      transcriptSegments,
    };
  }

  const leadingTrimMs = getLeadingTrimMs(
    transcriptSegments,
    effectiveRefineSettings,
    baseDurationMs,
  );
  const lastSegment = transcriptSegments.at(-1);
  const trailingTrimMs = lastSegment
    ? Math.max(0, baseDurationMs - lastSegment.endMs - TRAILING_SPEECH_PADDING_MS)
    : 0;
  const maxTrimMs = Math.max(0, baseDurationMs - MIN_CLIP_DURATION_MS);
  const normalizedLeadingTrimMs = Math.min(leadingTrimMs, maxTrimMs);
  const normalizedTrailingTrimMs = Math.min(
    trailingTrimMs,
    Math.max(0, maxTrimMs - normalizedLeadingTrimMs),
  );
  const nextDurationMs = Math.max(
    MIN_CLIP_DURATION_MS,
    baseDurationMs - normalizedLeadingTrimMs - normalizedTrailingTrimMs,
  );

  const shiftedSegments = transcriptSegments
    .map((segment) => {
      const startMs = clampMs(segment.startMs - normalizedLeadingTrimMs, 0, nextDurationMs);
      const endMs = clampMs(segment.endMs - normalizedLeadingTrimMs, 0, nextDurationMs);

      return {
        ...segment,
        startMs,
        endMs,
        words: segment.words
          ?.map((word) => ({
            ...word,
            startMs: clampMs(word.startMs - normalizedLeadingTrimMs, 0, nextDurationMs),
            endMs: clampMs(word.endMs - normalizedLeadingTrimMs, 0, nextDurationMs),
          }))
          .filter((word) => word.endMs > word.startMs),
      };
    })
    .filter((segment) => segment.endMs > segment.startMs);

  return {
    startOffsetMs: baseStartOffsetMs + normalizedLeadingTrimMs,
    durationMs: nextDurationMs,
    transcriptSegments: shiftedSegments,
  };
}

function getSubtitlePositionClass(position: SubtitleStyle['position']): string {
  switch (position) {
    case 'top':
      return 'items-start pt-5';
    case 'center':
      return 'items-center';
    case 'cinema-bottom':
      return 'items-end pb-[15%]';
    case 'safe-bottom':
      return 'items-end pb-[10%]';
    case 'lower-third':
      return 'items-end pb-[33%]';
    default:
      return 'items-end pb-5';
  }
}

function getSubtitleAnimationClass(animation: SubtitleStyle['animation']): string {
  switch (animation) {
    case 'typewriter':
      return 'tracking-[0.06em]';
    case 'fade':
      return 'opacity-95';
    case 'phrase':
      return 'tracking-[0.02em] opacity-95';
    case 'line':
      return 'opacity-90';
    default:
      return '';
  }
}

export function deriveLivePreviewScene(
  exportSettings: ExportSettings,
  subtitleStyle: SubtitleStyle,
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): LivePreviewScene {
  const useFocusSubject = exportSettings.aspectRatio === '9:16' && refineSettings?.faceTracking;
  const aspectClass = getAspectClass(exportSettings.aspectRatio);
  const mediaClass = useFocusSubject ? 'object-cover scale-[1.06]' : 'object-contain';

  const subtitleContainerClass = getSubtitlePositionClass(subtitleStyle.position);

  const subtitleTextClass = getSubtitleAnimationClass(subtitleStyle.animation);

  return {
    aspectClass,
    mediaClass,
    frameClass: useFocusSubject ? 'bg-black' : 'bg-gradient-to-b from-black/80 to-zinc-900',
    subtitleContainerClass,
    subtitleTextClass,
    subtitleSample: getSubtitleSample(clip),
    presetLabel: getPresetLabel(exportSettings, refineSettings),
    appliedFeatureLabels: getAppliedFeatureLabels(exportSettings, clip, refineSettings),
  };
}
