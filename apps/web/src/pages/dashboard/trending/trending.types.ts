export interface TrendingItem {
  id: string;
  platform: string;
  type: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  rank: number | null;
  metrics: Record<string, unknown>;
  category: string | null;
  region: string;
  fetchedAt: string;
}

export interface TrendingStatus {
  platform: string;
  region: string;
  status: 'ok' | 'degraded' | 'down';
  lastSuccessAt: string | null;
}

export interface TrendingResponse {
  items: TrendingItem[];
  nextCursor: string | null;
  status: TrendingStatus;
}
