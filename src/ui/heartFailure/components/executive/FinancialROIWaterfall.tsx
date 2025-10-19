import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface WaterfallItem {
  category: string;
  value: number;
  description: string;
  opportunities: number;
  avgPerPatient: number;
}

const FinancialROIWaterfall: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data - will be replaced with real API data
  const waterfallData: WaterfallItem[] = [
    {
      category: 'GDMT Optimization',
      value: 8900000,
      description: 'ARNi, SGLT2i, MRA optimization opportunities',
      opportunities: 387,
      avgPerPatient: 23000,
    },
    {
      category: 'Device Therapy',
      value: 6400000,
      description: 'CRT, ICD, CardioMEMS eligible patients',
      opportunities: 142,
      avgPerPatient: 45000,
    },
    {
      category: 'Specialty Phenotypes',
      value: 12800000,
      description: 'ATTR, Fabry, HCM screening & treatment',
      opportunities: 156,
      avgPerPatient: 82000,
    },
    {
      category: 'IV Iron Therapy',
      value: 2100000,
      description: 'Iron deficiency correction',
      opportunities: 267,
      avgPerPatient: 7800,
    },
    {
      category: 'Advanced HF',
      value: 4200000,
      description: 'LVAD, transplant evaluation',
      opportunities: 23,
      avgPerPatient: 182000,
    },
  ];

  const totalOpportunity = waterfallData.reduce((sum, item) => sum + item.value, 0);
  const totalPatients = waterfallData.reduce((sum, item) => sum + item.opportunities, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getBarWidth = (value: number) => {
    return (value / totalOpportunity) * 100;
  };

  return (
    <div className="retina-card p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Revenue Opportunity Waterfall
          </h2>
          <p className="text-steel-600">
            Annual revenue opportunity by intervention category
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Total Opportunity</div>
          <div className="text-4xl font-bold text-steel-700 font-sf">
            {formatCurrency(totalOpportunity)}
          </div>
          <div className="text-sm text-steel-600 mt-1">
            {totalPatients.toLocaleString()} patients
          </div>
        </div>
      </div>

      {/* Waterfall Bars */}
      <div className="space-y-4 mb-8">
        {waterfallData.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-steel-800">
                  {item.category}
                </div>
                <div className="text-xs text-steel-500">
                  {item.opportunities} opportunities
                </div>
              </div>
              <div className="text-sm font-bold text-steel-900">
                {formatCurrency(item.value)}
              </div>
            </div>

            <div
              className="relative h-12 bg-steel-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 group-hover:shadow-retina-2"
              onClick={() => setSelectedCategory(
                selectedCategory === item.category ? null : item.category
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-medical-blue-400 to-medical-blue-500 flex items-center px-4 transition-all duration-500"
                style={{ width: `${getBarWidth(item.value)}%` }}
              >
                <span className="text-sm font-semibold text-white">
                  {((item.value / totalOpportunity) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedCategory === item.category && (
              <div className="mt-3 p-4 bg-medical-blue-50/50 rounded-lg border border-medical-blue-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-steel-600 mb-1">Description</div>
                    <div className="text-sm text-steel-800">{item.description}</div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-600 mb-1">
                      Avg per Patient
                    </div>
                    <div className="text-lg font-bold text-medical-green-600">
                      {formatCurrency(item.avgPerPatient)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-steel-600 mb-1">Patients</div>
                    <div className="text-lg font-bold text-steel-900">
                      {item.opportunities}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-steel-200">
        <div className="p-4 rounded-lg bg-medical-green-50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-medical-green-600" />
            <div className="text-xs font-semibold text-medical-green-700 uppercase">
              High Priority
            </div>
          </div>
          <div className="text-2xl font-bold text-medical-green-900">
            {formatCurrency(waterfallData[2].value)}
          </div>
          <div className="text-xs text-medical-green-700 mt-1">
            Specialty Phenotypes
          </div>
        </div>

        <div className="p-4 rounded-lg bg-medical-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-medical-blue-600" />
            <div className="text-xs font-semibold text-medical-blue-700 uppercase">
              Quick Wins
            </div>
          </div>
          <div className="text-2xl font-bold text-medical-blue-900">
            {formatCurrency(waterfallData[0].value)}
          </div>
          <div className="text-xs text-medical-blue-700 mt-1">GDMT Optimization</div>
        </div>

        <div className="p-4 rounded-lg bg-medical-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-medical-amber-600" />
            <div className="text-xs font-semibold text-medical-amber-700 uppercase">
              Avg ROI
            </div>
          </div>
          <div className="text-2xl font-bold text-medical-amber-900">
            {formatCurrency(totalOpportunity / totalPatients)}
          </div>
          <div className="text-xs text-medical-amber-700 mt-1">Per Patient</div>
        </div>
      </div>
    </div>
  );
};

export default FinancialROIWaterfall;