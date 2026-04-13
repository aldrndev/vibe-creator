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

export interface ContentModeSignal {
  durationSeconds: number;
  energyScore: number;
  dialogDensityScore: number;
  visualPenalty: number;
  tags: string[];
}

export interface ContentModePreset {
  faceTracking: boolean;
  removeSilence: boolean;
  optimizeHook: boolean;
  stabilize: boolean;
}

const contentModePresets: Record<ResolvedContentMode, ContentModePreset> = {
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

export function getContentModePreset(mode: ResolvedContentMode): ContentModePreset {
  return contentModePresets[mode];
}

export function guessContentMode(signal: ContentModeSignal): ResolvedContentMode {
  const hasDenseSpeechTag = signal.tags.includes('DENSE SPEECH');
  const hasHighEnergyTag = signal.tags.includes('HIGH ENERGY');

  if (signal.dialogDensityScore >= 88 && signal.energyScore < 62) {
    return 'podcast';
  }

  if (
    signal.dialogDensityScore >= 76 &&
    signal.energyScore >= 68 &&
    signal.visualPenalty <= 38 &&
    signal.durationSeconds >= 22
  ) {
    return 'interview';
  }

  if (hasDenseSpeechTag || (signal.dialogDensityScore >= 72 && hasHighEnergyTag)) {
    return 'talking-head';
  }

  if (
    signal.dialogDensityScore <= 62 &&
    signal.energyScore >= 68 &&
    signal.durationSeconds >= 16 &&
    signal.durationSeconds <= 90 &&
    signal.visualPenalty <= 30
  ) {
    return 'product-review';
  }

  if (
    signal.dialogDensityScore <= 54 &&
    signal.energyScore <= 66 &&
    signal.durationSeconds >= 18 &&
    signal.visualPenalty <= 24
  ) {
    return 'cinematic';
  }

  return 'general';
}

export function resolveContentMode(
  mode: ContentMode | undefined,
  signal: ContentModeSignal,
): ResolvedContentMode {
  if (!mode || mode === 'auto') {
    return guessContentMode(signal);
  }

  return mode;
}
