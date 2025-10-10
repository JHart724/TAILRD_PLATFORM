import React from "react";

interface EquityGapDashboardProps {
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

const EquityGapDashboard: React.FC<EquityGapDashboardProps> = ({ data, segment }) => {
  if (!data || segment === "all_patients") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
        <div className="text-center text-slate-500">
          Select an equity segment (Race, Ethnicity, etc.) to view stratified analysis
        </div>
      </div>
    );
  }

  const avgValue = data.stratified.reduce((sum, g) => sum + g.value, 0) / data.stratified.length;
  const maxValue = Math.max(...data.stratified.map((g) => g.value));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
      <div className="mb-6">
        <div className="text-sm text-slate-500 mb-1">{data.metric.toUpperCase()} by {segment}</div>
        <div className="text-2xl font-bold text-slate-900">Average: {avgValue.toFixed(1)}%</div>
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
                  <span className="text-sm font-semibold text-slate-700 min-w-24">{group.group}</span>
                  <span className="text-xs text-slate-500">n={group.count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{group.value.toFixed(1)}%</span>
                  <span className={`text-xs font-bold ${isAboveAvg ? "text-emerald-600" : "text-rose-600"}`}>
                    {isAboveAvg ? "+" : ""}{deltaFromAvg.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isAboveAvg ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="text-xs text-slate-500 text-center">
          Equity gaps require targeted interventions for below-average groups
        </div>
      </div>
    </div>
  );
};

export default EquityGapDashboard;
