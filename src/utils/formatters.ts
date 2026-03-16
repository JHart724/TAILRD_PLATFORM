/**
 * Centralized formatting utilities for the TAILRD Platform.
 * All number, currency, percentage, ordinal, and date formatting
 * should go through these functions to ensure consistency.
 */

// ── Ordinal Suffixes ──────────────────────────────────────────────────
/** Returns the correct English ordinal suffix for any integer (1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, etc.) */
export const getOrdinalSuffix = (n: number): string => {
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (Math.abs(n) % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

/** Formats a number with its ordinal suffix, e.g. 52 → "52nd", 83 → "83rd" */
export const formatOrdinal = (n: number): string => `${n}${getOrdinalSuffix(n)}`;

// ── Number Rounding ───────────────────────────────────────────────────
/** Rounds a number to N decimal places, eliminating floating-point artifacts */
export const roundTo = (value: number, decimals: number = 1): number =>
  Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);

/** Formats a number to exactly N decimal places as a string */
export const toFixed = (value: number, decimals: number = 1): string =>
  roundTo(value, decimals).toFixed(decimals);

// ── Percentage Formatting ─────────────────────────────────────────────
/** Formats a percentage value to 1 decimal place, e.g. 87.2999 → "87.3%" */
export const formatPercent = (value: number, decimals: number = 1): string =>
  `${toFixed(value, decimals)}%`;

/** Formats a delta/difference value with +/- sign and unit, e.g. -11.6 → "-11.6%" */
export const formatDelta = (value: number, unit: string = '%', decimals: number = 1): string => {
  const rounded = toFixed(value, decimals);
  const sign = Number(rounded) > 0 ? '+' : '';
  return `${sign}${rounded}${unit}`;
};

// ── Currency Formatting ───────────────────────────────────────────────
/** Formats a dollar amount with appropriate suffix: $1.2M, $450K, $1,234 */
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${toFixed(amount / 1000, 0)}K`;
  return `$${amount.toLocaleString()}`;
};

/** Formats a large dollar amount always in millions: $42.3M */
export const formatMillions = (amount: number, decimals: number = 1): string =>
  `$${toFixed(amount / 1000000, decimals)}M`;

// ── Number Formatting ─────────────────────────────────────────────────
/** Formats an integer with comma separators: 1234 → "1,234" */
export const formatNumber = (value: number): string =>
  Math.round(value).toLocaleString();

/** Formats a number with comma separators and decimal places */
export const formatDecimal = (value: number, decimals: number = 1): string =>
  roundTo(value, decimals).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// ── Percentile Formatting ─────────────────────────────────────────────
/** Formats a percentile value: 52 → "52nd %ile", 83 → "83rd %ile" */
export const formatPercentile = (percentile: number): string =>
  `${percentile}${getOrdinalSuffix(percentile)} %ile`;

// ── Date Formatting ───────────────────────────────────────────────────
/** Formats an ISO date string to MMM D, YYYY format */
export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

/** Formats an ISO date string to MM/DD/YYYY format */
export const formatDateShort = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ── Safe Value Access ─────────────────────────────────────────────────
/** Returns a display-safe string for any value, preventing undefined/NaN/null from rendering */
export const safeDisplay = (value: any, fallback: string = '—'): string => {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return fallback;
  }
  return String(value);
};

// ── Clinical Severity Thresholds ──────────────────────────────────────
export type SeverityLevel = 'critical' | 'warning' | 'on-track';

/** Returns consistent severity level based on a percentage metric and its target */
export const getSeverityLevel = (
  value: number,
  target: number,
  options: { lowerIsBetter?: boolean; criticalThreshold?: number; warningThreshold?: number } = {}
): SeverityLevel => {
  const { lowerIsBetter = false, criticalThreshold = 20, warningThreshold = 10 } = options;
  const diff = lowerIsBetter ? value - target : target - value;
  if (diff > criticalThreshold) return 'critical';
  if (diff > warningThreshold) return 'warning';
  return 'on-track';
};

/** Returns Tailwind color classes for a severity level */
export const severityColors: Record<SeverityLevel, { text: string; bg: string; border: string; icon: string }> = {
  critical: { text: 'text-crimson-600', bg: 'bg-crimson-50', border: 'border-crimson-200', icon: 'text-crimson-500' },
  warning: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' },
  'on-track': { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500' },
};

// ── Trend Direction Logic ─────────────────────────────────────────────
/** Returns whether a trend is clinically positive (green) based on the metric type */
export const isClinicallyPositive = (
  direction: 'up' | 'down' | 'stable',
  metricType: 'adherence' | 'rate_lower_better' | 'rate_higher_better' | 'score_lower_better'
): boolean => {
  if (direction === 'stable') return true;
  switch (metricType) {
    case 'adherence':
    case 'rate_higher_better':
      return direction === 'up';
    case 'rate_lower_better':
    case 'score_lower_better':
      return direction === 'down';
    default:
      return direction === 'up';
  }
};
