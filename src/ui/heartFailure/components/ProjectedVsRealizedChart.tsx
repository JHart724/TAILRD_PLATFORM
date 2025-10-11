import React from 'react';

const ProjectedVsRealizedChart: React.FC = () => {
  const monthlyData = [
    { month: 'Jan', projected: 850000, realized: 520000 },
    { month: 'Feb', projected: 920000, realized: 610000 },
    { month: 'Mar', projected: 1050000, realized: 720000 },
    { month: 'Apr', projected: 980000, realized: 680000 },
    { month: 'May', projected: 1120000, realized: 810000 },
    { month: 'Jun', projected: 1200000, realized: 890000 },
    { month: 'Jul', projected: 1150000, realized: 850000 },
    { month: 'Aug', projected: 1280000, realized: 950000 },
    { month: 'Sep', projected: 1350000, realized: 980000 },
    { month: 'Oct', projected: 1400000, realized: 1050000 }
  ];

  const maxValue = Math.max(...monthlyData.map(d => d.projected));
  const totalProjected = monthlyData.reduce((sum, d) => sum + d.projected, 0);
  const totalRealized = monthlyData.reduce((sum, d) => sum + d.realized, 0);
  const realizationRate = Math.round((totalRealized / totalProjected) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Projected vs Realized Revenue</h3>
          <p className="text-sm text-slate-600 mt-1">2025 Year-to-Date Performance</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-600">Realization Rate</div>
          <div className="text-2xl font-bold text-teal-700">{realizationRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-300">
          <div className="text-xs text-slate-700 font-medium mb-1">Total Projected</div>
          <div className="text-xl font-bold text-slate-900">
            ${(totalProjected / 1000000).toFixed(1)}M
          </div>
        </div>
        <div className="p-4 bg-teal-50 rounded-lg border border-teal-300">
          <div className="text-xs text-teal-800 font-medium mb-1">Total Realized</div>
          <div className="text-xl font-bold text-teal-900">
            ${(totalRealized / 1000000).toFixed(1)}M
          </div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-300">
          <div className="text-xs text-amber-800 font-medium mb-1">Gap</div>
          <div className="text-xl font-bold text-amber-900">
            ${((totalProjected - totalRealized) / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {monthlyData.map((data) => {
          const projectedWidth = (data.projected / maxValue) * 100;
          const realizedWidth = (data.realized / maxValue) * 100;

          return (
            <div key={data.month} className="flex items-center gap-3">
              <div className="w-12 text-xs font-medium text-slate-700">{data.month}</div>
              
              <div className="flex-1 relative">
                <div className="h-8 bg-slate-200 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-slate-300 rounded-lg transition-all"
                    style={{ width: `${projectedWidth}%` }}
                  />
                </div>
                
                <div className="absolute inset-0 h-8 overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 rounded-lg transition-all"
                    style={{ width: `${realizedWidth}%` }}
                  />
                </div>
              </div>

              <div className="w-32 text-right">
                <div className="text-xs font-medium text-slate-800">
                  ${(data.realized / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-slate-600">
                  / ${(data.projected / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-300 rounded"></div>
          <span className="text-sm text-slate-700">Projected Opportunity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-teal-600 rounded"></div>
          <span className="text-sm text-slate-700">Realized Revenue</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectedVsRealizedChart;
