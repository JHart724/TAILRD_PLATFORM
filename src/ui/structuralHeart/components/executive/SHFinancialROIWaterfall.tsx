import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface SHWaterfallItem {
  category: string;
  value: number;
  description: string;
  opportunities: number;
  avgPerPatient: number;
}

const SHFinancialROIWaterfall: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data - will be replaced with real API data
  const waterfallData: SHWaterfallItem[] = [
 {
 category: 'Valve Therapy Optimization',
 value: 8900000,
 description: 'Medical Management, TAVR Referral, Diuretics optimization opportunities',
 opportunities: 387,
 avgPerPatient: 23000,
 },
 {
 category: 'Procedure Therapy',
 value: 6400000,
 description: 'TAVR, MitraClip, PFO Closure eligible patients',
 opportunities: 142,
 avgPerPatient: 45000,
 },
 {
 category: 'Specialty Phenotypes',
 value: 12800000,
 description: 'Bicuspid Valve, Degenerative MR, Functional TR screening & treatment',
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
 category: 'Advanced Valve Disease',
 value: 4200000,
 description: 'TriClip, transplant evaluation',
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
 <div className="metal-card p-8">
 {/* Header */}
 <div className="flex items-start justify-between mb-8">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 Revenue Opportunity Waterfall
 </h2>
 <p className="text-titanium-600">
 Annual revenue opportunity by intervention category
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Total Opportunity</div>
 <div className="text-4xl font-bold text-titanium-700 font-sf">
 {formatCurrency(totalOpportunity)}
 </div>
 <div className="text-sm text-titanium-600 mt-1">
 {totalPatients.toLocaleString()} patients
 </div>
 </div>
 </div>

 {/* Waterfall Bars */}
 <div className="space-y-4 mb-8">
 {waterfallData.map((item) => (
 <div key={item.category} className="group">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className="text-sm font-semibold text-titanium-800">
 {item.category}
 </div>
 <div className="text-xs text-titanium-500">
 {item.opportunities} opportunities
 </div>
 </div>
 <div className="text-sm font-bold text-titanium-900">
 {formatCurrency(item.value)}
 </div>
 </div>

 <div
 className="relative h-12 bg-titanium-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 group-hover:shadow-chrome-card-hover"
 onClick={() => setSelectedCategory(
 selectedCategory === item.category ? null : item.category
 )}
 >
 <div
 className="absolute inset-y-0 left-0 bg-gradient-to-r from-porsche-400 to-porsche-500 flex items-center px-4 transition-all duration-500"
 style={{ width: `${getBarWidth(item.value)}%` }}
 >
 <span className="text-sm font-semibold text-white">
 {toFixed((item.value / totalOpportunity) * 100, 1)}%
 </span>
 </div>
 </div>

 {/* Expanded Details */}
 {selectedCategory === item.category && (
 <div className="mt-3 p-4 bg-porsche-50/50 rounded-lg border border-porsche-200">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Description</div>
 <div className="text-sm text-titanium-800">{item.description}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">
 Avg per Patient
 </div>
 <div className="text-lg font-bold text-teal-700">
 {formatCurrency(item.avgPerPatient)}
 </div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Patients</div>
 <div className="text-lg font-bold text-titanium-900">
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
 <div className="grid grid-cols-3 gap-4 pt-6 border-t border-titanium-200">
 <div className="p-4 rounded-lg bg-chrome-50">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-teal-700" />
 <div className="text-xs font-semibold text-teal-700 uppercase">
 High Priority
 </div>
 </div>
 <div className="text-2xl font-bold text-teal-700">
 {formatCurrency(waterfallData[2].value)}
 </div>
 <div className="text-xs text-teal-700 mt-1">
 Specialty Phenotypes
 </div>
 </div>

 <div className="p-4 rounded-lg bg-porsche-50">
 <div className="flex items-center gap-2 mb-2">
 <DollarSign className="w-4 h-4 text-porsche-600" />
 <div className="text-xs font-semibold text-porsche-700 uppercase">
 Quick Wins
 </div>
 </div>
 <div className="text-2xl font-bold text-porsche-900">
 {formatCurrency(waterfallData[0].value)}
 </div>
 <div className="text-xs text-porsche-700 mt-1">Valve Therapy Optimization</div>
 </div>

 <div className="p-4 rounded-lg bg-chrome-50">
 <div className="flex items-center gap-2 mb-2">
 <AlertCircle className="w-4 h-4 text-gray-500" />
 <div className="text-xs font-semibold text-gray-500 uppercase">
 Avg ROI
 </div>
 </div>
 <div className="text-2xl font-bold text-gray-500">
 {formatCurrency(totalOpportunity / totalPatients)}
 </div>
 <div className="text-xs text-gray-500 mt-1">Per Patient</div>
 </div>
 </div>
 </div>
  );
};

export default SHFinancialROIWaterfall;