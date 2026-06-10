import type { TrendingItem } from './trending.types';

export type TrendingFormatFilter = 'all' | 'video' | 'shorts' | 'search' | 'topic' | 'hashtag';

export interface TrendingMetricSummary {
  readonly value: string;
  readonly label: string;
}

const SHORTS_KEYWORD = 'short';

function includesShortKeyword(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.toLowerCase().includes(SHORTS_KEYWORD);
}

export function isShortItem(item: TrendingItem): boolean {
  if (item.type !== 'VIDEO') {
    return false;
  }

  return (
    item.category?.toLowerCase() === 'shorts' ||
    includesShortKeyword(item.title) ||
    includesShortKeyword(item.description)
  );
}

export function getTrendingFormat(item: TrendingItem): Exclude<TrendingFormatFilter, 'all'> {
  if (isShortItem(item)) {
    return 'shorts';
  }

  switch (item.type) {
    case 'VIDEO':
      return 'video';
    case 'SEARCH':
      return 'search';
    case 'TOPIC':
      return 'topic';
    case 'HASHTAG':
      return 'hashtag';
    default:
      return 'video';
  }
}

export function filterTrendingItems(
  items: TrendingItem[],
  format: TrendingFormatFilter,
  category: string,
): TrendingItem[] {
  return items.filter((item) => {
    const matchesFormat = format === 'all' ? true : getTrendingFormat(item) === format;
    const matchesCategory = category === 'all' ? true : item.category === category;

    return matchesFormat && matchesCategory;
  });
}

export function getMetricSummary(item: TrendingItem): TrendingMetricSummary {
  const traffic = item.metrics.traffic;
  const formattedValue = item.metrics.formattedValue;
  const numericValue = item.metrics.value;

  if (typeof traffic === 'string' || typeof traffic === 'number') {
    return {
      value: String(traffic),
      label: (() => {
        if (item.type === 'SEARCH') return 'pencarian';
        if (isShortItem(item)) return 'tayangan pendek';
        return 'tayangan';
      })(),
    };
  }

  if (typeof formattedValue === 'string') {
    return {
      value: formattedValue,
      label: item.type === 'TOPIC' ? 'minat' : 'sinyal',
    };
  }

  if (typeof numericValue === 'number') {
    return {
      value: numericValue.toLocaleString('id-ID'),
      label: item.type === 'TOPIC' ? 'minat' : 'sinyal',
    };
  }

  return {
    value: item.type === 'VIDEO' ? 'Baru' : 'Naik',
    label: item.type === 'VIDEO' ? 'momentum' : 'tren',
  };
}

export function getFormatLabel(item: TrendingItem): string {
  const format = getTrendingFormat(item);

  switch (format) {
    case 'shorts':
      return 'Shorts';
    case 'video':
      return 'Video';
    case 'search':
      return 'Pencarian';
    case 'topic':
      return 'Topik';
    case 'hashtag':
      return 'Hashtag';
    default:
      return 'Trending';
  }
}

export function getSignalLabel(item: TrendingItem): string {
  const format = getTrendingFormat(item);

  switch (format) {
    case 'shorts':
      return 'Naik cepat di format singkat';
    case 'video':
      return 'Konten panjang yang sedang pecah';
    case 'search':
      return 'Lonjakan pencarian';
    case 'topic':
      return 'Percakapan sedang naik';
    case 'hashtag':
      return 'Sinyal komunitas';
    default:
      return 'Tren sedang aktif';
  }
}

export function getSourceLabel(item: TrendingItem): string {
  if (item.type === 'VIDEO') {
    return 'YouTube';
  }

  return 'Legacy Trend';
}

export function getFreshnessLabel(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m lalu`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}j lalu`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}h lalu`;
}

export function formatIsoDuration(isoDuration?: string | null): string {
  if (!isoDuration) {
    return '';
  }

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return '';
  }

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours.toString());
    parts.push(minutes.toString().padStart(2, '0'));
  } else {
    parts.push(minutes.toString());
  }
  parts.push(seconds.toString().padStart(2, '0'));

  return parts.join(':');
}
