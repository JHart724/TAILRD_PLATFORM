import React from 'react';
import { getOrdinalSuffix, toFixed } from '../utils/formatters';

interface DotScaleProps {
  label: string;
  value: number;
  min: number;
  max: number;
  nationalAvg: number;
  unit?: string;
  lowerIsBetter?: boolean;
  className?: string;
}

const DotScale: React.FC<DotScaleProps> = ({
  label,
  value,
  min,
  max,
  nationalAvg,
  unit = '',
  lowerIsBetter = false,
  className = '',
}) => {
  const range = max - min;
  const valuePercent = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const avgPercent = Math.max(0, Math.min(100, ((nationalAvg - min) / range) * 100));

  const isBetter = lowerIsBetter ? value < nationalAvg : value > nationalAvg;

  // Glow colors: emerald for better, amber for worse
  const dotColor = isBetter ? '#4ADE80' : '#FBBF24';
  const dotGlow  = isBetter
    ? '0 0 6px rgba(74, 222, 128, 0.5), 0 0 12px rgba(74, 222, 128, 0.2)'
    : '0 0 6px rgba(251, 191, 36, 0.5), 0 0 12px rgba(251, 191, 36, 0.2)';

  const formatDisplayValue = (v: number): string => {
    if (unit === '$') return `$${v.toLocaleString()}`;
    if (unit === '%') return `${toFixed(v, 1)}%`;
    if (unit === 'days') return `${toFixed(v, 1)}d`;
    if (unit === 'ratio') return toFixed(v, 2);
    if (unit === 'percentile') {
      const rounded = Math.round(v);
      return `${rounded}${getOrdinalSuffix(rounded)}`;
    }
    return toFixed(v, 1);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-body font-medium text-titanium-500">{label}</span>
        <span className="text-sm font-data font-semibold text-titanium-800">
          {formatDisplayValue(value)}
        </span>
      </div>

      {/* Scale bar */}
      <div className="relative h-6">
        {/* Background track */}
        <div
          className="absolute top-2.5 left-0 right-0 h-1.5 rounded-full"
          style={{ background: 'rgba(200, 212, 220, 0.30)' }}
        />

        {/* National average marker (dashed line) */}
        <div
          className="absolute top-0 w-px h-6"
          style={{
            left: `${avgPercent}%`,
            borderLeft: '2px dashed rgba(141, 150, 168, 0.4)',
          }}
        >
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-chrome-500 font-body whitespace-nowrap">
            Natl Avg
          </span>
        </div>

        {/* Value dot (glowing) */}
        <div
          className="absolute top-1 w-4 h-4 rounded-full transform -translate-x-1/2 transition-all duration-500"
          style={{
            left: `${valuePercent}%`,
            background: dotColor,
            boxShadow: dotGlow,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-[10px] text-chrome-500 font-body mt-3">
        <span>{formatDisplayValue(min)}</span>
        <span>{formatDisplayValue(max)}</span>
      </div>
    </div>
  );
};

export default DotScale;
