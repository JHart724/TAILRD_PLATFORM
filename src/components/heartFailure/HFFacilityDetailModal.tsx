import React from 'react';
import { X, Building2, MapPin, DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryBreakdown {
  category: string;
  revenue: number;
  [key: string]: any;
}

interface ProviderPerformance {
  name: string;
  patients: number;
  gdmtRate: number;
  revenueImpact: number;
}

interface HFFacilityDetailModalProps {
  facilityName: string;
  location: string;
  totalRevenue: number;
  patientCount: number;
  gdmtRate: number;
  captureRate: number;
  breakdown: CategoryBreakdown[];
  providers: ProviderPerformance[];
  onClose: () => void;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'GDMT': '#14B8A6',
    'Devices': '#8B5CF6', 
    'Phenotypes': '#3B82F6',
    '340B': '#10B981'
  };
  return colors[category] || '#6B7280';
};

const HFFacilityDetailModal: React.FC<HFFacilityDetailModalProps> = ({
  facilityName,
  location,
  totalRevenue,
  patientCount,
  gdmtRate,
  captureRate,
  breakdown,
  providers,
  onClose
}) => {
  const avgRevenuePerPatient = totalRevenue / patientCount;

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload[0]) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.category}</p>
          <p className="text-sm text-gray-600">
            Revenue: <span className="font-medium">{formatMoney(data.revenue)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Share: <span className="font-medium">{((data.revenue / totalRevenue) * 100).toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {facilityName}
              </h2>
              <div className="flex items-center mt-1 text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{location}</span>
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
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-emerald-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-900 mb-1">
                {formatMoney(totalRevenue)}
              </div>
              <div className="text-sm text-emerald-700">Total Revenue Opportunity</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {patientCount.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">HF Patient Population</div>
            </div>
            
            <div className="bg-teal-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-900 mb-1">
                {gdmtRate}%
              </div>
              <div className="text-sm text-teal-700">GDMT Optimization Rate</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {captureRate}%
              </div>
              <div className="text-sm text-purple-700">Opportunity Capture Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Breakdown */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue Opportunity by Category</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="revenue"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                    <Legend 
                      formatter={(value, entry: any) => (
                        <span style={{ color: getCategoryColor(value) }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {breakdown.map((item) => (
                  <div key={item.category} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: getCategoryColor(item.category) }}
                      />
                      <span className="text-gray-700">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatMoney(item.revenue)}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {((item.revenue / totalRevenue) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Performance */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Top Provider Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b border-gray-300">
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium text-right">Patients</th>
                      <th className="pb-3 font-medium text-right">GDMT Rate</th>
                      <th className="pb-3 font-medium text-right">Revenue Impact</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {providers.slice(0, 5).map((provider, index) => (
                      <tr key={provider.name} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                              index === 0 ? 'bg-emerald-500' : 
                              index === 1 ? 'bg-blue-500' : 
                              index === 2 ? 'bg-purple-500' : 'bg-gray-400'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900">{provider.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {provider.patients}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`font-medium ${
                            provider.gdmtRate >= 80 ? 'text-emerald-600' : 
                            provider.gdmtRate >= 70 ? 'text-blue-600' : 
                            provider.gdmtRate >= 60 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {provider.gdmtRate}%
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900">
                          {formatMoney(provider.revenueImpact)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Facility Performance Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-700">Total Providers:</span>
                      <span className="font-medium text-blue-900">{providers.length}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-700">Avg Revenue/Patient:</span>
                      <span className="font-medium text-blue-900">{formatMoney(avgRevenuePerPatient)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-700">Top Performer:</span>
                      <span className="font-medium text-blue-900">{providers[0]?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-blue-700">Avg GDMT Rate:</span>
                      <span className="font-medium text-blue-900">{gdmtRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end pt-6 border-t border-gray-200">
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

export default HFFacilityDetailModal;