import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | null | undefined;
  subvalue?: string;
  trend?: {
 direction: 'up' | 'down';
 value: string;
 label: string;
  };
  status?: 'optimal' | 'warning' | 'critical';
  icon?: React.ElementType;
  accentColor?: string;  // hex color override for accent bar, icon, value text
  accentBg?: string;     // hex background for the card
  accentBorder?: string; // hex border for the card
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subvalue,
  trend,
  status = 'optimal',
  icon: Icon,
  accentColor,
  accentBg,
  accentBorder,
}) => {
  const getAccentBarStyle = (): React.CSSProperties => {
 const colorMap: Record<string, string> = {
   optimal: '#1A4A2E',
   warning: '#8B6914',
   critical: '#7A1A2E',
 };
 const c = accentColor || colorMap[status] || '#2C4A60';
 return {
   position: 'absolute' as const,
   top: 0,
   left: 0,
   right: 0,
   height: '2px',
   borderRadius: '14px 14px 0 0',
   background: `linear-gradient(90deg, ${c}, ${c}20, transparent)`,
 };
  };

  const getWashStyle = (): React.CSSProperties => {
 const colorMap: Record<string, string> = {
   optimal: '26,74,46',
   warning: '139,105,20',
   critical: '122,26,46',
 };
 // Convert hex accentColor to rgb if provided
 let rgb = colorMap[status] || '44,74,96';
 if (accentColor) {
   const hex = accentColor.replace('#', '');
   const r = parseInt(hex.substring(0, 2), 16);
   const g = parseInt(hex.substring(2, 4), 16);
   const b = parseInt(hex.substring(4, 6), 16);
   rgb = `${r},${g},${b}`;
 }
 return {
   position: 'absolute' as const,
   top: 0,
   left: 0,
   right: 0,
   height: '55%',
   zIndex: 0,
   borderRadius: '14px',
   background: `linear-gradient(180deg, rgba(${rgb},0.03) 0%, transparent 100%)`,
 };
  };

  const getMicroRuleStyle = (): React.CSSProperties => {
 const colorMap: Record<string, string> = {
   optimal: '#1A4A2E',
   warning: '#8B6914',
   critical: '#7A1A2E',
 };
 const c = accentColor || colorMap[status] || '#2C4A60';
 return {
   width: '20px',
   height: '1.5px',
   borderRadius: '1px',
   margin: '7px 0 5px',
   background: `linear-gradient(90deg, ${c}, ${c}33)`,
 };
  };

  const getTrendColor = () => {
 if (trend?.direction === 'up') return 'kpi-delta-positive';
 return 'kpi-delta-negative';
  };

  const getStatusDescription = () => {
 switch (status) {
 case 'optimal':
 return 'Optimal performance';
 case 'warning':
 return 'Requires attention';
 case 'critical':
 return 'Critical issue';
 default:
 return 'Normal status';
 }
  };

  const getTrendDescription = () => {
 if (!trend) return '';
 const direction = trend.direction === 'up' ? 'increasing' : 'decreasing';
 return `Trend ${direction} by ${trend.value} ${trend.label}`;
  };

  const cardStyle: React.CSSProperties = {};
  if (accentBg) cardStyle.background = accentBg;
  if (accentBorder) cardStyle.borderColor = accentBorder;

  return (
 <div
 className="group relative glass-panel hover:-translate-y-px transition-all duration-300 ease-chrome"
 style={cardStyle}
 role="article"
 aria-labelledby={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
 aria-describedby={`kpi-desc-${label.replace(/\s+/g, '-').toLowerCase()}`}
 >
 {/* Top accent bar */}
 <div style={getAccentBarStyle()} />
 {/* Colored wash */}
 <div style={getWashStyle()} />

 <div className="p-6 relative z-[2]">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3
 id={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
 className="kpi-label font-body"
 >
 {label}
 </h3>
 <div style={getMicroRuleStyle()} />
 <div
 className="kpi-value"
 aria-label={`${label} value: ${value ?? 'No data'}`}
 style={accentColor ? { color: accentColor } : undefined}
 >
 {value ?? <span className="text-titanium-400 text-lg">--</span>}
 </div>
 {subvalue && (
 <div className="text-sm font-body mt-1" style={{ color: '#3A5268' }}>{subvalue}</div>
 )}
 </div>
 {Icon && (
 <div
 className="ml-4 p-3 rounded-xl transition-colors duration-300"
 style={accentColor ? {
   background: accentBg || 'rgba(143,168,188,0.08)',
   border: `1px solid ${accentBorder || 'rgba(175,205,225,0.18)'}`,
 } : {
   background: 'rgba(143,168,188,0.08)',
   border: '1px solid rgba(175,205,225,0.18)',
 }}
 aria-hidden="true"
 >
 <Icon className="w-6 h-6" style={{ color: accentColor || '#4A6880' }} />
 </div>
 )}
 </div>

 {trend && (
 <div
 className={`inline-flex items-center gap-1.5 ${getTrendColor()}`}
 aria-label={getTrendDescription()}
 >
 {trend.direction === 'up' ? (
 <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
 ) : (
 <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
 )}
 <span>{trend.value}</span>
 <span style={{ color: '#8FA8BC', fontWeight: 400 }} className="ml-0.5">{trend.label}</span>
 </div>
 )}

 <div
 id={`kpi-desc-${label.replace(/\s+/g, '-').toLowerCase()}`}
 className="sr-only"
 >
 {getStatusDescription()}. {getTrendDescription()}
 </div>
 </div>
 </div>
  );
};

export default KPICard;
