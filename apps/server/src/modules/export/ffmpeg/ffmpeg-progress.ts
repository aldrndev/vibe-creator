/**
 * FFmpeg Progress Parser
 * Stateful parser for `-progress pipe:1` output
 */

export interface ProgressUpdate {
  type: 'STARTED' | 'PROGRESS' | 'HEARTBEAT' | 'COMPLETED';
  percent?: number;
  outTimeMs?: number;
  speed?: number;
}

/**
 * Stateful progress parser
 */
export class ProgressParser {
  private buffer = '';
  private currentFrame: Record<string, string> = {};
  private totalDurationMs: number;
  private lastUpdateTime = Date.now();

  constructor(totalDurationMs: number) {
    this.totalDurationMs = totalDurationMs;
  }

  /**
   * Parse incoming chunk from FFmpeg stdout
   * Returns array of progress updates (can be empty if incomplete frame)
   */
  parse(chunk: string): ProgressUpdate[] {
    this.buffer += chunk;
    const updates: ProgressUpdate[] = [];

    // Split by lines
    const lines = this.buffer.split('\n');
    
    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Key-value pair: "key=value"
      const [key, value] = trimmed.split('=');
      if (key && value !== undefined) {
        this.currentFrame[key] = value;
      }

      // Frame complete when we see progress=continue or progress=end
      if (key === 'progress') {
        if (value === 'continue' || value === 'end') {
          const update = this.processFrame();
          if (update) updates.push(update);
          
          // Clear current frame
          this.currentFrame = {};
          
          // Send completion on end
          if (value === 'end') {
            updates.push({ type: 'COMPLETED', percent: 100 });
          }
        }
      }
    }

    // Heartbeat if no update for 5 seconds
    if (Date.now() - this.lastUpdateTime > 5000) {
      updates.push({ type: 'HEARTBEAT' });
      this.lastUpdateTime = Date.now();
    }

    return updates;
  }

  /**
   * Process accumulated frame into progress update
   */
  private processFrame(): ProgressUpdate | null {
    const outTimeMicros = parseInt(this.currentFrame.out_time_us || '0', 10);
    const speed = parseFloat(this.currentFrame.speed || '0');

    if (outTimeMicros === 0) return null;

    const outTimeMs = outTimeMicros / 1000;
    let percent = 0;

    if (this.totalDurationMs > 0) {
      percent = Math.min(100, (outTimeMs / this.totalDurationMs) * 100);
    }

    this.lastUpdateTime = Date.now();

    return {
      type: 'PROGRESS',
      percent: Math.round(percent * 100) / 100, // 2 decimal places
      outTimeMs,
      speed,
    };
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = '';
    this.currentFrame = {};
    this.lastUpdateTime = Date.now();
  }
}

/**
 * Phase weights for progress aggregation
 */
export const PHASE_WEIGHTS = {
  TRIM: 0.1,    // 10%
  MIX: 0.2,     // 20%
  ENCODE: 0.6,  // 60%
  MUX: 0.1,     // 10%
} as const;

export type Phase = keyof typeof PHASE_WEIGHTS;

/**
 * Phase progress aggregator
 * Combines progress from multiple phases into overall progress
 */
export class PhaseAggregator {
  private phaseProgress: Record<Phase, number> = {
    TRIM: 0,
    MIX: 0,
    ENCODE: 0,
    MUX: 0,
  };

  /**
   * Update progress for a specific phase
   * Clamps to 0-100 and ensures monotonic increase
   */
  updatePhase(phase: Phase, update: ProgressUpdate): void {
    if (update.type === 'PROGRESS' && update.percent !== undefined) {
      // Clamp to 0-100 and ensure monotonic (never decrease)
      const clamped = Math.max(0, Math.min(100, update.percent));
      this.phaseProgress[phase] = Math.max(this.phaseProgress[phase], clamped);
    } else if (update.type === 'COMPLETED') {
      this.phaseProgress[phase] = 100;
    }
  }

  /**
   * Get overall progress (weighted average)
   */
  getOverallProgress(): number {
    let totalProgress = 0;
    
    for (const phase of Object.keys(PHASE_WEIGHTS) as Phase[]) {
      const weight = PHASE_WEIGHTS[phase];
      const progress = this.phaseProgress[phase];
      totalProgress += (progress / 100) * weight;
    }
    
    return Math.round(totalProgress * 100 * 100) / 100; // 2 decimal places
  }

  /**
   * Reset all phase progress
   */
  reset(): void {
    this.phaseProgress = {
      TRIM: 0,
      MIX: 0,
      ENCODE: 0,
      MUX: 0,
    };
  }
}

/**
 * Create a new progress parser
 */
export function createProgressParser(totalDurationMs: number): ProgressParser {
  return new ProgressParser(totalDurationMs);
}

/**
 * Create a new phase aggregator
 */
export function createPhaseAggregator(): PhaseAggregator {
  return new PhaseAggregator();
}
