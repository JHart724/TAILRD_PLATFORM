import React from 'react';

interface DataFreshnessProps {
  lastSyncedAt?: Date | string | null;
  source?: 'api' | 'demo' | 'unknown';
  className?: string;
}

export function DataFreshnessIndicator({ lastSyncedAt, source, className }: DataFreshnessProps) {
  if (source === 'demo') {
    return (
      <span className={`text-xs text-amber-500 font-medium ${className || ''}`}>
        Demo data — not from EHR
      </span>
    );
  }

  if (!lastSyncedAt) {
    return (
      <span className={`text-xs text-slate-400 ${className || ''}`}>
        Data sync time unavailable
      </span>
    );
  }

  const date = new Date(lastSyncedAt);
  const now = Date.now();
  const ageMs = now - date.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const isStale = ageHours > 24;

  const timeAgo = ageHours < 1
    ? `${Math.round(ageMs / 60000)}m ago`
    : ageHours < 24
    ? `${Math.round(ageHours)}h ago`
    : `${Math.round(ageHours / 24)}d ago`;

  return (
    <span className={`text-xs ${isStale ? 'text-amber-500' : 'text-emerald-600'} ${className || ''}`}>
      {isStale ? '⚠ ' : ''}
      Data as of {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      {' '}({timeAgo})
    </span>
  );
}

export default DataFreshnessIndicator;
