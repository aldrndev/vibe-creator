export const TRENDING_MAX_RESULTS = 50;

export const DEFAULT_TRENDING_REGION = 'ID';

export const TRENDING_REGION_CODES = [
  'ID',
  'US',
  'JP',
  'KR',
  'MY',
  'PH',
  'TH',
  'SG',
  'IN',
  'GB',
] as const;

export type TrendingRegionCode = (typeof TRENDING_REGION_CODES)[number];

export interface TrendingRegionOption {
  readonly code: TrendingRegionCode;
  readonly label: string;
  readonly shortLabel: string;
}

export const TRENDING_REGIONS: readonly TrendingRegionOption[] = [
  { code: 'ID', label: 'Indonesia', shortLabel: 'ID' },
  { code: 'US', label: 'United States', shortLabel: 'US' },
  { code: 'JP', label: 'Japan', shortLabel: 'JP' },
  { code: 'KR', label: 'South Korea', shortLabel: 'KR' },
  { code: 'MY', label: 'Malaysia', shortLabel: 'MY' },
  { code: 'PH', label: 'Philippines', shortLabel: 'PH' },
  { code: 'TH', label: 'Thailand', shortLabel: 'TH' },
  { code: 'SG', label: 'Singapore', shortLabel: 'SG' },
  { code: 'IN', label: 'India', shortLabel: 'IN' },
  { code: 'GB', label: 'United Kingdom', shortLabel: 'GB' },
];

const TRENDING_REGION_LABELS = new Map(
  TRENDING_REGIONS.map((region) => [region.code, region.label] as const),
);

export function isTrendingRegionCode(value: string): value is TrendingRegionCode {
  return TRENDING_REGION_CODES.includes(value as TrendingRegionCode);
}

export function getTrendingRegionLabel(value: TrendingRegionCode): string {
  return TRENDING_REGION_LABELS.get(value) ?? value;
}
