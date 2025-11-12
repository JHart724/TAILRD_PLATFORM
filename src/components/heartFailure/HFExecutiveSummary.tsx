import React, { useState } from 'react';
import { Users, DollarSign, Activity, TrendingUp, TrendingDown, Heart, Stethoscope, AlertCircle, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPIData {
  id: string;
  label: string;
  value: string;
  subtext: string;
  trend: number;
  icon: any;
  color: string;
  trendData: Array<{ month: string; value: number }>;
}

const kpiData: KPIData[] = [
  {
    id: 'total-patients',
    label: 'Total HF Patients',
    value: '2,847',
    subtext: '70% of diagnosed HF patients',
    trend: 10,
    icon: Users,
    color: 'blue',
    trendData: [
      { month: 'Jun', value: 2589 },
      { month: 'Jul', value: 2634 },
      { month: 'Aug', value: 2701 },
      { month: 'Sep', value: 2756 },
      { month: 'Oct', value: 2812 },
      { month: 'Nov', value: 2847 }
    ]
  },
  {
    id: 'revenue-opportunity',
    label: 'Total Revenue Opportunity',
    value: '$5.2M',
    subtext: 'Annual addressable',
    trend: 15,
    icon: DollarSign,
    color: 'green',
    trendData: [
      { month: 'Jun', value: 4.2 },
      { month: 'Jul', value: 4.5 },
      { month: 'Aug', value: 4.7 },
      { month: 'Sep', value: 4.9 },
      { month: 'Oct', value: 5.0 },
      { month: 'Nov', value: 5.2 }
    ]
  },
  {
    id: 'gdmt-rate',
    label: 'GDMT 4-Pillar Rate',
    value: '65%',
    subtext: '1,847 patients optimized',
    trend: 8,
    icon: Activity,
    color: 'teal',
    trendData: [
      { month: 'Jun', value: 57 },
      { month: 'Jul', value: 59 },
      { month: 'Aug', value: 61 },
      { month: 'Sep', value: 62 },
      { month: 'Oct', value: 64 },
      { month: 'Nov', value: 65 }
    ]
  },
  {
    id: 'at-risk',
    label: 'At-Risk Population',
    value: '892',
    subtext: '31% hospitalization risk',
    trend: -5,
    icon: AlertCircle,
    color: 'red',
    trendData: [
      { month: 'Jun', value: 945 },
      { month: 'Jul', value: 932 },
      { month: 'Aug', value: 918 },
      { month: 'Sep', value: 905 },
      { month: 'Oct', value: 898 },
      { month: 'Nov', value: 892 }
    ]
  },
  {
    id: 'captured-value',
    label: 'YTD Captured Value',
    value: '$1.4M',
    subtext: '27% of opportunity',
    trend: 12,
    icon: TrendingUp,
    color: 'green',
    trendData: [
      { month: 'Jun', value: 0.8 },
      { month: 'Jul', value: 0.95 },
      { month: 'Aug', value: 1.05 },
      { month: 'Sep', value: 1.15 },
      { month: 'Oct', value: 1.28 },
      { month: 'Nov', value: 1.4 }
    ]
  },
  {
    id: 'device-candidates',
    label: 'Device Therapy Candidates',
    value: '234',
    subtext: 'Eligible, not implanted',
    trend: 18,
    icon: Heart,
    color: 'orange',
    trendData: [
      { month: 'Jun', value: 198 },
      { month: 'Jul', value: 205 },
      { month: 'Aug', value: 212 },
      { month: 'Sep', value: 219 },
      { month: 'Oct', value: 227 },
      { month: 'Nov', value: 234 }
    ]
  }
];

export const HFExecutiveSummary: React.FC = () => {
  const [selectedKPI, setSelectedKPI] = useState<KPIData | null>(null);

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'text-blue-600', stroke: '#3B82F6' },
      green: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: 'text-emerald-600', stroke: '#10B981' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', icon: 'text-purple-600', stroke: '#8B5CF6' },
      red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: 'text-red-600', stroke: '#EF4444' },
      orange: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: 'text-amber-600', stroke: '#F59E0B' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', icon: 'text-teal-600', stroke: '#14B8A6' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Stethoscope className="w-6 h-6 mr-2 text-blue-600" />
          Heart Failure Executive Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            const colors = getColorClasses(kpi.color);
            const TrendIcon = kpi.trend >= 0 ? TrendingUp : TrendingDown;

            return (
              <button
                key={kpi.id}
                onClick={() => setSelectedKPI(kpi)}
                className={`${colors.bg} ${colors.border} border-2 rounded-lg p-5 text-left hover:shadow-lg transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`${colors.icon} w-8 h-8`} />
                  <div className={`flex items-center text-sm font-semibold ${
                    kpi.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    <TrendIcon className="w-4 h-4 mr-1" />
                    {Math.abs(kpi.trend)}%
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{kpi.value}</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">{kpi.label}</div>
                <div className="text-xs text-gray-500">{kpi.subtext}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal with trend chart */}
      {selectedKPI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedKPI.label}</h2>
                <p className="text-gray-600">{selectedKPI.subtext}</p>
              </div>
              <button
                onClick={() => setSelectedKPI(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-4xl font-bold mb-2">{selectedKPI.value}</div>
              <div className={`flex items-center text-lg font-semibold ${
                selectedKPI.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {selectedKPI.trend >= 0 ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
                {Math.abs(selectedKPI.trend)}% vs last quarter
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedKPI.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#6B7280" />
                  <XAxis dataKey="month" stroke="#4B5563" />
                  <YAxis stroke="#4B5563" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={getColorClasses(selectedKPI.color).stroke}
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    name={selectedKPI.label}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Key Insights</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 6-month trend shows consistent {selectedKPI.trend >= 0 ? 'growth' : 'improvement'}</li>
                <li>• Current trajectory exceeds national benchmarks</li>
                <li>• Projected to reach target by Q2 2026</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};