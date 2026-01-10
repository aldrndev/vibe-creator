/**
 * Export job status and phase tracking
 */

export const EXPORT_PHASES = {
  QUEUED: 'QUEUED',
  VALIDATING: 'VALIDATING',
  TRIM: 'TRIM',
  MIX_AUDIO: 'MIX_AUDIO',
  ENCODE_VIDEO: 'ENCODE_VIDEO',
  MUX: 'MUX',
  UPLOAD: 'UPLOAD',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  CANCEL_REQUESTED: 'CANCEL_REQUESTED',
} as const;

export type ExportPhase = typeof EXPORT_PHASES[keyof typeof EXPORT_PHASES];

/**
 * Phase weights for progress calculation (total = 100)
 */
export const PHASE_WEIGHTS: Record<ExportPhase, number> = {
  QUEUED: 0,
  VALIDATING: 5,
  TRIM: 25,
  MIX_AUDIO: 15,
  ENCODE_VIDEO: 35,
  MUX: 10,
  UPLOAD: 10,
  COMPLETED: 100,
  FAILED: 0,
  CANCELLED: 0,
  CANCEL_REQUESTED: 0,
};

/**
 * Get cumulative progress up to a phase
 */
export function getPhaseProgress(phase: ExportPhase, phaseProgress: number = 0): number {
  const phases: ExportPhase[] = [
    'QUEUED',
    'VALIDATING',
    'TRIM',
    'MIX_AUDIO',
    'ENCODE_VIDEO',
    'MUX',
    'UPLOAD',
    'COMPLETED',
  ];
  
  const currentIndex = phases.indexOf(phase);
  if (currentIndex === -1) return 0;
  
  let cumulative = 0;
  for (let i = 0; i < currentIndex; i++) {
    cumulative += PHASE_WEIGHTS[phases[i] as ExportPhase];
  }
  
  // Add partial progress within current phase
  const currentWeight = PHASE_WEIGHTS[phase];
  cumulative += Math.round(currentWeight * (phaseProgress / 100));
  
  return Math.min(100, cumulative);
}

/**
 * Export job data stored in database/queue
 */
export interface ExportJobData {
  jobId: string;
  userId: string;
  projectId: string;
  
  // Validated input
  timeline: {
    durationMs: number;
    clips: Array<{
      assetId: string;
      storageKey: string;
      startMs: number;
      endMs: number;
      trimStartMs: number;
      trimEndMs: number;
      effects: {
        volume: number;
        speed: number;
        fadeInMs: number;
        fadeOutMs: number;
      };
    }>;
    audioClips: Array<{
      assetId: string;
      storageKey: string;
      startMs: number;
      endMs: number;
      effects: {
        volume: number;
        fadeInMs: number;
        fadeOutMs: number;
      };
    }>;
    textOverlays: Array<{
      text: string;
      x: number;
      y: number;
      startMs: number;
      endMs: number;
      style: {
        fontFamily: string;
        fontSize: number;
        fontWeight: string;
        color: string;
      };
    }>;
  };
  
  // Export settings
  settings: {
    format: 'MP4' | 'WEBM' | 'MOV';
    resolution: '720p' | '1080p' | '4K';
    quality: 'low' | 'medium' | 'high' | 'lossless';
    width: number;
    height: number;
    fps: number;
    addWatermark: boolean;
  };
  
  // Idempotency
  idempotencyKey: string;
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Progress tracking
  phase: ExportPhase;
  phaseProgress: number; // 0-100 within current phase
  overallProgress: number; // 0-100 overall
  
  // Result
  outputStorageKey?: string;
  outputSizeBytes?: number;
  
  // Error handling
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
}

/**
 * Export job result for API response
 */
export interface ExportJobResult {
  jobId: string;
  status: ExportPhase;
  phase: ExportPhase;
  phaseProgress: number;
  overallProgress: number;
  
  // Only present when completed
  downloadUrl?: string;
  downloadUrlExpiresAt?: Date;
  fileSizeBytes?: number;
  
  // Only present when failed
  errorMessage?: string;
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedRemainingMs?: number;
}

/**
 * Cancel request result
 */
export interface CancelResult {
  success: boolean;
  previousStatus: ExportPhase;
  message: string;
}

/**
 * Concurrency limits by subscription tier
 */
export const CONCURRENCY_LIMITS = {
  FREE: { maxActive: 1, maxQueued: 2 },
  CREATOR: { maxActive: 2, maxQueued: 5 },
  PRO: { maxActive: 3, maxQueued: 10 },
  ENTERPRISE: { maxActive: 5, maxQueued: 20 },
  ADMIN: { maxActive: 10, maxQueued: 50 },
} as const;

/**
 * Storage retention by tier (days)
 */
export const RETENTION_DAYS = {
  FREE: 1,
  CREATOR: 7,
  PRO: 30,
  ENTERPRISE: 90,
  ADMIN: 365,
} as const;
