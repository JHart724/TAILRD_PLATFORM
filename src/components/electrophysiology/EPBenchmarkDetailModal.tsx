import React from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getOrdinalSuffix, roundTo, formatDelta, toFixed } from '../../utils/formatters';

interface EPBenchmarkDetailModalProps {
  benchmarkName: string;
  description: string;
  ourValue: number;
  nationalValue: number;
  unit: string;
  percentile: number;
  trendData: Array<{ month: string; value: number }>;
  comparisonData: {
 top10: number;
 top25: number;
 top50: number;
 national: number;
  };
  onClose: () => void;
}

const EPBenchmarkDetailModal: React.FC<EPBenchmarkDetailModalProps> = ({
  benchmarkName,
  description,
  ourValue,
  nationalValue,
  unit,
  percentile,
  trendData,
  comparisonData,
  onClose
}) => {
  const delta = roundTo(ourValue - nationalValue);
  const isPositiveTrend = delta > 0;
  const trendPercentage = Math.abs((delta / nationalValue) * 100);

  return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-start p-6 border-b border-gray-200">
 <div>
 <h2 className="text-2xl font-bold text-gray-900">{benchmarkName}</h2>
 <p className="text-gray-600 mt-1">{description}</p>
 <div className="flex items-center gap-6 mt-3">
 <div className="text-3xl font-bold text-titanium-900">
 {ourValue}{unit}
 </div>
 <div className={`flex items-center text-lg font-semibold ${
 isPositiveTrend ? 'text-[#2C4A60]' : 'text-red-600'
 }`}>
 {isPositiveTrend ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
 {formatDelta(delta, unit)} vs national ({toFixed(trendPercentage, 1)}%)
 </div>
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
 {/* Performance Summary */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
 <div className="bg-chrome-50 rounded-lg p-4 text-center">
 <div className="text-2xl font-bold text-chrome-900">{ourValue}{unit}</div>
 <div className="text-sm text-chrome-700">Your System</div>
 </div>
 <div className="bg-gray-50 rounded-lg p-4 text-center">
 <div className="text-2xl font-bold text-gray-900">{nationalValue}{unit}</div>
 <div className="text-sm text-gray-700">National Average</div>
 </div>
 <div className="bg-[#C8D4DC] rounded-lg p-4 text-center">
 <div className="text-2xl font-bold text-[#2C4A60]">{percentile}{getOrdinalSuffix(percentile)}</div>
 <div className="text-sm text-[#2C4A60]">Percentile</div>
 </div>
 <div className="bg-arterial-50 rounded-lg p-4 text-center">
 <div className="text-2xl font-bold text-arterial-900">{comparisonData.top10}{unit}</div>
 <div className="text-sm text-arterial-700">Top 10% Target</div>
 </div>
 </div>

 {/* Trend Chart */}
 <div className="mb-8">
 <h3 className="text-xl font-semibold text-gray-900 mb-4">6-Month Trend</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={trendData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
 <XAxis dataKey="month" stroke="#6B7280" />
 <YAxis stroke="#6B7280" />
 <Tooltip 
 formatter={(value: any) => [`${value}${unit}`, benchmarkName]}
 labelStyle={{ color: '#374151' }}
 contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
 />
 <Line
 type="monotone"
 dataKey="value"
 stroke="#3B82F6"
 strokeWidth={3}
 dot={{ r: 6, fill: '#3B82F6' }}
 activeDot={{ r: 8, fill: '#1D4ED8' }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Benchmark Comparison */}
 <div className="bg-gray-50 rounded-lg p-6">
 <h3 className="text-xl font-semibold text-gray-900 mb-4">National Benchmarks</h3>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-gray-700">Top 10%:</span>
 <span className="font-semibold">{comparisonData.top10}{unit}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-700">Top 25%:</span>
 <span className="font-semibold">{comparisonData.top25}{unit}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-700">Median (50%):</span>
 <span className="font-semibold">{comparisonData.top50}{unit}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-700">National Average:</span>
 <span className="font-semibold">{comparisonData.national}{unit}</span>
 </div>
 </div>
 </div>

 {/* Action Items */}
 <div className="mt-8 pt-6 border-t border-gray-200">
 <div className="flex justify-end">
 <button
 onClick={onClose}
 className="px-6 py-3 bg-chrome-600 text-white rounded-lg hover:bg-chrome-700 transition-colors font-medium"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPBenchmarkDetailModal;