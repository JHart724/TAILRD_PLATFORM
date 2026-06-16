/**
 * KPICard - the ONE canonical KPI card (UI_CANON section 3.3).
 * The seven *ExecutiveKPICard copies + inline KPI markup collapse into this (a single canonical
 * border/pill/icon treatment, not four). Glass-panel raised, 12px radius, the section 5 density.
 * Trend color is DATA, not alarm: down = amber (--sem-data-negative), never red (section 4.2).
 *
 * v2.0 UI foundation (gate-zero). This builds the one true component; the 7 copies are NOT migrated
 * onto it here (section 17.3) - that is the next track.
 */
import React from 'react';
import Badge from './Badge';

export interface KPITrend {
  direction: 'up' | 'down' | 'flat';
  value: string;
}

export interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: KPITrend;
  /** Module-identity accent color token (e.g. the --color-mod-* value); drives the left rule. */
  accent?: string;
  icon?: React.ReactNode;
  /** Provenance badge (e.g. <Badge kind="provenance" value="demo" />) or any node. */
  provenance?: React.ReactNode;
  /** Optional drill-down. When set, the card is interactive (hover lift). */
  onClick?: () => void;
  className?: string;
}

/** Exported for the regression net (jsdom strips color var() from serialized style). */
export function trendInk(direction: KPITrend['direction']): string {
  if (direction === 'up') return 'var(--sem-success-ink)';
  if (direction === 'down') return 'var(--sem-data-negative-ink)'; // amber, NOT red
  return 'var(--sem-neutral-estimate-ink)';
}

function trendGlyph(direction: KPITrend['direction']): string {
  // Unicode escapes keep the SOURCE ASCII (DRIFT-44) while rendering the glyph at runtime.
  if (direction === 'up') return '\u25B2'; // up triangle
  if (direction === 'down') return '\u25BC'; // down triangle
  return '\u2014'; // em-dash
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  trend,
  accent = 'var(--sem-cta)',
  icon,
  provenance,
  onClick,
  className = '',
}) => {
  const interactive = typeof onClick === 'function';
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick!(); } : undefined}
      className={`ds-kpi-card glass-panel ${interactive ? 'ds-kpi-interactive' : ''} ${className}`}
      style={{
        position: 'relative',
        padding: 'var(--space-card-pad)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-raised)',
        borderLeft: `3px solid ${accent}`,
        cursor: interactive ? 'pointer' : 'default',
        transition: `box-shadow var(--motion-fast) var(--motion-ease-enter)`,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 8 }}>
        <span style={{ color: 'var(--sem-chart-tick)', fontSize: 12, fontWeight: 400 }}>{label}</span>
        {icon ? <span aria-hidden style={{ color: accent }}>{icon}</span> : null}
      </div>
      <div className="flex items-baseline" style={{ gap: 4 }}>
        <span className="font-data" style={{ color: 'var(--sem-cta)', fontSize: 28, fontWeight: 500, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}>
          {value}
        </span>
        {unit ? <span style={{ color: 'var(--sem-chart-tick)', fontSize: 13 }}>{unit}</span> : null}
      </div>
      {(trend || provenance) ? (
        <div className="flex items-center justify-between" style={{ marginTop: 8, gap: 8 }}>
          {trend ? (
            <span style={{ color: trendInk(trend.direction), fontSize: 12, fontWeight: 500 }}>
              {trendGlyph(trend.direction)} {trend.value}
            </span>
          ) : <span />}
          {provenance ?? null}
        </div>
      ) : null}
    </div>
  );
};

export default KPICard;
