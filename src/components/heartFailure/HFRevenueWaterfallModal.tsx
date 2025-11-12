import React from 'react';
import { X, Users, DollarSign, TrendingUp, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface HFRevenueWaterfallModalProps {
  category: 'GDMT' | 'Devices' | 'Phenotypes' | '340B';
  totalRevenue: number;
  patientCount: number;
  onClose: () => void;
}

interface SubcategoryData {
  name: string;
  revenue: number;
  patientCount: number;
  color: string;
  [key: string]: any;
}


const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const getSubcategoryData = (category: string): SubcategoryData[] => {
  const data: Record<string, SubcategoryData[]> = {
    GDMT: [
      { name: 'ARNI Optimization', revenue: 1000000, patientCount: 400, color: '#14B8A6' },
      { name: 'SGLT2i Initiation', revenue: 700000, patientCount: 280, color: '#0D9488' },
      { name: 'Beta Blocker Titration', revenue: 500000, patientCount: 250, color: '#0F766E' },
      { name: 'MRA Optimization', revenue: 200000, patientCount: 120, color: '#0E7490' }
    ],
    Devices: [
      { name: 'CRT-D Implantation', revenue: 1000000, patientCount: 40, color: '#8B5CF6' },
      { name: 'ICD Implantation', revenue: 600000, patientCount: 30, color: '#7C3AED' },
      { name: 'CardioMEMS', revenue: 200000, patientCount: 10, color: '#6D28D9' }
    ],
    Phenotypes: [
      { name: 'Cardiac Amyloidosis', revenue: 500000, patientCount: 15, color: '#3B82F6' },
      { name: 'Iron Deficiency', revenue: 400000, patientCount: 80, color: '#2563EB' },
      { name: 'Hypertrophic CM', revenue: 300000, patientCount: 10, color: '#1E40AF' }
    ],
    '340B': [
      { name: 'ARNI 340B Savings', revenue: 500000, patientCount: 280, color: '#10B981' },
      { name: 'SGLT2i 340B Savings', revenue: 300000, patientCount: 180, color: '#059669' }
    ]
  };
  return data[category] || [];
};


const getCategoryTitle = (category: string): string => {
  const titles: Record<string, string> = {
    GDMT: 'Guideline-Directed Medical Therapy',
    Devices: 'Device Therapy Implementation',
    Phenotypes: 'Phenotype-Specific Interventions',
    '340B': '340B Drug Pricing Program Savings'
  };
  return titles[category] || category;
};

const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    GDMT: 'Revenue from optimizing heart failure medications according to current guidelines',
    Devices: 'Revenue from cardiac device implantations and remote monitoring',
    Phenotypes: 'Revenue from identifying and treating specific heart failure phenotypes',
    '340B': 'Cost savings from 340B drug pricing program for eligible medications'
  };
  return descriptions[category] || '';
};

export const HFRevenueWaterfallModal: React.FC<HFRevenueWaterfallModalProps> = ({
  category,
  totalRevenue,
  patientCount,
  onClose
}) => {
  const subcategoryData = getSubcategoryData(category);
  const avgRevenuePerPatient = totalRevenue / patientCount;
  
  // Calculate actual total from subcategory data
  const calculatedTotal = subcategoryData.reduce((sum, item) => sum + item.revenue, 0);
  const displayTotal = calculatedTotal; // Use calculated total for display

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload[0]) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            Revenue: <span className="font-medium">{formatMoney(data.revenue)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Patients: <span className="font-medium">{data.patientCount}</span>
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getCategoryTitle(category)}
            </h2>
            <p className="text-gray-600 mt-1">{getCategoryDescription(category)}</p>
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-emerald-600 mr-1" />
                <span className="text-lg font-semibold text-gray-900">
                  {formatMoney(totalRevenue)}
                </span>
              </div>
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-1" />
                <span className="text-lg font-semibold text-gray-900">
                  {patientCount} patients
                </span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-purple-600 mr-1" />
                <span className="text-lg font-semibold text-gray-900">
                  {formatMoney(avgRevenuePerPatient)} avg/patient
                </span>
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
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-emerald-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-900 mb-1">
                {formatMoney(displayTotal)}
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
              <div className="text-sm text-blue-700">Patient Population</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {formatMoney(avgRevenuePerPatient)}
              </div>
              <div className="text-sm text-purple-700">Average per Patient</div>
            </div>
          </div>

          {/* Revenue Breakdown Chart */}
          <div className="bg-gray-50 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Revenue Breakdown by Intervention</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subcategoryData}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {subcategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderCustomTooltip} />
                  <Legend 
                    formatter={(value, entry: any) => (
                      <span style={{ color: entry.color }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {subcategoryData.map((item) => (
                <div key={item.name} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    {formatMoney(item.revenue)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.patientCount.toLocaleString()} patients • {((item.revenue / displayTotal) * 100).toFixed(1)}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end items-center gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium">
              <ExternalLink className="w-5 h-5 mr-2" />
              View Full Cohort ({patientCount.toLocaleString()} patients)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HFRevenueWaterfallModal;