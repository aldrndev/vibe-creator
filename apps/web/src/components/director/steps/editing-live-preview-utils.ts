import {
  getContentModeLabel,
  getEffectiveRefineSettings,
  getResolvedContentMode,
} from '@/lib/director-refine-settings';
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
  subtitleTextStyle: {
    fontFamily: string;
    color: string;
    backgroundColor: string;
  };
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
const SUBTITLE_HOLD_MS = 220;
const SUBTITLE_HOLD_CLEARANCE_MS = 60;
const TURN_GROUP_MAX_GAP_MS = 380;
const TURN_GROUP_MIN_NEGATIVE_GAP_MS = -120;
const TURN_GROUP_MAX_DURATION_MS = 7_200;
const TURN_GROUP_MAX_CHARS = 120;
const TURN_GROUP_MAX_WORDS = 24;
const TURN_GROUP_PUNCTUATION_BREAK_GAP_MS = 280;
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
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): string {
  if (exportSettings.aspectRatio === '16:9') {
    return 'Landscape Aman';
  }

  if (exportSettings.aspectRatio === '1:1') {
    return 'Format Persegi';
  }

  if (!clip) {
    return 'Short Vertical';
  }

  const resolvedContentMode = getResolvedContentMode(clip.candidate, refineSettings);
  if (resolvedContentMode === 'cinematic') {
    return 'Short Sinematik';
  }
  if (resolvedContentMode === 'talking-head') {
    return 'Talking Head';
  }
  if (resolvedContentMode === 'interview') {
    return 'Interview Short';
  }
  if (resolvedContentMode === 'product-review') {
    return 'Product Focus';
  }
  if (resolvedContentMode === 'podcast') {
    return 'Podcast Short';
  }

  return 'Short Vertical';
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
  subtitleStyle: SubtitleStyle,
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): string[] {
  const labels: string[] = [];

  if (clip) {
    const resolvedContentMode = getResolvedContentMode(clip.candidate, refineSettings);
    labels.push(`Mode ${getContentModeLabel(resolvedContentMode)}`);
  }

  if (exportSettings.includeSubtitles) {
    const subtitleAnimationLabel =
      subtitleStyle.animation === 'typewriter'
        ? 'Karaoke'
        : subtitleStyle.animation === 'phrase'
          ? 'Cinema'
          : subtitleStyle.animation === 'line'
            ? 'Line'
            : subtitleStyle.animation === 'fade'
              ? 'Fade'
              : 'Static';
    labels.push(
      clip?.transcript?.segments?.length ? `Subtitle ${subtitleAnimationLabel}` : 'Subtitle Aktif',
    );
  } else {
    labels.push('Tanpa Subtitle');
  }

  if (refineSettings?.removeSilence) {
    labels.push('Trim Hening');
  }

  if (refineSettings?.optimizeHook) {
    labels.push('Hook Cepat');
  }

  if (exportSettings.aspectRatio === '9:16' && refineSettings?.faceTracking) {
    labels.push('Tracking Smart');
  }

  if (refineSettings?.stabilize) {
    labels.push('Stabilize');
  }

  if (exportSettings.normalizeAudio) {
    labels.push('Audio Rata');
  }

  return labels.slice(0, 6);
}

const PHRASE_GROUP_SIZE = 4;
const MIN_SYNTHETIC_WORD_DURATION_MS = 90;

function getActiveSegment(
  segments: NonNullable<SelectedClip['transcript']>['segments'],
  currentTimeMs: number,
) {
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const next = segments[index + 1];
    const maxEndMs = next
      ? Math.max(segment.endMs, next.startMs - SUBTITLE_HOLD_CLEARANCE_MS)
      : segment.endMs;
    const effectiveEndMs = next
      ? Math.min(segment.endMs + SUBTITLE_HOLD_MS, maxEndMs)
      : segment.endMs;

    if (currentTimeMs >= segment.startMs && currentTimeMs <= effectiveEndMs) {
      return segment;
    }
  }

  return null;
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

