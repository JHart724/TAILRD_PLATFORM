import React from 'react';
import { moduleGlassClass } from './tokens';

type ModuleKey = 'hf' | 'ep' | 'structural' | 'coronary' | 'valvular' | 'peripheral';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Small-caps label rendered above the title in Chrome Blue */
  sectionLabel?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  /** Optional module key for tinted glass variant */
  moduleKey?: ModuleKey;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  sectionLabel,
  headerRight,
  children,
  className = '',
  noPadding = false,
  moduleKey,
}) => {
  // Use module-tinted glass if specified, otherwise default glass-panel
  const glassClass = moduleKey
    ? moduleGlassClass[moduleKey] || 'glass-panel'
    : 'glass-panel';

  return (
    <div className={`${glassClass} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 card-header-zone relative z-[2] ${sectionLabel ? 'border-b border-slate-200' : ''}`}>
        <div>
          {sectionLabel && (
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#2C4A60', letterSpacing: '0.08em' }}>
              {sectionLabel}
            </p>
          )}
          <h2 className="text-lg font-display font-bold" style={{ color: '#0A1828' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm font-body mt-0.5" style={{ color: '#3A5268' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {/* Content */}
      <div className={`relative z-[2] ${noPadding ? '' : 'p-6'}`}>{children}</div>
    </div>
  );
};

export default SectionCard;
