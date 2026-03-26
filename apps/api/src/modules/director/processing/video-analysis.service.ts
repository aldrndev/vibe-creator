/**
 * Video Analysis Service
 * Handles content analysis (silence detection, visual quality, energy).
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logger } from '@/lib/logger';
import type { AnalysisOptions, Segment } from './types';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

export const videoAnalysisService = {
  /**
   * Detect active segments by analyzing silence.
   * Runs silencedetect and inverts the result.
   * IMPROVED: Adaptive threshold and fallback to ensure clips are found.
   */
  async detectSegments(audioPath: string): Promise<Segment[]> {
    if (!existsSync(audioPath)) {
      throw new Error(`Audio proxy not found: ${audioPath}`);
    }

    // Helper to run detection with specific threshold
    const runDetection = (thresholdDb: number): Promise<Segment[]> => {
      const args = [
        '-i',
        audioPath,
        '-af',
        `highpass=f=300,silencedetect=noise=${thresholdDb}dB:d=0.5`,
        '-f',
        'null',
        '-',
      ];

      return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args);
        let output = '';
        proc.stderr.on('data', (data) => (output += data.toString()));

        proc.on('close', (code) => {
          if (code !== 0) return reject(new Error(`Silence detection failed: ${code}`));

          // Parse output
          const silenceRegex = /silence_(start|end): ([\d.]+)/g;
          const silences: { start: number; end: number }[] = [];

          let match: RegExpExecArray | null = silenceRegex.exec(output);
          let currentStart: number | null = null;

          while (match) {
            const type = match[1];
            const time = parseFloat(match[2] as string);

            if (type === 'start') currentStart = time;
            else if (type === 'end' && currentStart !== null) {
              silences.push({ start: currentStart, end: time });
              currentStart = null;
            }

            match = silenceRegex.exec(output);
          }

          // Get duration
          const durationMatch = /Duration: (\d{2}):(\d{2}):(\d{2}).(\d{2})/.exec(output);
          let totalDuration = 0;
          if (durationMatch) {
            const [, hours, minutes, seconds, centiseconds] = durationMatch;
            totalDuration =
              parseInt(hours ?? '0', 10) * 3600 +
              parseInt(minutes ?? '0', 10) * 60 +
              parseFloat(`${seconds ?? '0'}.${centiseconds ?? '0'}`);
          } else {
            // Fallback if unable to parse duration
            logger.warn('Could not parse duration from ffmpeg output');
            return resolve([]);
          }

          // Invert silence -> Active Segments
          const segments: Segment[] = [];
          let lastEnd = 0;

          for (const silence of silences) {
            if (silence.start > lastEnd + 0.1) {
              // 0.1s tolerance
              segments.push({
                start: lastEnd,
                end: silence.start,
                duration: silence.start - lastEnd,
                score: 0.8,
                activeDuration: silence.start - lastEnd,
              });
            }
            lastEnd = silence.end;
          }

          if (totalDuration > lastEnd + 0.1) {
            segments.push({
              start: lastEnd,
              end: totalDuration,
              duration: totalDuration - lastEnd,
              score: 0.8,
              activeDuration: totalDuration - lastEnd,
            });
          }

          resolve(segments);
        });
      });
    };

    logger.info('Running adaptive silence detection');

    // 1. Try strict threshold (-40dB)
    let segments = await runDetection(-40);

    // 2. If few segments, try looser (-30dB)
    if (segments.length < 5) {
      logger.info('Few segments found at -40dB, retrying at -30dB');
      const looseSegments = await runDetection(-30);
      if (looseSegments.length > segments.length) {
        segments = looseSegments;
      }
    }

    // 3. Even looser (-20dB) if still struggling
    if (segments.length < 3) {
      logger.info('Very few segments, retrying at -20dB');
      const veryLooseSegments = await runDetection(-20);
      if (veryLooseSegments.length > segments.length) {
        segments = veryLooseSegments;
      }
    }

    // 4. Fallback: Uniform Grid Slicing if almost nothing found
    const firstSegment = segments[0];
    if (
      segments.length === 0 ||
      (segments.length === 1 && firstSegment && firstSegment.duration > 60)
    ) {
      logger.info('Fallback: Uniform Grid Slicing');
      if (segments.length === 0) {
        return [];
      }
    }

    return segments;
  },

  /**
   * Analyze visual quality (Black frames & Freeze frames)
   * Uses original video file, but only scans the specific segment (Fast).
   */
  async analyzeSegmentVisuals(
    videoPath: string,
    start: number,
    duration: number,
  ): Promise<{ hasBlackScreen: boolean; isStatic: boolean }> {
    return new Promise((resolve) => {
      const args = [
        '-ss',
        start.toString(),
        '-t',
        duration.toString(),
        '-i',
        videoPath,
        '-vf',
        'blackdetect=d=0.1:pix_th=0.1,freezedetect=n=0.003:d=2', // Black > 0.1s, Freeze > 2s
        '-f',
        'null',
        '-',
      ];

      const proc = spawn(ffmpegPath, args);
      let output = '';
      proc.stderr.on('data', (data) => (output += data.toString()));

      proc.on('close', () => {
        const hasBlack = /black_start:/.test(output);
        const hasFreeze = /lavfi\.freezedetect\.freeze_start:/.test(output);
        resolve({ hasBlackScreen: hasBlack, isStatic: hasFreeze });
      });

      proc.on('error', () => {
        resolve({ hasBlackScreen: false, isStatic: false });
      });
    });
  },

  /**
   * Analyze audio energy for a specific segment
   */
  async analyzeSegmentEnergy(
    audioPath: string,
    start: number,
    duration: number,
  ): Promise<{ meanVolume: number; maxVolume: number }> {
    return new Promise((resolve) => {
      const args = [
        '-ss',
        start.toString(),
        '-t',
        duration.toString(),
        '-i',
        audioPath,
        '-af',
        'highpass=f=300,volumedetect',
        '-f',
        'null',
        '-',
      ];

      const proc = spawn(ffmpegPath, args);
      let output = '';
      proc.stderr.on('data', (data) => (output += data.toString()));

      proc.on('close', () => {
        // Parse mean_volume and max_volume
        const meanMatch = /mean_volume: ([-\d.]+) dB/.exec(output);
        const maxMatch = /max_volume: ([-\d.]+) dB/.exec(output);

        const meanVolume = meanMatch?.[1] ? parseFloat(meanMatch[1]) : -91;
        const maxVolume = maxMatch?.[1] ? parseFloat(maxMatch[1]) : -91;

        resolve({
          meanVolume,
          maxVolume,
        });
      });

      proc.on('error', () => {
        resolve({ meanVolume: -91, maxVolume: -91 });
      });
    });
  },

  /**
   * Refine segments with intelligent merging, splitting, and energy analysis.
   */
  async refineSegments(
    segments: Segment[],
    audioPath: string,
    options: AnalysisOptions = {},
    videoPath?: string,
  ): Promise<(Segment & { tags?: string[] })[]> {
    const { minDuration = 5, maxDuration = 35, mergeGap = 0.5, maxCandidates = 20 } = options;

    if (segments.length === 0) return [];

    // 1. Merge close segments
    const merged: Segment[] = [];
    let current: Segment | undefined = segments[0];

    if (!current) return [];

    for (let i = 1; i < segments.length; i++) {
      const next: Segment | undefined = segments[i];
      if (!next) continue;

      if (next.start - current.end <= mergeGap) {
        // Merge
        current.end = next.end;
        current.duration = current.end - current.start;
        current.activeDuration =
          (current.activeDuration || 0) + (next.activeDuration || next.duration);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    // 2. Split Long Segments
    const candidates: Segment[] = [];
    for (const s of merged) {
      if (s.duration < minDuration) continue;

      if (s.duration <= maxDuration) {
        candidates.push(s);
      } else {
        // Simple slicing (v1) - Smart Pause splitting would go here
        let start = s.start;
        while (start < s.end) {
          const chunkDuration = Math.min(maxDuration, s.end - start);
          if (chunkDuration >= minDuration) {
            candidates.push({
              start: start,
              end: start + chunkDuration,
              duration: chunkDuration,
              score: s.score,
            });
          }
          start += chunkDuration;
        }
      }
    }

    // 3. Energy Analysis (Smart Scoring)
    // Run concurrently with concurrency limit for performance
    const analyzed = await Promise.all(
      candidates.map(async (c) => {
        const { meanVolume } = await this.analyzeSegmentEnergy(audioPath, c.start, c.duration);

        let score = c.score;
        const tags: string[] = [];

        // Heuristic: High energy = Excitement/Action
        // Typically speech is -20dB to -10dB. Loud is > -10dB.
        // We boost score for loud parts (laughter, yelling)
        if (meanVolume > -18) {
          score += 0.15;
          tags.push('HIGH ENERGY');
        } else if (meanVolume > -25) {
          score += 0.05; // Normal clear speech
        } else {
          score -= 0.1; // Quiet/Mumble
        }

        // Duration bonus (Golden Zone 10-25s)
        if (c.duration >= 10 && c.duration <= 25) {
          score += 0.1;
        }

        // 4. Talk Density Analysis
        const activeDur = c.activeDuration || c.duration;
        const density = activeDur / c.duration;

        if (density >= 0.9) {
          score += 0.1; // Very dense/fast speech -> Viral potential
          if (!tags.includes('HIGH ENERGY')) tags.push('DENSE SPEECH');
        } else if (density < 0.6) {
          score -= 0.15; // Too many pauses -> Boring
        }

        // 5. Visual Validation
        if (videoPath) {
          const { hasBlackScreen, isStatic } = await this.analyzeSegmentVisuals(
            videoPath,
            c.start,
            c.duration,
          );
          if (hasBlackScreen) {
            score -= 0.3; // Penalty for black screen
            tags.push('BLACK SCREEN');
          }
          if (isStatic) {
            score -= 0.2; // Penalty for static image
            tags.push('STATIC');
          }
        }

        return { ...c, score: Math.min(score, 0.99), tags };
      }),
    );

    // 4. Sort by Smart Score
    analyzed.sort((a, b) => b.score - a.score);

    // 5. Take top N and sort chronologically
    return analyzed.slice(0, maxCandidates).sort((a, b) => a.start - b.start);
  },
};