function buildSyntheticWordsForTypewriter(
  segment: NonNullable<SelectedClip['transcript']>['segments'][number],
): NonNullable<NonNullable<SelectedClip['transcript']>['segments'][number]['words']> {
  const normalizedText = segment.text.replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    return [];
  }

  const tokens = normalizedText.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const segmentDurationMs = Math.max(1, segment.endMs - segment.startMs);
  const durationPerWordMs = Math.max(
    MIN_SYNTHETIC_WORD_DURATION_MS,
    Math.floor(segmentDurationMs / tokens.length),
  );
  const words: NonNullable<NonNullable<SelectedClip['transcript']>['segments'][number]['words']> =
    [];
  let cursor = segment.startMs;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    const isLast = index === tokens.length - 1;
    const wordEnd = isLast ? segment.endMs : Math.min(segment.endMs, cursor + durationPerWordMs);
    words.push({
      startMs: cursor,
      endMs: Math.max(cursor + 1, wordEnd),
      text: token,
      speaker: segment.speaker,
    });
    cursor = Math.max(cursor + 1, wordEnd);
  }

  return words;
}

function normalizeSubtitleText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function countSubtitleWords(text: string): number {
  return normalizeSubtitleText(text).split(' ').filter(Boolean).length;
}

function endsStrongSentence(text: string): boolean {
  return /[.!?…]$/.test(text.trim());
}

