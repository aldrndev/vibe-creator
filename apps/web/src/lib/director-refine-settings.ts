import type { Candidate, RefineSettings, SelectedClip } from '@/stores/director-store';

export const contentModeValues = [
  'auto',
  'podcast',
  'interview',
  'talking-head',
  'product-review',
  'cinematic',
  'general',
] as const;

export type ContentMode = (typeof contentModeValues)[number];
export type ResolvedContentMode = Exclude<ContentMode, 'auto'>;

interface RefinePreset {
  faceTracking: boolean;
  removeSilence: boolean;
  optimizeHook: boolean;
  stabilize: boolean;
}

const contentModePresets: Record<ResolvedContentMode, RefinePreset> = {
  podcast: {
    faceTracking: true,
    removeSilence: true,
    optimizeHook: true,
    stabilize: false,
  },
  interview: {
    faceTracking: false,
    removeSilence: true,
    optimizeHook: true,
    stabilize: false,
  },
  'talking-head': {
    faceTracking: true,
    removeSilence: true,
    optimizeHook: true,
    stabilize: false,
  },
  'product-review': {
    faceTracking: true,
    removeSilence: true,
    optimizeHook: true,
    stabilize: true,
  },
  cinematic: {
    faceTracking: false,
    removeSilence: false,
    optimizeHook: false,
    stabilize: false,
  },
  general: {
    faceTracking: true,
    removeSilence: true,
    optimizeHook: true,
    stabilize: false,
  },
};

function isResolvedContentMode(mode: string | undefined): mode is ResolvedContentMode {
  return (
    mode === 'podcast' ||
    mode === 'interview' ||
    mode === 'talking-head' ||
    mode === 'product-review' ||
    mode === 'cinematic' ||
    mode === 'general'
  );
}

export function getCandidateSuggestedContentMode(candidate: Candidate): ResolvedContentMode {
  const suggestion = candidate.metadata?.scoreBreakdown?.contentModeSuggestion;
  if (isResolvedContentMode(suggestion)) {
    return suggestion;
  }

  return 'general';
}

export function getContentModePreset(mode: ResolvedContentMode): RefinePreset {
  return contentModePresets[mode];
}

export function getResolvedContentMode(
  candidate: Candidate,
  settings?: RefineSettings,
): ResolvedContentMode {
  if (!settings?.contentMode || settings.contentMode === 'auto') {
    return getCandidateSuggestedContentMode(candidate);
  }

  return settings.contentMode;
}

export function getEffectiveRefineSettings(
  clip: SelectedClip,
  settings?: RefineSettings,
): RefineSettings {
  const resolvedContentMode = getResolvedContentMode(clip.candidate, settings);
  const preset = getContentModePreset(resolvedContentMode);

  return {
    contentMode: settings?.contentMode ?? 'auto',
    faceTracking: settings?.faceTracking ?? preset.faceTracking,
    removeSilence: settings?.removeSilence ?? preset.removeSilence,
    optimizeHook: settings?.optimizeHook ?? preset.optimizeHook,
    stabilize: settings?.stabilize ?? preset.stabilize,
  };
}

export function applyContentModePreset(candidate: Candidate, mode: ContentMode): RefineSettings {
  const resolvedContentMode = mode === 'auto' ? getCandidateSuggestedContentMode(candidate) : mode;
  const preset = getContentModePreset(resolvedContentMode);

  return {
    contentMode: mode,
    ...preset,
  };
}

export function getContentModeLabel(mode: ResolvedContentMode): string {
  switch (mode) {
    case 'podcast':
      return 'Podcast';
    case 'interview':
      return 'Interview';
    case 'talking-head':
      return 'Talking Head';
    case 'product-review':
      return 'Review Produk';
    case 'cinematic':
      return 'Sinematik';
    case 'general':
      return 'Umum';
  }
}
