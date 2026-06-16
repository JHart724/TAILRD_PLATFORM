/**
 * Canonical primitive barrel - v2.0 UI foundation (gate-zero).
 * The single import surface for the canonical components (UI_CANON section 3). The later migration
 * track imports from here; this PR builds the targets and does NOT migrate the call-sites (section 17.3).
 */
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { default as Badge } from './Badge';
export type { BadgeProps, BadgeKind, Severity, StatusValue } from './Badge';

export { KPICard } from './KPICard';
export type { KPICardProps, KPITrend } from './KPICard';

export { Chart } from './Chart';
export type { ChartProps } from './Chart';
export { ChartTheme } from './ChartTheme';
export type { ChartSeries, ChartSeriesType } from './ChartTheme';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Spinner, LoadingState } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';
