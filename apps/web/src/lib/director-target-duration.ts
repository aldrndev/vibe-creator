export const targetDurationRangeValues = ['auto', '20-40', '40-60', '60-90', '90-120'] as const;

export type TargetDurationRange = (typeof targetDurationRangeValues)[number];

export const targetDurationRangeOptions: Array<{
  value: TargetDurationRange;
  label: string;
  helper: string;
}> = [
  {
    value: 'auto',
    label: 'Auto',
    helper: 'Rekomendasi AI',
  },
  {
    value: '20-40',
    label: '20-40s',
    helper: 'Hook cepat',
  },
  {
    value: '40-60',
    label: '40-60s',
    helper: 'Paling aman',
  },
  {
    value: '60-90',
    label: '60-90s',
    helper: 'Narasi panjang',
  },
  {
    value: '90-120',
    label: '90-120s',
    helper: 'Deep context',
  },
];
