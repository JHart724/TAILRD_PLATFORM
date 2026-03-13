import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowUpDown, Download } from 'lucide-react';

export interface SummaryMetric {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  colorScheme?: 'porsche' | 'green' | 'amber' | 'crimson' | 'violet' | 'teal' | 'titanium';
}

export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  format?: 'money' | 'percent' | 'number' | 'text';
}

export interface BaseDetailModalProps<T extends Record<string, any>> {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  summaryMetrics?: SummaryMetric[];
  chartSections?: React.ReactNode[];
  tableTitle?: string;
  tableData?: T[];
  columns?: ColumnConfig<T>[];
  maxTableRows?: number;
  customContent?: React.ReactNode;
  onClose: () => void;
  onExport?: () => void;
  className?: string;
}

const colorSchemes = {
  porsche:  { bg: 'bg-porsche-50',  border: 'border-porsche-200',  text: 'text-porsche-900',  sub: 'text-porsche-700',  icon: 'text-porsche-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', sub: 'text-green-700', icon: 'text-green-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', sub: 'text-amber-700', icon: 'text-amber-600' },
  crimson:  { bg: 'bg-crimson-50',  border: 'border-crimson-200',  text: 'text-crimson-900',  sub: 'text-crimson-700',  icon: 'text-crimson-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', sub: 'text-violet-700', icon: 'text-violet-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', sub: 'text-teal-700', icon: 'text-teal-600' },
  titanium: { bg: 'bg-titanium-50', border: 'border-titanium-200', text: 'text-titanium-900', sub: 'text-titanium-700', icon: 'text-titanium-600' },
};

export const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
};

export const formatPercent = (value: number, showSign = false): string => {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

function BaseDetailModal<T extends Record<string, any>>({
  title, subtitle, description, icon, summaryMetrics, chartSections,
  tableTitle, tableData, columns, maxTableRows = 10, customContent,
  onClose, onExport, className = '',
}: BaseDetailModalProps<T>) {
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSort = (field: keyof T) => {
 if (field === sortField) {
 setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDir('desc');
 }
  };

  const sortedData = tableData ? [...tableData].sort((a, b) => {
 if (!sortField) return 0;
 const aVal = a[sortField];
 const bVal = b[sortField];
 const mult = sortDir === 'asc' ? 1 : -1;
 if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * mult;
 return ((aVal as number) - (bVal as number)) * mult;
  }) : [];

  const formatCell = (value: any, format?: string) => {
 if (format === 'money') return formatMoney(value as number);
 if (format === 'percent') return formatPercent(value as number);
 if (format === 'number')  return (value as number).toLocaleString();
 return String(value ?? '');
  };

  return (
 <div className="fixed inset-0 bg-[rgba(13,38,64,0.50)] flex items-center justify-center z-50" onClick={onClose}>
 <div
 className={`bg-white rounded-2xl shadow-chrome-elevated border border-titanium-200 max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex justify-between items-start px-6 py-4 border-b border-titanium-200 bg-chrome-50">
 <div className="flex items-center">
 {icon && <span className="mr-3 text-chrome-600">{icon}</span>}
 <div>
 <h2 className="text-2xl font-body font-semibold text-titanium-900">{title}</h2>
 {subtitle && <p className="text-lg font-body text-titanium-700 mt-1">{subtitle}</p>}
 {description && <p className="text-sm font-body text-titanium-500 mt-1">{description}</p>}
 </div>
 </div>
 <div className="flex items-center gap-2">
 {onExport && (
 <button onClick={onExport} className="p-2 rounded-lg text-titanium-400 hover:text-titanium-600 hover:bg-titanium-100 transition-colors ease-chrome" title="Export">
 <Download className="w-5 h-5" />
 </button>
 )}
 <button onClick={onClose} className="p-2 rounded-lg text-titanium-400 hover:text-titanium-600 hover:bg-titanium-100 transition-colors ease-chrome">
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="px-6 py-5">
 {summaryMetrics && summaryMetrics.length > 0 && (
 <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(summaryMetrics.length, 4)} gap-6 mb-8`}>
 {summaryMetrics.map((metric, i) => {
 const scheme = colorSchemes[metric.colorScheme || 'porsche'];
 return (
 <div key={i} className={`${scheme.bg} rounded-xl p-6 border ${scheme.border} shadow-chrome-card`}>
 <div className="flex items-center mb-4">
 {metric.icon && <span className={`mr-3 ${scheme.icon}`}>{metric.icon}</span>}
 <div className={`text-lg font-body font-semibold ${scheme.text}`}>{metric.label}</div>
 </div>
 <div className={`text-3xl font-data font-bold ${scheme.text}`}>{metric.value}</div>
 {metric.subtitle && <div className={`text-sm font-body ${scheme.sub} mt-1`}>{metric.subtitle}</div>}
 </div>
 );
 })}
 </div>
 )}

 {chartSections && chartSections.length > 0 && (
 <div className={`grid grid-cols-1 ${chartSections.length > 1 ? 'lg:grid-cols-2' : ''} gap-8 mb-8`}>
 {chartSections.map((section, i) => (
 <div key={i} className="bg-white rounded-xl p-6 border border-titanium-200 shadow-chrome-card">{section}</div>
 ))}
 </div>
 )}

 {customContent}

 {tableData && columns && tableData.length > 0 && (
 <div className="bg-white rounded-xl p-6 border border-titanium-200 shadow-chrome-card">
 {tableTitle && <h3 className="text-xl font-body font-semibold text-titanium-900 mb-6">{tableTitle}</h3>}
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="text-left text-sm text-titanium-600 border-b border-titanium-300">
 {columns.map(col => (
 <th key={String(col.key)}
 className={`pb-3 font-body font-medium ${col.align === 'right' ? 'text-right' : ''} ${col.sortable !== false ? 'cursor-pointer hover:text-titanium-800' : ''}`}
 onClick={() => col.sortable !== false && handleSort(col.key)}
 >
 <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
 {col.label}
 {col.sortable !== false && <ArrowUpDown className="w-4 h-4 ml-1" />}
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="text-sm font-body">
 {sortedData.slice(0, maxTableRows).map((row, rowIdx) => (
 <tr key={rowIdx} className="border-b border-titanium-200 hover:bg-chrome-50 transition-colors ease-chrome">
 {columns.map(col => (
 <td key={String(col.key)}
 className={`py-3 ${col.align === 'right' ? 'text-right' : ''} font-medium text-titanium-900`}
 >
 {col.render ? col.render(row[col.key], row) : formatCell(row[col.key], col.format)}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 <div className="flex justify-end mt-8 pt-6 border-t border-titanium-200">
 <button onClick={onClose} className="px-6 py-3 font-body font-medium text-titanium-600 bg-titanium-100 rounded-lg hover:bg-titanium-200 transition-colors ease-chrome">
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
  );
}

export default BaseDetailModal;
