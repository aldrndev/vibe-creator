import { type ContentMode, getContentModePreset, type ResolvedContentMode } from './content-mode';

export interface ClipRefineSettings {
  faceTracking?: boolean;
  removeSilence?: boolean;
  optimizeHook?: boolean;
  stabilize?: boolean;
  contentMode?: ContentMode;
}

export interface ClipTranscriptWord {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface ClipTranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  words?: ClipTranscriptWord[];
}

export interface ExportClipDraft {
  startMs: number;
  endMs: number;
  contentModeSuggestion?: Exclude<ContentMode, 'auto'>;
  transcript?: {
    segments?: ClipTranscriptSegment[];
  };
}

const LEADING_SPEECH_PADDING_MS = 120;
const TRAILING_SPEECH_PADDING_MS = 180;
const MAX_AUTOMATIC_TRAILING_TRIM_MS = 5_000;
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
];

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
  segments: ClipTranscriptSegment[],
  settings: ClipRefineSettings | undefined,
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

function getTrailingTrimMs(
  lastSegment: ClipTranscriptSegment,
  settings: ClipRefineSettings | undefined,
  clipDurationMs: number,
): number {
  if (!settings?.removeSilence) {
    return 0;
  }

  const trailingTrimMs = Math.max(
    0,
    clipDurationMs - lastSegment.endMs - TRAILING_SPEECH_PADDING_MS,
  );

  // Long transcript tails are often ASR misses, so preserve the chosen clip duration.
  if (trailingTrimMs > MAX_AUTOMATIC_TRAILING_TRIM_MS) {
    return 0;
  }

  return trailingTrimMs;
}

export function resolveClipRefineSettings(
  settings: ClipRefineSettings | undefined,
  draft: Pick<ExportClipDraft, 'contentModeSuggestion'>,
): Required<ClipRefineSettings> {
  const hasContentMode = Boolean(settings?.contentMode);
  let mode: ResolvedContentMode = 'general';

  if (hasContentMode) {
    if (settings?.contentMode === 'auto') {
      mode = draft.contentModeSuggestion ?? 'general';
    } else if (settings?.contentMode) {
      mode = settings.contentMode;
    }
  }

  const preset = hasContentMode
    ? getContentModePreset(mode)
    : {
        faceTracking: false,
        removeSilence: false,
        optimizeHook: false,
        stabilize: false,
      };

  return {
    contentMode: settings?.contentMode ?? 'auto',
    faceTracking: settings?.faceTracking ?? preset.faceTracking,
    removeSilence: settings?.removeSilence ?? preset.removeSilence,
    optimizeHook: settings?.optimizeHook ?? preset.optimizeHook,
    stabilize: settings?.stabilize ?? preset.stabilize,
  };
}

export function applyClipRefineSettings(
  draft: ExportClipDraft,
  settings?: ClipRefineSettings,
): ExportClipDraft {
  const resolvedSettings = resolveClipRefineSettings(settings, draft);

  if (
    (!resolvedSettings.removeSilence && !resolvedSettings.optimizeHook) ||
    !draft.transcript?.segments?.length
  ) {
    return draft;
  }

  const segments = draft.transcript.segments.filter(
    (segment) => segment.text.trim().length > 0 && segment.endMs > segment.startMs,
  );
  if (segments.length === 0) {
    return draft;
  }

  const firstSegment = segments[0];
  const lastSegment = segments.at(-1);
  if (!firstSegment || !lastSegment) {
    return draft;
  }

  const clipDurationMs = draft.endMs - draft.startMs;
  if (clipDurationMs <= MIN_CLIP_DURATION_MS) {
    return draft;
  }

  const leadingTrimMs = getLeadingTrimMs(segments, resolvedSettings, clipDurationMs);
  const trailingTrimMs = getTrailingTrimMs(lastSegment, resolvedSettings, clipDurationMs);

  const maxTrimMs = Math.max(0, clipDurationMs - MIN_CLIP_DURATION_MS);
  const normalizedLeadingTrimMs = Math.min(leadingTrimMs, maxTrimMs);
  const normalizedTrailingTrimMs = Math.min(
    trailingTrimMs,
    Math.max(0, maxTrimMs - normalizedLeadingTrimMs),
  );

  if (normalizedLeadingTrimMs === 0 && normalizedTrailingTrimMs === 0) {
    return draft;
  }

  const nextStartMs = draft.startMs + normalizedLeadingTrimMs;
  const nextEndMs = Math.max(
    nextStartMs + MIN_CLIP_DURATION_MS,
    draft.endMs - normalizedTrailingTrimMs,
  );
  const nextDurationMs = nextEndMs - nextStartMs;

  const shiftedSegments = segments
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
    startMs: nextStartMs,
    endMs: nextEndMs,
    transcript:
      shiftedSegments.length > 0
        ? {
            segments: shiftedSegments,
          }
        : undefined,
  };
}
