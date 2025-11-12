import React from 'react';
import { X, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendDataPoint {
  month: string;
  value: number;
}

interface ComparisonData {
  top10: number;
  top25: number;
  top50: number;
  national: number;
}

interface HFBenchmarkDetailModalProps {
  benchmarkName: string;
  description: string;
  ourValue: number;
  nationalValue: number;
  percentile: number;
  unit: string;
  trendData: TrendDataPoint[];
  comparisonData: ComparisonData;
  onClose: () => void;
}

const getPercentileColor = (percentile: number): string => {
  if (percentile >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (percentile >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (percentile >= 50) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const getPercentileLabel = (percentile: number): string => {
  if (percentile >= 90) return 'Excellent';
  if (percentile >= 75) return 'Above Average';
  if (percentile >= 50) return 'Average';
  return 'Below Average';
};

const HFBenchmarkDetailModal: React.FC<HFBenchmarkDetailModalProps> = ({
  benchmarkName,
  description,
  ourValue,
  nationalValue,
  percentile,
  unit,
  trendData,
  comparisonData,
  onClose
}) => {
  const variance = ourValue - nationalValue;
  const isPositive = variance >= 0;

  // Prepare comparison chart data
  const comparisonChartData = [
    { category: 'Top 10%', value: comparisonData.top10, color: '#E5E7EB' },
    { category: 'Top 25%', value: comparisonData.top25, color: '#9CA3AF' },
    { category: 'Top 50%', value: comparisonData.top50, color: '#6B7280' },
    { category: 'National Avg', value: comparisonData.national, color: '#4B5563' },
    { category: 'Our Performance', value: ourValue, color: '#14B8A6' }
  ];

  const renderTrendTooltip = (props: any) => {
    if (props.active && props.payload && props.payload[0]) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.month}</p>
          <p className="text-sm text-teal-600">
            Value: <span className="font-medium">{data.value}{unit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderComparisonTooltip = (props: any) => {
    if (props.active && props.payload && props.payload[0]) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.category}</p>
          <p className="text-sm text-gray-600">
            Performance: <span className="font-medium">{data.value}{unit}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-teal-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {benchmarkName}
              </h2>
              <p className="text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Current Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-teal-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
              <div className="text-3xl font-bold text-teal-900 mb-1">
                {ourValue}{unit}
              </div>
              <div className="text-sm text-teal-700">Our Performance</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <BarChart3 className="w-8 h-8 text-gray-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {nationalValue}{unit}
              </div>
              <div className="text-sm text-gray-700">National Benchmark</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border mb-3 ${getPercentileColor(percentile)}`}>
                {percentile}th Percentile
              </div>
              <div className="text-lg font-semibold text-blue-900 mb-1">
                {getPercentileLabel(percentile)}
              </div>
              <div className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{variance}{unit} vs national
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 6-Month Trend */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">6-Month Performance Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#6B7280" />
                    <XAxis dataKey="month" stroke="#4B5563" />
                    <YAxis 
                      stroke="#4B5563"
                      tickFormatter={(value) => `${value}${unit}`}
                    />
                    <Tooltip content={renderTrendTooltip} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#14B8A6"
                      strokeWidth={3}
                      dot={{ r: 6, fill: "#14B8A6" }}
                      activeDot={{ r: 8, fill: "#0D9488" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Benchmark Comparison */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">National Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#6B7280" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#4B5563"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#4B5563"
                      tickFormatter={(value) => `${value}${unit}`}
                    />
                    <Tooltip content={renderComparisonTooltip} />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                    >
                      {comparisonChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">Performance Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Current Position</h5>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Our Value:</span>
                    <span className="font-medium">{ourValue}{unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>National Average:</span>
                    <span className="font-medium">{nationalValue}{unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Percentile Rank:</span>
                    <span className="font-medium">{percentile}th</span>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Benchmark Comparison</h5>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Top 10%:</span>
                    <span className="font-medium">{comparisonData.top10}{unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top 25%:</span>
                    <span className="font-medium">{comparisonData.top25}{unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top 50%:</span>
                    <span className="font-medium">{comparisonData.top50}{unit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HFBenchmarkDetailModal;