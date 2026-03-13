import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface WaterfallItem {
  category: string;
  value: number;
  description: string;
  opportunities: number;
  avgPerPatient: number;
}

const StructuralFinancialWaterfall: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Mock data - will be replaced with real API data
  const waterfallData: WaterfallItem[] = [
 {
 category: 'TAVR Procedures',
 value: 18400000,
 description: 'Transcatheter aortic valve replacement',
 opportunities: 187,
 avgPerPatient: 98400,
 },
 {
 category: 'MitraClip Intervention',
 value: 12800000,
 description: 'Percutaneous mitral valve repair',
 opportunities: 134,
 avgPerPatient: 95500,
 },
 {
 category: 'Surgical Valve Replacement',
 value: 15600000,
 description: 'Open heart valve surgery',
 opportunities: 89,
 avgPerPatient: 175300,
 },
 {
 category: 'LAA Occlusion',
 value: 6200000,
 description: 'Left atrial appendage closure devices',
 opportunities: 156,
 avgPerPatient: 39700,
 },
 {
 category: 'Complex Structural',
 value: 9800000,
 description: 'VSD/ASD closure, valve-in-valve procedures',
 opportunities: 67,
 avgPerPatient: 146300,
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
 Structural Heart Revenue Waterfall
 </h2>
 <p className="text-titanium-600">
 Annual revenue opportunity by structural heart intervention
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
 <div key={index} className="group">
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
 {((item.value / totalOpportunity) * 100).toFixed(1)}%
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
 <div className="text-lg font-bold text-medical-green-600">
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
 <div className="p-4 rounded-lg bg-medical-green-50">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-medical-green-600" />
 <div className="text-xs font-semibold text-medical-green-700 uppercase">
 High Priority
 </div>
 </div>
 <div className="text-2xl font-bold text-medical-green-900">
 {formatCurrency(waterfallData[0].value)}
 </div>
 <div className="text-xs text-medical-green-700 mt-1">
 TAVR Procedures
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
 {formatCurrency(waterfallData[1].value)}
 </div>
 <div className="text-xs text-porsche-700 mt-1">MitraClip</div>
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

export default StructuralFinancialWaterfall;