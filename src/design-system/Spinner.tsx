/**
 * Spinner / LoadingState - canonical loading primitive (UI_CANON section 7.1).
 * ONE loading component at a canonical size set; replaces the ad-hoc animate-spin
 * instances (App w-16 vs ModuleLayout w-10, etc). Consumes the --sem/--motion tokens.
 *
 * v2.0 UI foundation (gate-zero). Not yet migrated onto call-sites (section 17.3).
 */
import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /** Canonical size set. Default 'md'. */
  size?: SpinnerSize;
  /** Accessible label for screen readers. Default 'Loading'. */
  label?: string;
  /** Optional className passthrough for layout (not color). */
  className?: string;
}

const SIZE_PX: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 40 };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Loading', className = '' }) => {
  const px = SIZE_PX[size];
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`ds-spinner inline-block animate-spin ${className}`}
      style={{
        width: px,
        height: px,
        border: `${Math.max(2, Math.round(px / 10))}px solid var(--sem-selection-bg)`,
        borderTopColor: 'var(--sem-cta)',
        borderRadius: 'var(--radius-full)',
      }}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
};

/**
 * LoadingState - a centered Spinner with an optional message, for full-surface
 * async branches (every async surface must have a loading branch per section 7.1).
 */
export interface LoadingStateProps {
  size?: SpinnerSize;
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ size = 'md', message, className = '' }) => (
  <div
    className={`ds-loading-state flex flex-col items-center justify-center gap-3 ${className}`}
    style={{ padding: 'var(--space-card-pad)' }}
  >
    <Spinner size={size} />
    {message ? (
      <span style={{ color: 'var(--sem-chart-tick)', fontSize: 13 }}>{message}</span>
    ) : null}
  </div>
);

export default Spinner;
