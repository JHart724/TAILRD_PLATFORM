import React from "react";

interface ProjectedVsRealizedChartProps {
  data: {
    months: string[];
    projected: number[];
    realized: number[];
  } | null;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const ProjectedVsRealizedChart: React.FC<ProjectedVsRealizedChartProps> = ({ data }) => {
  if (!data) return null;

  const maxValue = Math.max(...data.projected, ...data.realized);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-slate-600">Projected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500"></div>
            <span className="text-sm text-slate-600">Realized</span>
          </div>
        </div>
        <div className="text-sm text-slate-500">Year-to-Date Tracking</div>
      </div>

      <div className="relative h-80">
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {data.months.map((month, idx) => {
            const projectedHeight = (data.projected[idx] / maxValue) * 100 + "%";
            const realizedHeight = (data.realized[idx] / maxValue) * 100 + "%";

            return (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex gap-1 items-end mb-2 h-64">
                  <div
                    className="flex-1 bg-blue-500 rounded-t transition-all duration-500 hover:opacity-80 group relative"
                    style={{ height: projectedHeight }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {formatMoney(data.projected[idx])}
                    </div>
                  </div>
                  <div
                    className="flex-1 bg-emerald-500 rounded-t transition-all duration-500 hover:opacity-80 group relative"
                    style={{ height: realizedHeight }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {formatMoney(data.realized[idx])}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-2">{month}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-slate-500 mb-1">Total Projected</div>
          <div className="text-lg font-bold text-blue-600">{formatMoney(data.projected.reduce((sum, v) => sum + v, 0))}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Total Realized</div>
          <div className="text-lg font-bold text-emerald-600">{formatMoney(data.realized.reduce((sum, v) => sum + v, 0))}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Realization Rate</div>
          <div className="text-lg font-bold text-slate-700">
            {((data.realized.reduce((sum, v) => sum + v, 0) / data.projected.reduce((sum, v) => sum + v, 0)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectedVsRealizedChart;
