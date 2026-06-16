/**
 * EmptyState - the ONE canonical empty-state (UI_CANON section 7.1).
 * Consolidates ChartEmptyState + the other ad-hoc empty patterns at consistent sizing.
 * No full-card h-48 empty (the section 6 / GapResponseRateCard defect).
 *
 * v2.0 UI foundation (gate-zero). Not migrated onto call-sites here (section 17.3).
 */
import React from 'react';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

export interface EmptyStateProps {
  /** Short headline, e.g. "No gaps detected". */
  title: string;
  /** Optional supporting line. */
  description?: string;
  /** Optional leading icon (e.g. a lucide glyph element). */
  icon?: React.ReactNode;
  /** Optional action element (e.g. a <Button>). */
  action?: React.ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

const PAD: Record<EmptyStateSize, number> = { sm: 16, md: 24, lg: 32 };
const TITLE_PX: Record<EmptyStateSize, number> = { sm: 13, md: 14, lg: 16 };

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  size = 'md',
  className = '',
}) => (
  <div
    role="status"
    className={`ds-empty-state flex flex-col items-center justify-center text-center ${className}`}
    style={{ padding: PAD[size], gap: 8, color: 'var(--sem-chart-tick)' }}
  >
    {icon ? <span className="ds-empty-icon" aria-hidden style={{ opacity: 0.6 }}>{icon}</span> : null}
    <span style={{ color: 'var(--sem-cta)', fontWeight: 500, fontSize: TITLE_PX[size] }}>{title}</span>
    {description ? <span style={{ fontSize: 12, maxWidth: 360 }}>{description}</span> : null}
    {action ? <span className="ds-empty-action" style={{ marginTop: 4 }}>{action}</span> : null}
  </div>
);

export default EmptyState;
