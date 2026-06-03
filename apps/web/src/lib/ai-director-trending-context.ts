export interface TrendingImportContext {
  readonly sourceUrl: string;
  readonly topic: string | null;
  readonly thumbnailUrl: string | null;
  readonly region: string | null;
  readonly rank: number | null;
}

export interface BuildTrendingDirectorUrlInput {
  readonly title: string;
  readonly sourceUrl?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly region?: string | null;
  readonly rank?: number | null;
}

export const DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS = [
  'topic',
  'sourceUrl',
  'source',
  'thumbnailUrl',
  'region',
  'rank',
] as const;

function getHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getOptionalRank(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const rank = Number.parseInt(value, 10);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

export function buildTrendingDirectorUrl(input: BuildTrendingDirectorUrlInput): string {
  const searchParams = new URLSearchParams({
    source: 'trending',
    topic: input.title,
  });

  if (input.sourceUrl) {
    searchParams.set('sourceUrl', input.sourceUrl);
  }

  if (input.thumbnailUrl) {
    searchParams.set('thumbnailUrl', input.thumbnailUrl);
  }

  if (input.region) {
    searchParams.set('region', input.region);
  }

  if (input.rank) {
    searchParams.set('rank', String(input.rank));
  }

  return `/tools/ai-director?${searchParams.toString()}`;
}

export function clearDirectorInitialContextSearchParams(
  searchParams: URLSearchParams,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);

  for (const key of DIRECTOR_INITIAL_CONTEXT_QUERY_KEYS) {
    nextSearchParams.delete(key);
  }

  return nextSearchParams;
}

export function resolveTrendingImportContext(
  searchParams: URLSearchParams,
): TrendingImportContext | null {
  if (searchParams.get('source') !== 'trending') {
    return null;
  }

  const sourceUrl = getHttpUrl(searchParams.get('sourceUrl'));

  if (!sourceUrl) {
    return null;
  }

  return {
    sourceUrl,
    topic: searchParams.get('topic')?.trim() || null,
    thumbnailUrl: getHttpUrl(searchParams.get('thumbnailUrl')),
    region: searchParams.get('region')?.trim().toUpperCase() || null,
    rank: getOptionalRank(searchParams.get('rank')),
  };
}

export function resolveInitialSourceUrl(
  searchParams: URLSearchParams,
  trendingImportContext: TrendingImportContext | null,
): string | null {
  if (trendingImportContext) {
    return trendingImportContext.sourceUrl;
  }

  if (searchParams.get('source') === 'trending') {
    return null;
  }

  return getHttpUrl(searchParams.get('sourceUrl'));
}
