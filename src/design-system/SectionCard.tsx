import React from 'react';
import { moduleGlassClass } from './tokens';

type ModuleKey = 'hf' | 'ep' | 'structural' | 'coronary' | 'valvular' | 'peripheral';

interface SectionCardProps {
  title: string;
  subtitle?: string;
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
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-lg font-display font-bold text-chrome-100">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-chrome-400 font-body mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {/* Divider */}
      <div className="border-t border-white/[0.06]" />
      {/* Content */}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};

export default SectionCard;
