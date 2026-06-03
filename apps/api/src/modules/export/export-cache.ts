import { createHash } from 'node:crypto';
import type { TimelineData } from './processors/export-processor.types';

const MAX_TITLE_SEGMENT_LENGTH = 48;

interface ExportFingerprintInput {
  readonly projectId?: string | null;
  readonly format: string;
  readonly resolution: string;
  readonly addWatermark: boolean;
  readonly timelineData: TimelineData;
}

interface DisplayFilenameInput {
  readonly projectTitle?: string | null;
  readonly createdAt?: Date;
  readonly prefix?: 'video-studio' | 'loop-creator' | 'reaction';
}

type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

/**
 * Create a deterministic hash for an export request after tier constraints are resolved.
 */
export function createExportFingerprint(input: ExportFingerprintInput): string {
  const canonical = canonicalStringify({
    projectId: input.projectId ?? null,
    format: input.format,
    resolution: input.resolution,
    addWatermark: input.addWatermark,
    renderKind: input.timelineData.renderKind ?? 'timeline',
    loopSpec: input.timelineData.loopSpec ?? null,
    reactionSpec: input.timelineData.reactionSpec ?? null,
    clips: input.timelineData.clips,
    textOverlays: input.timelineData.textOverlays ?? [],
    audioTracks: input.timelineData.audioTracks ?? [],
    settings: input.timelineData.settings,
  });

  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generate a clean filename that is suitable for Content-Disposition downloads.
 */
export function createExportDisplayFilename(input: DisplayFilenameInput): string {
  const timestamp = formatFilenameTimestamp(input.createdAt ?? new Date());
  const titleSegment = sanitizeFilenameSegment(input.projectTitle ?? '');
  const prefix = input.prefix ?? 'video-studio';

  if (!titleSegment) {
    return `${prefix}-${timestamp}.mp4`;
  }

  return `${prefix}-${titleSegment}-${timestamp}.mp4`;
}

function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TITLE_SEGMENT_LENGTH)
    .replace(/-+$/g, '');
}

function formatFilenameTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  const hour = padDatePart(date.getUTCHours());
  const minute = padDatePart(date.getUTCMinutes());

  return `${year}${month}${day}-${hour}${minute}`;
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(toCanonicalJson(value));
}

function toCanonicalJson(value: unknown): CanonicalJson {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toCanonicalJson(item));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: { [key: string]: CanonicalJson } = {};

    for (const key of Object.keys(record).sort()) {
      const child = record[key];
      if (child === undefined) {
        continue;
      }

      result[key] = toCanonicalJson(child);
    }

    return result;
  }

  return null;
}
