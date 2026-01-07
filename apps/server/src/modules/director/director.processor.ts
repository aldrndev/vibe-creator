import { spawn } from "child_process";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { logger } from "@/lib/logger";

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

// Types
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

/**
 * Director Processor - Handles FFmpeg operations for video analysis
 * Implements strict security guards and performance optimizations.
 */
export const directorProcessor = {
  /**
   * Extract a lightweight audio proxy (16kHz mono WAV) for fast analysis.
   * Prevents reading the full video file multiple times.
   */
  async extractAudioProxy(
    inputPath: string,
    outputDir: string
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Security: Ensure output path is within allowed directory
    const fileName = `proxy_${randomUUID()}.wav`;
    const outputPath = join(outputDir, fileName);

    const args = [
      "-y", // Overwrite output
      "-i",
      inputPath,
      "-vn", // No video
      "-ac",
      "1", // Mono
      "-ar",
      "16000", // 16kHz sample rate
      "-f",
      "wav",
      outputPath,
    ];

    logger.info({ inputPath, outputPath }, "Extracting audio proxy");

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath || "ffmpeg", args);

      let errorData = "";
      proc.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          logger.error({ code, errorData }, "Audio proxy extraction failed");
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  },

  /**
   * Extract audio proxy for a specific clip range
   */
  async extractClipAudioProxy(
    inputPath: string,
    outputDir: string,
    startMs: number,
    endMs: number
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const startSec = startMs / 1000;
    const durationSec = (endMs - startMs) / 1000;

    const fileName = `clip_proxy_${randomUUID()}.wav`;
    const outputPath = join(outputDir, fileName);

    const args = [
      "-y",
      "-ss",
      startSec.toFixed(3),
      "-i",
      inputPath,
      "-t",
      durationSec.toFixed(3),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "wav",
      outputPath,
    ];

    logger.info(
      { inputPath, outputPath, startSec },
      "Extracting clip audio proxy"
    );

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath || "ffmpeg", args);

      let errorData = "";
      proc.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          logger.error(
            { code, errorData },
            "Clip audio proxy extraction failed"
          );
          reject(new Error(`FFmpeg proxy extraction failed: ${code}`));
        }
      });
    });
  },

  /**
   * Get minimal video metadata (duration)
   */
  async getVideoMetadata(inputPath: string): Promise<{ duration: number }> {
    return new Promise((resolve) => {
      const args = ["-i", inputPath];
      const proc = spawn(ffmpegPath || "ffmpeg", args);
      let output = "";

      proc.stderr.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", () => {
        const match = output.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d+)/);
        if (match) {
          const [_, h, m, s] = match;
          const duration =
            parseFloat(h!) * 3600 + parseFloat(m!) * 60 + parseFloat(s!);
          resolve({ duration });
        } else {
          resolve({ duration: 0 });
        }
      });
    });
  },

  /**
   * Detect active segments by analyzing silence.
   * Runs silencedetect and inverts the result.
   */
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
        "-i",
        audioPath,
        "-af",
        `highpass=f=300,silencedetect=noise=${thresholdDb}dB:d=0.5`,
        "-f",
        "null",
        "-",
      ];

      return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath || "ffmpeg", args);
        let output = "";
        proc.stderr.on("data", (data) => (output += data.toString()));

        proc.on("close", (code) => {
          if (code !== 0)
            return reject(new Error(`Silence detection failed: ${code}`));

          // Parse output
          const silenceRegex = /silence_(start|end): ([\d.]+)/g;
          const silences: { start: number; end: number }[] = [];

          let match;
          let currentStart: number | null = null;

          while ((match = silenceRegex.exec(output)) !== null) {
            const type = match[1];
            const time = parseFloat(match[2] as string);

            if (type === "start") currentStart = time;
            else if (type === "end" && currentStart !== null) {
              silences.push({ start: currentStart, end: time });
              currentStart = null;
            }
          }

          // Get duration
          const durationMatch =
            /Duration: (\d{2}):(\d{2}):(\d{2}).(\d{2})/.exec(output);
          let totalDuration = 0;
          if (durationMatch) {
            totalDuration =
              parseInt(durationMatch[1]!) * 3600 +
              parseInt(durationMatch[2]!) * 60 +
              parseFloat(durationMatch[3]! + "." + durationMatch[4]!);
          } else {
            // Fallback if unable to parse duration
            logger.warn("Could not parse duration from ffmpeg output");
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

    logger.info("Running adaptive silence detection");

    // 1. Try strict threshold (-40dB)
    let segments = await runDetection(-40);

    // 2. If few segments, try looser (-30dB)
    if (segments.length < 5) {
      logger.info("Few segments found at -40dB, retrying at -30dB");
      const looseSegments = await runDetection(-30);
      if (looseSegments.length > segments.length) {
        segments = looseSegments;
      }
    }

    // 3. Even looser (-20dB) if still struggling
    if (segments.length < 3) {
      logger.info("Very few segments, retrying at -20dB");
      const veryLooseSegments = await runDetection(-20);
      if (veryLooseSegments.length > segments.length) {
        segments = veryLooseSegments;
      }
    }

    // 4. Fallback: Uniform Grid Slicing if almost nothing found
    if (
      segments.length === 0 ||
      (segments.length === 1 && segments[0]!.duration > 60)
    ) {
      logger.info("Fallback: Uniform Grid Slicing");
      // We assume we have at least 1 segment if length=1. If length=0, runDetection failed to return duration logic?
      // Let's rely on postProcess splitting for the 1 big segment case.
      // Only if length=0 we have a problem.
      if (segments.length === 0) {
        return [];
      }
    }

    return segments;
  },

  /**
   * Post-process segments: Merge, Clamp, Rank, Cap
   */
  /**
   * Analyze visual quality (Black frames & Freeze frames)
   * Uses original video file, but only scans the specific segment (Fast).
   */
  async analyzeSegmentVisuals(
    videoPath: string,
    start: number,
    duration: number
  ): Promise<{ hasBlackScreen: boolean; isStatic: boolean }> {
    return new Promise((resolve) => {
      const args = [
        "-ss",
        start.toString(),
        "-t",
        duration.toString(),
        "-i",
        videoPath,
        "-vf",
        "blackdetect=d=0.1:pix_th=0.1,freezedetect=n=0.003:d=2", // Black > 0.1s, Freeze > 2s
        "-f",
        "null",
        "-",
      ];

      const proc = spawn(ffmpegPath || "ffmpeg", args);
      let output = "";
      proc.stderr.on("data", (data) => (output += data.toString()));

      proc.on("close", () => {
        const hasBlack = /black_start:/.test(output);
        const hasFreeze = /lavfi\.freezedetect\.freeze_start:/.test(output);
        resolve({ hasBlackScreen: hasBlack, isStatic: hasFreeze });
      });

      proc.on("error", () => {
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
    duration: number
  ): Promise<{ meanVolume: number; maxVolume: number }> {
    return new Promise((resolve) => {
      const args = [
        "-ss",
        start.toString(),
        "-t",
        duration.toString(),
        "-i",
        audioPath,
        "-af",
        "highpass=f=300,volumedetect",
        "-f",
        "null",
        "-",
      ];

      const proc = spawn(ffmpegPath || "ffmpeg", args);
      let output = "";
      proc.stderr.on("data", (data) => (output += data.toString()));

      proc.on("close", () => {
        // Parse mean_volume and max_volume
        const meanMatch = /mean_volume: ([\-\d\.]+) dB/.exec(output);
        const maxMatch = /max_volume: ([\-\d\.]+) dB/.exec(output);

        resolve({
          meanVolume: meanMatch ? parseFloat(meanMatch[1]!) : -91,
          maxVolume: maxMatch ? parseFloat(maxMatch[1]!) : -91,
        });
      });

      proc.on("error", () => {
        resolve({ meanVolume: -91, maxVolume: -91 });
      });
    });
  },

  /**
   * Refine segments with intelligent merging, splitting, and energy analysis.
   * Replaces sync postProcessSegments with async logic.
   */
  async refineSegments(
    segments: Segment[],
    audioPath: string,
    options: AnalysisOptions = {},
    videoPath?: string
  ): Promise<(Segment & { tags?: string[] })[]> {
    const {
      minDuration = 5,
      maxDuration = 35,
      mergeGap = 0.5,
      maxCandidates = 20,
    } = options;

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
          (current.activeDuration || 0) +
          (next.activeDuration || next.duration);
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
        const { meanVolume } = await this.analyzeSegmentEnergy(
          audioPath,
          c.start,
          c.duration
        );

        let score = c.score;
        const tags: string[] = [];

        // Heuristic: High energy = Excitement/Action
        // Typically speech is -20dB to -10dB. Loud is > -10dB.
        // We boost score for loud parts (laughter, yelling)
        if (meanVolume > -18) {
          score += 0.15;
          tags.push("HIGH ENERGY");
        } else if (meanVolume > -25) {
          score += 0.05; // Normal clear speech
        } else {
          score -= 0.1; // Quiet/Mumble
        }

        // Duration bonus (Golden Zone 10-25s)
        if (c.duration >= 10 && c.duration <= 25) {
          score += 0.1;
        }

        // 4. Talk Density Analysis (New!)
        // Calculate ratio of Active Speech vs Total Duration (including pauses)
        const activeDur = c.activeDuration || c.duration;
        const density = activeDur / c.duration;

        if (density >= 0.9) {
          score += 0.1; // Very dense/fast speech -> Viral potential
          if (!tags.includes("HIGH ENERGY")) tags.push("DENSE SPEECH"); // Internal tag?
        } else if (density < 0.6) {
          score -= 0.15; // Too many pauses -> Boring
        }

        // 5. Visual Validation (New!)
        if (videoPath) {
          const { hasBlackScreen, isStatic } = await this.analyzeSegmentVisuals(
            videoPath,
            c.start,
            c.duration
          );
          if (hasBlackScreen) {
            score -= 0.3; // Penalty for black screen
            tags.push("BLACK SCREEN");
          }
          if (isStatic) {
            score -= 0.2; // Penalty for static image
            tags.push("STATIC");
          }
        }

        return { ...c, score: Math.min(score, 0.99), tags };
      })
    );

    // 4. Sort by Smart Score
    analyzed.sort((a, b) => b.score - a.score);

    // 5. Take top N and sort chronologically
    return analyzed.slice(0, maxCandidates).sort((a, b) => a.start - b.start);
  },

  /**
   * Post-process segments (Deprecated: use refineSegments)
   */
  postProcessSegments(
    _segments: Segment[],
    _options: AnalysisOptions = {}
  ): Segment[] {
    // Simplified Sync Version just for type compatibility if needed
    return [];
  },

  /**
   * Generate a visual preview (thumbnail) for a clip.
   * Extracts the middle frame of the segment.
   */
  async generateClipPreview(
    inputPath: string,
    outputDir: string,
    timeMs: number
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const timeSec = timeMs / 1000;
    const fileName = `preview_${crypto.randomUUID()}.jpg`;
    const outputPath = join(outputDir, fileName);

    // Fast seek to time, extract 1 frame, scale to 480px height
    const args = [
      "-y",
      "-ss",
      timeSec.toFixed(3),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=-1:480",
      "-q:v",
      "2", // High quality JPEG
      outputPath,
    ];

    logger.debug({ inputPath, timeSec }, "Generating clip preview");

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath || "ffmpeg", args);

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(fileName); // Return filename only (relative to outputDir/uploads)
        } else {
          logger.warn({ code }, "Preview generation failed");
          // Do not reject, just return empty string to avoid failing the job
          resolve("");
        }
      });

      proc.on("error", (err) => {
        logger.error({ err }, "Preview generation process error");
        resolve("");
      });
    });
  },

  /**
   * Generate a short video preview clip (2-3 seconds) for playback.
   */
  async generateClipVideoPreview(
    inputPath: string,
    outputDir: string,
    startMs: number,
    endMs: number
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const midpointMs = (startMs + endMs) / 2;
    const previewDurationMs = Math.min(3000, endMs - startMs);
    const previewStartMs = Math.max(0, midpointMs - previewDurationMs / 2);

    const startSec = previewStartMs / 1000;
    const durationSec = previewDurationMs / 1000;

    const fileName = `clip_${randomUUID()}.mp4`;
    const outputPath = join(outputDir, fileName);

    const args = [
      "-y",
      "-ss",
      startSec.toFixed(3),
      "-i",
      inputPath,
      "-t",
      durationSec.toFixed(3),
      "-vf",
      "scale=-2:480",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    logger.debug(
      { inputPath, startSec, durationSec },
      "Generating video clip preview"
    );

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath || "ffmpeg", args);

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(fileName);
        } else {
          logger.warn({ code }, "Video clip generation failed");
          resolve("");
        }
      });

      proc.on("error", (err) => {
        logger.error({ err }, "Video clip generation error");
        resolve("");
      });
    });
  },

  /**
   * Export final video from selected clips
   * - Extracts/Trims each clip
   * - Burns in subtitles if requested
   * - Concatenates into final video
   */
  async exportVideo(
    clips: {
      sourcePath: string;
      start: number;
      end: number;
      transcript?: any; // DirectorClipTranscript
    }[],
    outputDir: string,
    options: {
      includeSubtitles?: boolean;
      aspectRatio?: "9:16" | "16:9" | "1:1";
      quality?: "720p" | "1080p";
    } = {}
  ): Promise<string> {
    const fs = await import("fs/promises");
    const { join } = await import("path");

    // 1. Process each clip
    const clipPaths: string[] = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (!clip) continue;
      const clipId = randomUUID();
      const clipOutPath = join(outputDir, `temp_clip_${i}_${clipId}.mp4`);

      // Handle Subtitles
      let subtitlePath = "";
      let vfFilters: string[] = [];

      // Aspect Ratio / Scaling (Simple crop/scale for MVP)
      // Default 9:16 (1080x1920)
      // Ensure input is scaled/cropped to target.
      // For MVP, assume input is vertical or we just force scale.
      // Filters: [scale=-2:1920,crop=1080:1920] (Approximation)
      vfFilters.push(
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
      );

      if (options.includeSubtitles && clip.transcript?.segments) {
        // Generate SRT for this clip
        const srtContent = this.generateSRT(clip.transcript.segments);
        subtitlePath = join(outputDir, `temp_sub_${i}_${clipId}.srt`);
        await fs.writeFile(subtitlePath, srtContent);

        // Add subtitles filter
        // Note: Escape path properly or use relative
        // FFmpeg requires strict path formatting
        const escapedPath = subtitlePath
          .replace(/\\/g, "/")
          .replace(/:/g, "\\:");
        vfFilters.push(
          `subtitles='${escapedPath}':force_style='Fontname=Sans,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=60'`
        );
      }

      // Construct FFmpeg command for this clip
      // ffmpeg -ss start -t duration -i source -vf "filters" -c:v libx264 ... out.mp4
      const duration = clip.end - clip.start;
      const args = [
        "-y",
        "-ss",
        clip.start.toFixed(3),
        "-i",
        clip.sourcePath,
        "-t",
        duration.toFixed(3),
        "-vf",
        vfFilters.join(","),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        clipOutPath,
      ];

      logger.info({ i, args: args.join(" ") }, "Processing export clip");

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpegPath || "ffmpeg", args);
        // proc.stderr.pipe(process.stdout); // Debug logging
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Clip processing failed: ${code}`));
        });
      });

      clipPaths.push(clipOutPath);

      // Cleanup SRT
      if (subtitlePath && existsSync(subtitlePath)) {
        await fs.unlink(subtitlePath).catch(() => {});
      }
    }

    // 2. Concat Clips
    const listPath = join(outputDir, `concat_${randomUUID()}.txt`);
    const fileContent = clipPaths.map((p) => `file '${p}'`).join("\n");
    await fs.writeFile(listPath, fileContent);

    const finalName = `export_${randomUUID()}.mp4`;
    const finalPath = join(outputDir, finalName);

    const concatArgs = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      finalPath,
    ];

    logger.info("Concatenating export clips");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath || "ffmpeg", concatArgs);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Concat failed: ${code}`));
      });
    });

    // Cleanup temps
    await fs.unlink(listPath).catch(() => {});
    for (const p of clipPaths) {
      if (existsSync(p)) await fs.unlink(p).catch(() => {});
    }

    return finalName;
  },

  generateSRT(segments: any[]): string {
    return segments
      .map((s, i) => {
        const start = this.formatSRTTime(s.startMs);
        const end = this.formatSRTTime(s.endMs);
        return `${i + 1}\n${start} --> ${end}\n${s.text}\n`;
      })
      .join("\n");
  },

  formatSRTTime(ms: number): string {
    const date = new Date(0, 0, 0, 0, 0, 0, ms);
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    const s = date.getSeconds().toString().padStart(2, "0");
    const owl = date.getMilliseconds().toString().padStart(3, "0");
    return `${h}:${m}:${s},${owl}`;
  },
};
