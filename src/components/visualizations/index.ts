// Base Components
export { default as BaseTable, type BaseTableColumn, type BaseTableProps, getScoreColor } from './BaseTable';
export { default as BaseChart, type ChartDataPoint, type BaseChartProps } from './BaseChart';

// Specialized Components
export { default as PatientRiskHeatmap } from './PatientRiskHeatmap';
export { default as CareTeamNetworkGraph } from './CareTeamNetworkGraph';

// Utility types and helpers
export type { BaseTableColumn as TableColumn } from './BaseTable';
export type { ChartDataPoint as ChartData } from './BaseChart';

// Common chart configurations
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981', 
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  medical: {
    blue: '#2563EB',
    green: '#059669',
    red: '#DC2626',
    amber: '#D97706',
    purple: '#7C3AED',
    indigo: '#4F46E5'
  }
};

export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 80,
  fair: 70,
  poor: 60
};

// Helper function for consistent color schemes
export const getChartColors = (count: number): string[] => {
  const colors = Object.values(CHART_COLORS.medical);
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

// Helper function for formatting healthcare metrics
export const formatHealthcareMetric = (value: number, type: 'currency' | 'percentage' | 'count' | 'ratio'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'count':
      return value.toLocaleString();
    case 'ratio':
      return `${value.toFixed(2)}:1`;
    default:
      return value.toString();
  }
};