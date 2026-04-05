export interface SegmentAnalysisMetrics {
  meanVolume: number;
  maxVolume: number;
  speechDensity: number;
  energyScore: number;
  dialogDensityScore: number;
  durationFitScore: number;
  visualPenalty: number;
  hasBlackScreen: boolean;
  isStatic: boolean;
}

export interface Segment {
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
  score: number; // 0-1
  tags?: string[];
  activeDuration?: number; // Total non-silent time inside this segment
  analysis?: SegmentAnalysisMetrics;
}

export interface AnalysisOptions {
  minDuration?: number; // default 5s
  maxDuration?: number; // default 35s
  mergeGap?: number; // default 0.5s
  maxCandidates?: number; // default 20
}
