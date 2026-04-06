import React from "react";
import { toFixed } from '../../../utils/formatters';

interface EPEquityGapDashboardProps {
  data: {
 metric: string;
 segment: string;
 stratified: Array<{
 group: string;
 value: number;
 count: number;
 }>;
  } | null;
  segment: string;
}

const EPEquityGapDashboard: React.FC<EPEquityGapDashboardProps> = ({ data, segment }) => {
  if (!data || segment === "all_patients") {
 return (
 <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-lg">
 <div className="text-center text-titanium-500">
 Select an equity segment (Race, Ethnicity, etc.) to view stratified analysis
 </div>
 </div>
 );
  }

  const avgValue = data.stratified.reduce((sum, g) => sum + g.value, 0) / data.stratified.length;
  const maxValue = Math.max(...data.stratified.map((g) => g.value));

  return (
 <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-lg">
 <div className="mb-6">
 <div className="text-sm text-titanium-500 mb-1">{data.metric.toUpperCase()} by {segment}</div>
 <div className="text-2xl font-bold text-titanium-900">Average: {toFixed(avgValue, 1)}%</div>
 </div>

 <div className="space-y-4">
 {data.stratified.map((group) => {
 const percentage = (group.value / maxValue) * 100;
 const deltaFromAvg = group.value - avgValue;
 const isAboveAvg = deltaFromAvg > 0;

 return (
 <div key={group.group}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <span className="text-sm font-semibold text-titanium-700 min-w-24">{group.group}</span>
 <span className="text-xs text-titanium-500">n={group.count}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-titanium-900">{toFixed(group.value, 1)}%</span>
 <span className={`text-xs font-bold ${isAboveAvg ? "text-teal-700" : "text-arterial-600"}`}>
 {isAboveAvg ? "+" : ""}{toFixed(deltaFromAvg, 1)}
 </span>
 </div>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-3 overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-500 ${isAboveAvg ? "bg-chrome-50" : "bg-chrome-50"}`} style={{ width: `${percentage}%` }} />
 </div>
 </div>
 );
 })}
 </div>

 <div className="mt-6 pt-6 border-t border-titanium-200">
 <div className="text-xs text-titanium-500 text-center">
 Equity gaps require targeted interventions for below-average groups
 </div>
 </div>
 </div>
  );
};

export default EPEquityGapDashboard;