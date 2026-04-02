import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface GapCategory {
  name: string;
  patients: number;
  color: string;
}

export interface TopGap {
  name: string;
  patients: number;
  opportunity: string;
}

export interface GapIntelligenceData {
  categories: GapCategory[];
  topGaps: TopGap[];
  safetyAlert: string;
  totalGaps: number;
}

interface GapIntelligenceCardProps {
  data: GapIntelligenceData;
}

const GapIntelligenceCard: React.FC<GapIntelligenceCardProps> = ({ data }) => {
  const totalPatients = data.categories.reduce((sum, c) => sum + c.patients, 0);

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Clinical Gap Intelligence</h3>
            <p className="text-sm text-titanium-600">{data.totalGaps} auto-detected gaps across {totalPatients.toLocaleString()} patients</p>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-700 font-medium">Auto-detected</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gap Category Breakdown - PieChart */}
          <div>
            <h4 className="text-sm font-semibold text-titanium-700 mb-3">Gap Category Breakdown</h4>
            <div className="flex items-center gap-4">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      dataKey="patients"
                      nameKey="name"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {data.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} patients`, name]}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {data.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-titanium-700">{cat.name}</span>
                    </div>
                    <span className="font-medium text-titanium-900">{cat.patients.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 5 Gaps by Dollar Opportunity */}
          <div>
            <h4 className="text-sm font-semibold text-titanium-700 mb-3">Top Gaps by $ Opportunity</h4>
            <div className="space-y-2">
              {data.topGaps.map((gap, i) => (
                <div key={gap.name} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-titanium-100 text-titanium-600 flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-titanium-800 font-medium truncate">{gap.name}</div>
                    <div className="text-titanium-500">{gap.patients.toLocaleString()} patients</div>
                  </div>
                  <span className="font-bold text-teal-700 whitespace-nowrap">{gap.opportunity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Alert Summary */}
          <div>
            <h4 className="text-sm font-semibold text-titanium-700 mb-3">Safety Alert Summary</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-red-800">{data.safetyAlert}</div>
                  <p className="text-xs text-red-600 mt-1">Immediate clinical review recommended</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-titanium-400 mt-3 italic">Drill into Service Line view for patient-level detail</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GapIntelligenceCard;
