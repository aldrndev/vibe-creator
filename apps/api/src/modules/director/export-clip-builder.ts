import { applyClipRefineSettings, resolveClipRefineSettings } from './clip-refine';
import type { ContentMode } from './content-mode';
import { resolveSelectedClipRangeMs } from './selected-clip-range';

export type FocusProfile = 'auto' | 'subject-center' | 'object-center';

export interface ExportClipWord {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface ExportClipSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  words?: ExportClipWord[];
}

export interface ExportClipSettingsInput {
  faceTracking?: boolean;
  removeSilence?: boolean;
  optimizeHook?: boolean;
  stabilize?: boolean;
  contentMode?: ContentMode;
}

export interface ExportSelectedClipInput {
  id: string;
  trimStartMs?: number | null;
  trimEndMs?: number | null;
  candidate: {
    startMs: number;
    endMs: number;
    metadata?: unknown;
  };
  transcript?: {
    segments?: ExportClipSegment[] | null;
  } | null;
}

export interface BuiltExportClip {
  sourcePath: string;
  start: number;
  end: number;
  resolvedContentMode: Exclude<ContentMode, 'auto'>;
  faceTracking?: boolean;
  focusProfile?: FocusProfile;
  stabilize?: boolean;
  transcript?: {
    segments?: ExportClipSegment[];
  };
}

function resolveFocusProfileFromMode(
  mode: 'podcast' | 'interview' | 'talking-head' | 'product-review' | 'cinematic' | 'general',
): FocusProfile {
  if (mode === 'podcast' || mode === 'talking-head') {
    return 'subject-center';
  }

  if (mode === 'general' || mode === 'product-review') {
    return 'object-center';
  }

  return 'auto';
}

function getSuggestedMode(metadata: unknown): Exclude<ContentMode, 'auto'> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'general';
  }

  const scoreBreakdown =
    'scoreBreakdown' in metadata &&
    metadata.scoreBreakdown &&
    typeof metadata.scoreBreakdown === 'object' &&
    !Array.isArray(metadata.scoreBreakdown)
      ? metadata.scoreBreakdown
      : null;

  if (!scoreBreakdown) {
    return 'general';
  }

  const mode =
    'contentModeSuggestion' in scoreBreakdown ? scoreBreakdown.contentModeSuggestion : undefined;

  return mode === 'podcast' ||
    mode === 'interview' ||
    mode === 'talking-head' ||
    mode === 'product-review' ||
    mode === 'cinematic'
    ? mode
    : 'general';
}

/**
 * Build one export-ready clip from selected clip data using the same refinement rules
 * as final export jobs.
 */
export function buildExportClipFromSelectedClip(params: {
  clip: ExportSelectedClipInput;
  sourcePath: string;
  settings?: ExportClipSettingsInput;
}): BuiltExportClip {
  const { clip, sourcePath, settings } = params;

  const clipRange = resolveSelectedClipRangeMs({
    candidateStartMs: clip.candidate.startMs,
    candidateEndMs: clip.candidate.endMs,
    trimStartMs: clip.trimStartMs,
    trimEndMs: clip.trimEndMs,
  });

  const transcriptData = clip.transcript?.segments
    ? {
        segments: clip.transcript.segments,
      }
    : undefined;

  const suggestedMode = getSuggestedMode(clip.candidate.metadata);
  const requestedMode = settings?.contentMode;
  const resolvedMode = requestedMode && requestedMode !== 'auto' ? requestedMode : suggestedMode;

  const resolvedRefineSettings = resolveClipRefineSettings(settings, {
    contentModeSuggestion: suggestedMode,
  });

  const refinedClip = applyClipRefineSettings(
    {
      startMs: clipRange.startMs,
      endMs: clipRange.endMs,
      contentModeSuggestion: suggestedMode,
      transcript: transcriptData,
    },
    resolvedRefineSettings,
  );

  return {
    sourcePath,
    start: refinedClip.startMs / 1000,
    end: refinedClip.endMs / 1000,
    resolvedContentMode: resolvedMode,
    faceTracking: resolvedRefineSettings.faceTracking,
    focusProfile: resolveFocusProfileFromMode(resolvedMode),
    stabilize: resolvedRefineSettings.stabilize,
    transcript: refinedClip.transcript,
  };
}
