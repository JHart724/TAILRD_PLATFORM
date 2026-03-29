import { toFixed } from '../../utils/formatters';

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
  primary: '#2C4A60',
  secondary: '#4A6880',
  warning: '#6B7280',
  danger: '#EF4444',
  carmona: '#9B2438',
  cyan: '#C8D4DC',
  medical: {
 blue: '#2C4A60',
 green: '#4A6880',
 red: '#DC2626',
 amber: '#6B7280',
 carmona: '#7A1A2E',
 indigo: '#4A6880'
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
 return `${toFixed(value, 1)}%`;
 case 'count':
 return value.toLocaleString();
 case 'ratio':
 return `${toFixed(value, 2)}:1`;
 default:
 return value.toString();
  }
};