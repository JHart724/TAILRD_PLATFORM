/**
 * Badge - the ONE canonical badge/pill (UI_CANON section 3.2).
 * Variants grouped by PURPOSE via a `kind` prop: provenance, status, severity.
 * Color/shape derive from kind+value (the --sem-* tokens), not per-call className.
 *
 * v2.0 UI foundation (gate-zero). The ~906 hand-rolled rounded-full pills are NOT migrated
 * here (section 17.3); this builds the target. The legacy `variant` API (estimate/verified/
 * locked/premium) is PRESERVED for the existing importers; the canonical path is `kind`+`value`.
 */
import React from 'react';
import { Lock, Check, BarChart3, Star } from 'lucide-react';

export type BadgeKind = 'provenance' | 'status' | 'severity';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type StatusValue = 'on-target' | 'live' | 'auto-detected' | 'beta' | 'info';
export type ProvenanceValue = 'estimate' | 'verified' | 'demo';
export type LegacyVariant = 'estimate' | 'verified' | 'locked' | 'premium';

export interface BadgeProps {
  /** Canonical API: the purpose group. When set, color derives from kind+value. */
  kind?: BadgeKind;
  /** Canonical API: the value within the kind (severity level, status, provenance). */
  value?: Severity | StatusValue | ProvenanceValue | string;
  /** Legacy API (preserved for existing importers): provenance-style variant. */
  variant?: LegacyVariant;
  label?: string;
  className?: string;
}

interface Style { bg: string; text: string; border: string; }

/** Legacy provenance variants (preserved verbatim so existing importers do not regress). */
const LEGACY: Record<LegacyVariant, Style & { icon: React.ComponentType<{ className?: string }>; defaultLabel: string }> = {
  estimate: { bg: '#e8eef3', text: '#2C4A60', border: '#C8D4DC', icon: BarChart3, defaultLabel: 'CMS Estimate' },
  verified: { bg: 'rgba(44, 74, 96, 0.08)', text: '#2C4A60', border: 'rgba(44, 74, 96, 0.15)', icon: Check, defaultLabel: 'Verified' },
  locked: { bg: 'rgba(200, 212, 220, 0.20)', text: '#636D80', border: 'rgba(200, 212, 220, 0.40)', icon: Lock, defaultLabel: 'Premium' },
  premium: { bg: 'rgba(44, 74, 96, 0.08)', text: '#2C4A60', border: 'rgba(44, 74, 96, 0.15)', icon: Star, defaultLabel: 'Premium' },
};

const SEVERITY: Record<Severity, Style> = {
  critical: { bg: 'var(--sem-critical-tint-bg)', text: 'var(--sem-critical)', border: 'var(--sem-critical)' },
  high: { bg: 'var(--sem-warning-bg)', text: 'var(--sem-warning-ink)', border: 'var(--sem-warning-ink)' },
  medium: { bg: 'var(--sem-neutral-estimate-bg)', text: 'var(--sem-neutral-estimate-ink)', border: 'var(--sem-neutral-estimate-ink)' },
  low: { bg: 'var(--sem-success-bg)', text: 'var(--sem-success-ink)', border: 'var(--sem-success-ink)' },
};

const STATUS: Record<StatusValue, Style> = {
  'on-target': { bg: 'var(--sem-success-bg)', text: 'var(--sem-success-ink)', border: 'var(--sem-success-ink)' },
  live: { bg: 'var(--sem-provenance-bg)', text: 'var(--sem-provenance-ink)', border: 'var(--sem-provenance-ink)' },
  'auto-detected': { bg: 'var(--sem-provenance-bg)', text: 'var(--sem-provenance-ink)', border: 'var(--sem-provenance-ink)' },
  beta: { bg: 'var(--sem-neutral-estimate-bg)', text: 'var(--sem-neutral-estimate-ink)', border: 'var(--sem-neutral-estimate-ink)' },
  info: { bg: 'var(--sem-provenance-bg)', text: 'var(--sem-provenance-ink)', border: 'var(--sem-provenance-ink)' },
};

const PROVENANCE: Record<string, Style> = {
  estimate: { bg: 'var(--sem-provenance-bg)', text: 'var(--sem-provenance-ink)', border: 'var(--sem-provenance-ink)' },
  demo: { bg: 'var(--sem-provenance-bg)', text: 'var(--sem-provenance-ink)', border: 'var(--sem-provenance-ink)' },
  verified: { bg: 'var(--sem-success-bg)', text: 'var(--sem-success-ink)', border: 'var(--sem-success-ink)' },
};

/** Exported for the regression net (jsdom strips color var() from serialized style). */
export function canonicalStyle(kind: BadgeKind, value?: string): Style {
  const fallback: Style = { bg: 'var(--sem-neutral-estimate-bg)', text: 'var(--sem-neutral-estimate-ink)', border: 'var(--sem-neutral-estimate-ink)' };
  if (kind === 'severity') return SEVERITY[(value as Severity)] ?? fallback;
  if (kind === 'status') return STATUS[(value as StatusValue)] ?? fallback;
  return PROVENANCE[value ?? ''] ?? fallback;
}

const Badge: React.FC<BadgeProps> = ({ kind, value, variant, label, className = '' }) => {
  const base = `inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium font-body ${className}`;

  // Canonical path: kind + value.
  if (kind) {
    const s = canonicalStyle(kind, value);
    return (
      <span
        className={base}
        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-control)' }}
      >
        {label ?? value ?? ''}
      </span>
    );
  }

  // Legacy provenance path (preserved).
  const v = variant ?? 'estimate';
  const { bg, text, border, icon: Icon, defaultLabel } = LEGACY[v];
  return (
    <span
      className={`${base} rounded-full`}
      style={{ background: bg, color: text, border: `1px solid ${border}` }}
    >
      <Icon className="w-3 h-3" />
      {label || defaultLabel}
    </span>
  );
};

export default Badge;
