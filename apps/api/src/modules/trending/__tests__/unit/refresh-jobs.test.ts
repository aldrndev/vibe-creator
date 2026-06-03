import {
  TRENDING_MAX_RESULTS,
  TRENDING_REGION_CODES,
  type TrendingRegionCode,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { TRENDING_REFRESH_INTERVAL_MS } from '../../trending.constants';
import {
  buildTrendingScheduledRefreshDefinitions,
  buildTrendingStartupRefreshDefinitions,
  createTrendingRefreshJobId,
} from '../../trending-refresh-jobs';

describe('trending refresh job helpers', () => {
  it('creates BullMQ-safe refresh job ids without colon separators', () => {
    const jobId = createTrendingRefreshJobId('quick', 'ID', 'refresh:request:1');

    expect(jobId).toBe('trending-refresh-quick-ID-refresh-request-1');
    expect(jobId).not.toContain(':');
  });

  it('builds one repeatable scheduled refresh per supported region', () => {
    const jobs = buildTrendingScheduledRefreshDefinitions();

    expect(jobs).toHaveLength(TRENDING_REGION_CODES.length);
    expect(jobs.map((job) => job.region)).toEqual(TRENDING_REGION_CODES);
    expect(jobs.every((job) => job.repeatEveryMs === TRENDING_REFRESH_INTERVAL_MS)).toBe(true);
    expect(jobs.every((job) => job.idempotencyKey.startsWith('auto:'))).toBe(true);
  });

  it('builds staggered startup refreshes for all regions', () => {
    const regions: readonly TrendingRegionCode[] = ['ID', 'US', 'JP'];
    const jobs = buildTrendingStartupRefreshDefinitions(1000, regions);

    expect(jobs.map((job) => job.region)).toEqual(regions);
    expect(jobs[0]?.delayMs).toBeLessThan(jobs[1]?.delayMs ?? 0);
    expect(jobs[1]?.delayMs).toBeLessThan(jobs[2]?.delayMs ?? 0);
    expect(jobs.every((job) => job.idempotencyKey.endsWith(':1000'))).toBe(true);
  });

  it('keeps Top 50 as the shared count contract', () => {
    expect(TRENDING_MAX_RESULTS).toBe(50);
  });
});
