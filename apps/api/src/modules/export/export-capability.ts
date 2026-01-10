/**
 * Export Capability Matrix
 * Server-enforced format × codec × resolution validation
 */

import { z } from 'zod';

/**
 * Supported export formats
 */
export const ExportFormat = z.enum(['mp4', 'webm', 'mov']);
export type ExportFormat = z.infer<typeof ExportFormat>;

/**
 * Supported video codecs
 */
export const VideoCodec = z.enum(['h264', 'h265', 'vp9', 'prores']);
export type VideoCodec = z.infer<typeof VideoCodec>;

/**
 * Supported audio codecs
 */
export const AudioCodec = z.enum(['aac', 'opus', 'pcm']);
export type AudioCodec = z.infer<typeof AudioCodec>;

/**
 * Supported resolutions
 */
export const ExportResolution = z.enum(['720p', '1080p', '2160p']);
export type ExportResolution = z.infer<typeof ExportResolution>;

/**
 * Resolution specs
 */
export const RESOLUTION_SPECS: Record<ExportResolution, { width: number; height: number; bitrate: string }> = {
  '720p': { width: 1280, height: 720, bitrate: '4M' },
  '1080p': { width: 1920, height: 1080, bitrate: '8M' },
  '2160p': { width: 3840, height: 2160, bitrate: '20M' },
};

/**
 * Format → Codec compatibility matrix
 */
export const FORMAT_CODEC_MATRIX: Record<ExportFormat, { video: VideoCodec[]; audio: AudioCodec[] }> = {
  mp4: {
    video: ['h264', 'h265'],
    audio: ['aac'],
  },
  webm: {
    video: ['vp9'],
    audio: ['opus'],
  },
  mov: {
    video: ['h264', 'h265', 'prores'],
    audio: ['aac', 'pcm'],
  },
};

/**
 * Plan-based export limits
 */
export type ExportTier = 'free' | 'pro' | 'enterprise';

export const TIER_LIMITS: Record<ExportTier, {
  maxResolution: ExportResolution;
  maxDurationMs: number;
  hasWatermark: boolean;
  maxConcurrentJobs: number;
  maxJobsPerDay: number;
}> = {
  free: {
    maxResolution: '720p',
    maxDurationMs: 5 * 60 * 1000, // 5 min
    hasWatermark: true,
    maxConcurrentJobs: 1,
    maxJobsPerDay: 5,
  },
  pro: {
    maxResolution: '1080p',
    maxDurationMs: 30 * 60 * 1000, // 30 min
    hasWatermark: false,
    maxConcurrentJobs: 3,
    maxJobsPerDay: 50,
  },
  enterprise: {
    maxResolution: '2160p',
    maxDurationMs: 120 * 60 * 1000, // 2 hours
    hasWatermark: false,
    maxConcurrentJobs: 10,
    maxJobsPerDay: Infinity,
  },
};

/**
 * Validate format + codec combination
 */
export function validateFormatCodec(
  format: ExportFormat,
  videoCodec: VideoCodec,
  audioCodec: AudioCodec
): { valid: boolean; error?: string } {
  const matrix = FORMAT_CODEC_MATRIX[format];
  
  if (!matrix.video.includes(videoCodec)) {
    return {
      valid: false,
      error: `Video codec ${videoCodec} not supported for ${format} format`,
    };
  }
  
  if (!matrix.audio.includes(audioCodec)) {
    return {
      valid: false,
      error: `Audio codec ${audioCodec} not supported for ${format} format`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate resolution against tier
 */
export function validateResolutionForTier(
  resolution: ExportResolution,
  tier: ExportTier
): { valid: boolean; error?: string } {
  const limits = TIER_LIMITS[tier];
  const resolutionOrder: ExportResolution[] = ['720p', '1080p', '2160p'];
  
  const requestedIndex = resolutionOrder.indexOf(resolution);
  const maxIndex = resolutionOrder.indexOf(limits.maxResolution);
  
  if (requestedIndex > maxIndex) {
    return {
      valid: false,
      error: `Resolution ${resolution} requires ${tier === 'free' ? 'Pro' : 'Enterprise'} plan`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate duration against tier
 */
export function validateDurationForTier(
  durationMs: number,
  tier: ExportTier
): { valid: boolean; error?: string } {
  const limits = TIER_LIMITS[tier];
  
  if (durationMs > limits.maxDurationMs) {
    const maxMinutes = Math.floor(limits.maxDurationMs / 60000);
    return {
      valid: false,
      error: `Video duration exceeds ${maxMinutes} minute limit for your plan`,
    };
  }
  
  return { valid: true };
}

/**
 * Export settings Zod schema
 */
export const ExportSettingsSchema = z.object({
  format: ExportFormat.default('mp4'),
  videoCodec: VideoCodec.default('h264'),
  audioCodec: AudioCodec.default('aac'),
  resolution: ExportResolution.default('1080p'),
  preset: z.enum(['fast', 'balanced', 'quality']).default('balanced'),
  addWatermark: z.boolean().default(false),
});

export type ExportSettings = z.infer<typeof ExportSettingsSchema>;

/**
 * Validate export settings against user tier
 */
export function validateExportSettings(
  settings: ExportSettings,
  tier: ExportTier,
  durationMs: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Format + codec compatibility
  const formatResult = validateFormatCodec(
    settings.format,
    settings.videoCodec,
    settings.audioCodec
  );
  if (!formatResult.valid && formatResult.error) {
    errors.push(formatResult.error);
  }
  
  // Resolution tier check
  const resolutionResult = validateResolutionForTier(settings.resolution, tier);
  if (!resolutionResult.valid && resolutionResult.error) {
    errors.push(resolutionResult.error);
  }
  
  // Duration tier check
  const durationResult = validateDurationForTier(durationMs, tier);
  if (!durationResult.valid && durationResult.error) {
    errors.push(durationResult.error);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
