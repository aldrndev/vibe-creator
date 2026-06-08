import { useLocation, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';

const optionalText = z
  .preprocess((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional())
  .catch(undefined);

const optionalHttpUrl = z
  .preprocess((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  }, z.string().url().optional())
  .catch(undefined);

const optionalPositiveRank = z
  .preprocess((value) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, z.number().int().positive().optional())
  .catch(undefined);

export const sessionSearchSchema = z
  .object({
    session: optionalText,
  })
  .catch({ session: undefined });

export const videoStudioSearchSchema = z
  .object({
    session: optionalText,
    project: optionalText,
  })
  .catch({ session: undefined, project: undefined });

export const loopCreatorSearchSchema = z
  .object({
    session: optionalText,
    prompt: optionalText,
  })
  .catch({ session: undefined, prompt: undefined });

export const aiDirectorSearchSchema = z
  .object({
    session: optionalText,
    source: z.enum(['trending']).optional().catch(undefined),
    topic: optionalText,
    sourceUrl: optionalHttpUrl,
    thumbnailUrl: optionalHttpUrl,
    region: optionalText,
    rank: optionalPositiveRank,
  })
  .catch({
    session: undefined,
    source: undefined,
    topic: undefined,
    sourceUrl: undefined,
    thumbnailUrl: undefined,
    region: undefined,
    rank: undefined,
  });

export const trendingSearchSchema = z
  .object({
    region: z
      .enum(['ID', 'US', 'JP', 'KR', 'MY', 'PH', 'TH', 'SG', 'IN', 'GB'])
      .optional()
      .catch('ID')
      .default('ID'),
  })
  .catch({ region: 'ID' });

export const paymentSearchSchema = z
  .object({
    payment: z.enum(['success', 'cancelled', 'failed']).optional().catch(undefined),
  })
  .catch({ payment: undefined });

export const historySearchSchema = z
  .object({
    filter: z
      .enum([
        'all',
        'ai-director',
        'video-studio',
        'loop-creator',
        'reaction-video',
        'live-stream',
        'exports',
        'expired',
      ])
      .optional()
      .catch(undefined),
  })
  .catch({ filter: undefined });

export type AiDirectorRouteSearch = z.infer<typeof aiDirectorSearchSchema>;
export type HistoryRouteSearch = z.infer<typeof historySearchSchema>;
export type LoopCreatorRouteSearch = z.infer<typeof loopCreatorSearchSchema>;
export type SessionRouteSearch = z.infer<typeof sessionSearchSchema>;
export type TrendingRouteSearch = z.infer<typeof trendingSearchSchema>;
export type VideoStudioRouteSearch = z.infer<typeof videoStudioSearchSchema>;

export function parseRouteSearch<T>(schema: z.ZodType<T>, search: unknown): T {
  return schema.parse(search);
}

type SearchParamValue = string | number | boolean | null | undefined;
type SearchParamInit = URLSearchParams | Record<string, SearchParamValue>;

function toSearchRecord(init: SearchParamInit): Record<string, string> {
  if (init instanceof URLSearchParams) {
    return Object.fromEntries(init.entries());
  }

  return Object.fromEntries(
    Object.entries(init)
      .filter((entry): entry is [string, Exclude<SearchParamValue, null | undefined>] => {
        return entry[1] !== null && entry[1] !== undefined;
      })
      .map(([key, value]) => [key, String(value)]),
  );
}

export function useMutableSearchParams(): [
  URLSearchParams,
  (nextInit: SearchParamInit, options?: { readonly replace?: boolean }) => void,
] {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);

  const setSearchParams = (nextInit: SearchParamInit, options?: { readonly replace?: boolean }) => {
    void navigate({
      to: '.',
      replace: options?.replace,
      search: toSearchRecord(nextInit),
    });
  };

  return [searchParams, setSearchParams];
}