function startsLikelySentence(text: string): boolean {
  return /^(?:["'“([]+)?[A-Z][a-z]/.test(text.trim());
}

function shouldMergeIntoSpeakerTurn(
  current: NonNullable<SelectedClip['transcript']>['segments'][number],
  next: NonNullable<SelectedClip['transcript']>['segments'][number],
): boolean {
  if (current.speaker && next.speaker && current.speaker !== next.speaker) {
    return false;
  }

  const gapMs = next.startMs - current.endMs;
  if (gapMs > TURN_GROUP_MAX_GAP_MS || gapMs < TURN_GROUP_MIN_NEGATIVE_GAP_MS) {
    return false;
  }

  const mergedDurationMs = Math.max(current.endMs, next.endMs) - current.startMs;
  if (mergedDurationMs > TURN_GROUP_MAX_DURATION_MS) {
    return false;
  }

  const mergedText = normalizeSubtitleText(`${current.text} ${next.text}`);
  if (
    mergedText.length > TURN_GROUP_MAX_CHARS ||
    countSubtitleWords(mergedText) > TURN_GROUP_MAX_WORDS
  ) {
    return false;
  }

  if (
    endsStrongSentence(current.text) &&
    startsLikelySentence(next.text) &&
    gapMs >= TURN_GROUP_PUNCTUATION_BREAK_GAP_MS
  ) {
    return false;
  }

  return true;
}

function buildSpeakerTurnSegments(
  segments: NonNullable<SelectedClip['transcript']>['segments'],
): NonNullable<SelectedClip['transcript']>['segments'] {
  if (segments.length <= 1) {
    return segments;
  }

  const grouped: NonNullable<SelectedClip['transcript']>['segments'] = [];
  let current: NonNullable<SelectedClip['transcript']>['segments'][number] | null = null;

  for (const segment of segments) {
    if (segment.endMs <= segment.startMs) {
      continue;
    }

    const normalizedSegment = {
      ...segment,
      text: normalizeSubtitleText(segment.text),
      words: segment.words?.map((word) => ({ ...word })),
    };

    if (!current) {
      current = normalizedSegment;
      continue;
    }

    if (!shouldMergeIntoSpeakerTurn(current, normalizedSegment)) {
      grouped.push(current);
      current = normalizedSegment;
      continue;
    }

    current = {
      ...current,
      endMs: Math.max(current.endMs, normalizedSegment.endMs),
      text: normalizeSubtitleText(`${current.text} ${normalizedSegment.text}`),
      words: [...(current.words ?? []), ...(normalizedSegment.words ?? [])].sort(
        (left, right) => left.startMs - right.startMs,
      ),
    };
  }

  if (current) {
    grouped.push(current);
  }

  return grouped;
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

  const displaySegments =
    animation === 'phrase' || animation === 'line' ? buildSpeakerTurnSegments(segments) : segments;
  const activeSegment = getActiveSegment(displaySegments, currentTimeMs);

  if (!activeSegment) {
    return '';
  }

  if (animation === 'typewriter' && activeSegment.words?.length) {
    const sourceWords = activeSegment.words?.filter((word) => word.endMs > word.startMs) ?? [];
    const phraseWords = getPhraseGroupWords(
      sourceWords.length > 0 ? sourceWords : buildSyntheticWordsForTypewriter(activeSegment),
      currentTimeMs,
    );
    const visibleWords = phraseWords.filter((word) => currentTimeMs >= word.startMs);
    if (visibleWords.length === 0) {
      return '';
    }

    return visibleWords.map((word) => word.text).join(' ');
  }

  if (animation === 'typewriter') {
    const syntheticWords = buildSyntheticWordsForTypewriter(activeSegment);
    const phraseWords = getPhraseGroupWords(syntheticWords, currentTimeMs);
    const visibleWords = phraseWords.filter((word) => currentTimeMs >= word.startMs);
    if (visibleWords.length === 0) {
      return '';
    }

    return visibleWords.map((word) => word.text).join(' ');
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

function mapPreviewFont(fontToken: string): string {
  switch (fontToken) {
    case 'F_SERIF':
      return 'Georgia, "Times New Roman", serif';
    case 'F_MONO':
      return '"IBM Plex Mono", "Courier New", monospace';
    default:
      return 'Inter, "Plus Jakarta Sans", sans-serif';
  }
}

function mapPreviewTextColor(textColorToken: string): string {
  switch (textColorToken) {
    case 'C_BLACK':
      return '#0A0A0A';
    case 'C_ORANGE':
      return '#FF8C1A';
    case 'C_YELLOW':
      return '#FDE047';
    default:
      return '#FFFFFF';
  }
}

function mapPreviewBackgroundColor(backgroundToken: string): string {
  switch (backgroundToken) {
    case 'BG_TRANSPARENT':
      return 'rgba(0, 0, 0, 0)';
    case 'C_WHITE':
      return 'rgba(255, 255, 255, 0.75)';
    case 'C_ORANGE':
      return 'rgba(255, 140, 26, 0.72)';
    default:
      return 'rgba(0, 0, 0, 0.68)';
  }
}

function getSubtitleTextStyle(subtitleStyle: SubtitleStyle): LivePreviewScene['subtitleTextStyle'] {
  return {
    fontFamily: mapPreviewFont(subtitleStyle.fontToken),
    color: mapPreviewTextColor(subtitleStyle.textColorToken),
    backgroundColor: mapPreviewBackgroundColor(subtitleStyle.bgColorToken),
  };
}

export function deriveLivePreviewScene(
  exportSettings: ExportSettings,
  subtitleStyle: SubtitleStyle,
  clip: SelectedClip | undefined,
  refineSettings: RefineSettings | undefined,
): LivePreviewScene {
  const effectiveRefineSettings = clip
    ? getEffectiveRefineSettings(clip, refineSettings)
    : undefined;
  const useFocusSubject =
    exportSettings.aspectRatio === '9:16' && effectiveRefineSettings?.faceTracking;
  const aspectClass = getAspectClass(exportSettings.aspectRatio);
  const baseMediaClass = useFocusSubject ? 'object-cover scale-[1.06]' : 'object-contain';
  const mediaClass = effectiveRefineSettings?.stabilize
    ? `${baseMediaClass} will-change-transform`
    : baseMediaClass;

  const subtitleContainerClass = getSubtitlePositionClass(subtitleStyle.position);

  const subtitleTextClass = getSubtitleAnimationClass(subtitleStyle.animation);
  const subtitleTextStyle = getSubtitleTextStyle(subtitleStyle);

  return {
    aspectClass,
    mediaClass,
    frameClass: effectiveRefineSettings?.stabilize
      ? 'bg-black shadow-[inset_0_0_0_1px_rgba(255,102,39,0.35)]'
      : useFocusSubject
        ? 'bg-black'
        : 'bg-gradient-to-b from-black/80 to-zinc-900',
    subtitleContainerClass,
    subtitleTextClass,
    subtitleTextStyle,
    subtitleSample: getSubtitleSample(clip),
    presetLabel: getPresetLabel(exportSettings, clip, effectiveRefineSettings),
    appliedFeatureLabels: getAppliedFeatureLabels(
      exportSettings,
      subtitleStyle,
      clip,
      effectiveRefineSettings,
    ),
  };
}
