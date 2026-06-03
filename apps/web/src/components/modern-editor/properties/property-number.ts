const PROPERTY_NUMBER_DECIMALS = 2;
const PROPERTY_NUMBER_FACTOR = 10 ** PROPERTY_NUMBER_DECIMALS;

export function parseFiniteNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundPropertyNumber(value: number, fallback = 0): number {
  const finiteValue = Number.isFinite(value) ? value : fallback;
  return Math.round(finiteValue * PROPERTY_NUMBER_FACTOR) / PROPERTY_NUMBER_FACTOR;
}

export function formatPropertyNumber(value: number, fallback = 0): string {
  return roundPropertyNumber(value, fallback).toString();
}

export function formatPropertyPercent(value: number, fallback = 0): string {
  return `${formatPropertyNumber(value * 100, fallback * 100)}%`;
}
