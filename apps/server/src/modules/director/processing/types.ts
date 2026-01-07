export interface Segment {
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
  score: number; // 0-1
  tags?: string[];
  activeDuration?: number; // Total non-silent time inside this segment
}

export interface AnalysisOptions {
  minDuration?: number; // default 5s
  maxDuration?: number; // default 35s
  mergeGap?: number; // default 0.5s
  maxCandidates?: number; // default 20
}
