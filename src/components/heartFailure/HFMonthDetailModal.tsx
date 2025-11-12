import React from 'react';
import { X, TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryBreakdown {
  category: string;
  projected: number;
  realized: number;
}

interface HFMonthDetailModalProps {
  month: string;
  projected: number;
  realized: number;
  breakdown: CategoryBreakdown[];
  onClose: () => void;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};


const HFMonthDetailModal: React.FC<HFMonthDetailModalProps> = ({
  month,
  projected,
  realized,
  breakdown,
  onClose
}) => {
  const variance = realized - projected;
  const variancePercent = (variance / projected) * 100;
  const isPositive = variance >= 0;

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{data.category}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">Projected:</span> 
              <span className="font-medium ml-1">{formatMoney(data.projected)}</span>
            </p>
            <p className="text-sm">
              <span className="text-teal-600">Realized:</span> 
              <span className="font-medium ml-1">{formatMoney(data.realized)}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Variance:</span> 
              <span className={`font-medium ml-1 ${data.realized >= data.projected ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatMoney(data.realized - data.projected)}
              </span>
            </p>
          </div>
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
            <Calendar className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {month} 2025 Performance
              </h2>
              <p className="text-gray-600 mt-1">Heart Failure Revenue Analysis</p>
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
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {formatMoney(projected)}
              </div>
              <div className="text-sm text-blue-700">Projected Revenue</div>
            </div>
            
            <div className="bg-teal-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-900 mb-1">
                {formatMoney(realized)}
              </div>
              <div className="text-sm text-teal-700">Realized Revenue</div>
            </div>
            
            <div className={`rounded-lg p-6 text-center ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-center mb-3">
                {isPositive ? (
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold mb-1 ${isPositive ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatMoney(Math.abs(variance))}
              </div>
              <div className={`text-sm ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {isPositive ? 'Over Target' : 'Under Target'}
              </div>
              <div className={`text-xs mt-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatPercent(variancePercent)}
              </div>
            </div>
          </div>

          {/* Category Breakdown Chart */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue by Category</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdown}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#6B7280" />
                  <XAxis dataKey="category" stroke="#4B5563" />
                  <YAxis 
                    stroke="#4B5563"
                    tickFormatter={(value) => formatMoney(value)}
                  />
                  <Tooltip content={renderCustomTooltip} />
                  <Legend 
                    formatter={(value) => (
                      <span style={{ color: value === 'projected' ? '#3B82F6' : '#14B8A6' }}>
                        {value === 'projected' ? 'Projected' : 'Realized'}
                      </span>
                    )}
                  />
                  <Bar dataKey="projected" fill="#3B82F6" name="projected" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="realized" fill="#14B8A6" name="realized" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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

export default HFMonthDetailModal;