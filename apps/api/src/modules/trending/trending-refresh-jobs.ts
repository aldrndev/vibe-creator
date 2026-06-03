import { randomUUID } from 'node:crypto';
import { TRENDING_REGION_CODES, type TrendingRegionCode } from '@vibe-creator/shared';
import {
  TRENDING_REFRESH_INTERVAL_MS,
  TRENDING_STARTUP_REFRESH_DELAY_MS,
  TRENDING_STARTUP_REFRESH_SPACING_MS,
} from './trending.constants';

export type TrendingRefreshMode = 'quick' | 'full';

const UNSAFE_BULLMQ_JOB_ID_CHARS = /[^A-Za-z0-9_-]/g;

function sanitizeJobIdSegment(value: string): string {
  return value.trim().replace(UNSAFE_BULLMQ_JOB_ID_CHARS, '-');
}

/**
 * Builds a BullMQ-safe job id for manual trending refresh requests.
 */
export function createTrendingRefreshJobId(
  mode: TrendingRefreshMode,
  region: TrendingRegionCode,
  uniquePart: string = randomUUID(),
): string {
  const safeMode = sanitizeJobIdSegment(mode);
  const safeRegion = sanitizeJobIdSegment(region.toUpperCase());
  const safeUniquePart = sanitizeJobIdSegment(uniquePart);

  return `trending-refresh-${safeMode}-${safeRegion}-${safeUniquePart}`;
}

export interface TrendingScheduledRefreshDefinition {
  readonly name: string;
  readonly jobId: string;
  readonly region: TrendingRegionCode;
  readonly mode: 'full';
  readonly idempotencyKey: string;
  readonly repeatEveryMs: number;
}

export interface TrendingStartupRefreshDefinition {
  readonly name: string;
  readonly region: TrendingRegionCode;
  readonly mode: 'full';
  readonly idempotencyKey: string;
  readonly delayMs: number;
}

/**
 * Builds repeatable refresh jobs for every supported cached region.
 */
export function buildTrendingScheduledRefreshDefinitions(
  regions: readonly TrendingRegionCode[] = TRENDING_REGION_CODES,
): readonly TrendingScheduledRefreshDefinition[] {
  return regions.map((region) => {
    const regionSegment = region.toLowerCase();

    return {
      name: `scheduled-refresh-${regionSegment}`,
      jobId: `cron-trending-refresh-${regionSegment}`,
      region,
      mode: 'full',
      idempotencyKey: `auto:${region}`,
      repeatEveryMs: TRENDING_REFRESH_INTERVAL_MS,
    };
  });
}

/**
 * Builds staggered startup refresh jobs so app boot does not burst all regions at once.
 */
export function buildTrendingStartupRefreshDefinitions(
  nowMs: number = Date.now(),
  regions: readonly TrendingRegionCode[] = TRENDING_REGION_CODES,
): readonly TrendingStartupRefreshDefinition[] {
  return regions.map((region, index) => ({
    name: `startup-refresh-${region.toLowerCase()}`,
    region,
    mode: 'full',
    idempotencyKey: `startup:${region}:${nowMs}`,
    delayMs: TRENDING_STARTUP_REFRESH_DELAY_MS + index * TRENDING_STARTUP_REFRESH_SPACING_MS,
  }));
}
