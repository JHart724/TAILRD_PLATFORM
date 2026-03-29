import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface WaterfallItem {
  category: string;
  value: number;
  description: string;
  opportunities: number;
  avgPerPatient: number;
}

const PADFinancialWaterfall: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data - will be replaced with real API data
  const waterfallData: WaterfallItem[] = [
 {
 category: 'Endovascular Intervention',
 value: 9800000,
 description: 'Angioplasty, stenting, atherectomy procedures',
 opportunities: 298,
 avgPerPatient: 32900,
 },
 {
 category: 'Surgical Revascularization',
 value: 7600000,
 description: 'Bypass surgery for complex PAD',
 opportunities: 89,
 avgPerPatient: 85400,
 },
 {
 category: 'Medical Management',
 value: 3200000,
 description: 'Antiplatelet therapy, statin optimization',
 opportunities: 675,
 avgPerPatient: 4700,
 },
 {
 category: 'Wound Care & Amputation Prevention',
 value: 5400000,
 description: 'Diabetic foot care, revascularization',
 opportunities: 234,
 avgPerPatient: 23100,
 },
 {
 category: 'Critical Limb Ischemia',
 value: 11200000,
 description: 'Limb salvage procedures and interventions',
 opportunities: 156,
 avgPerPatient: 71800,
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
 PAD Revenue Opportunity Waterfall
 </h2>
 <p className="text-titanium-600">
 Annual revenue opportunity by peripheral vascular intervention
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
 {waterfallData.map((item, index) => (
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
 <div className="text-lg font-bold text-[#2C4A60]">
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
 <div className="p-4 rounded-lg bg-[#F0F5FA]">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-[#2C4A60]" />
 <div className="text-xs font-semibold text-[#2C4A60] uppercase">
 High Priority
 </div>
 </div>
 <div className="text-2xl font-bold text-[#2C4A60]">
 {formatCurrency(waterfallData[4].value)}
 </div>
 <div className="text-xs text-[#2C4A60] mt-1">
 Critical Limb Ischemia
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
 <div className="text-xs text-porsche-700 mt-1">Endovascular</div>
 </div>

 <div className="p-4 rounded-lg bg-[#F0F5FA]">
 <div className="flex items-center gap-2 mb-2">
 <AlertCircle className="w-4 h-4 text-[#6B7280]" />
 <div className="text-xs font-semibold text-[#6B7280] uppercase">
 Avg ROI
 </div>
 </div>
 <div className="text-2xl font-bold text-[#6B7280]">
 {formatCurrency(totalOpportunity / totalPatients)}
 </div>
 <div className="text-xs text-[#6B7280] mt-1">Per Patient</div>
 </div>
 </div>
 </div>
  );
};

export default PADFinancialWaterfall;