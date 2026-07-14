export function toNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export interface PriceBand {
  low: number;
  mid: number;
  high: number;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

const USD_CONVERSION: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.52,
  JPY: 158,
};

export function buildPriceBand(values: Array<string | number | null | undefined>): PriceBand | undefined {
  const numericValues = values
    .map(toNumber)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);

  if (numericValues.length === 0) return undefined;
  if (numericValues.length === 1) {
    const single = roundPrice(numericValues[0]);
    return { low: single, mid: single, high: single };
  }

  const mid = Math.floor(numericValues.length / 2);
  const median =
    numericValues.length % 2 === 0
      ? (numericValues[mid - 1] + numericValues[mid]) / 2
      : numericValues[mid];

  return {
    low: roundPrice(numericValues[0]),
    mid: roundPrice(median),
    high: roundPrice(numericValues[numericValues.length - 1]),
  };
}

export function estimateMarketPrice(values: Array<string | number | null | undefined>): number | undefined {
  return buildPriceBand(values)?.mid;
}

export function convertUsdPrice(value: number | undefined, currency: CurrencyCode): number | undefined {
  if (value === undefined) return undefined;
  return roundPrice(value * USD_CONVERSION[currency]);
}

export function formatCurrencyPrice(value: number | undefined, currency: CurrencyCode): string {
  const converted = convertUsdPrice(value, currency);
  if (converted === undefined) return '';

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(converted);

  return currency === 'USD' ? formatted : `~${formatted}`;
}

export function formatUsdPrice(value: number | undefined): string {
  return formatCurrencyPrice(value, 'USD');
}

export function formatUsdPriceBand(band: PriceBand | undefined): string {
  if (!band) return '';
  return `${formatUsdPrice(band.low)} / ${formatUsdPrice(band.mid)} / ${formatUsdPrice(band.high)}`;
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}