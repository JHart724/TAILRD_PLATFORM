import React, { useState } from 'react';
import { DollarSign, TrendingUp, Target, Info, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { toFixed } from '../../utils/formatters';

interface DRGDetail {
  code: string;
  description: string;
  volume: number;
  revenuePerCase: number;
  totalRevenue: number;
  avgLengthOfStay: number;
  margin: number;
}

interface FinancialModelAssumption {
  category: string;
  description: string;
  value: string;
  source: string;
}

interface FinancialSummaryData {
  totalValidatedBenefits: number;
  incrementalRevenue: number;
  marginImpact: number;
  roiPercentage: number;
  module: string;
  modelAssumptions: FinancialModelAssumption[];
  drgDetails: DRGDetail[];
}

interface FinancialSummaryProps {
  data: FinancialSummaryData;
  className?: string;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  data,
  className = ''
}) => {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showDRGDetails, setShowDRGDetails] = useState(false);

  const formatCurrency = (amount: number): string => {
 if (amount >= 1000000) {
 return `$${toFixed(amount / 1000000, 1)}M`;
 } else if (amount >= 1000) {
 return `$${toFixed(amount / 1000, 0)}K`;
 } else {
 return `$${amount.toLocaleString()}`;
 }
  };

  const formatPercentage = (percentage: number): string => {
 const sign = percentage >= 0 ? '+' : '';
 return `${sign}${toFixed(percentage, 1)}%`;
  };

  const getROIColor = (roi: number): string => {
 if (roi >= 20) return 'text-[#2C4A60] bg-[#C8D4DC]';
 if (roi >= 10) return 'text-[#6B7280] bg-[#F0F5FA]';
 return 'text-red-600 bg-red-50';
  };

  const getMarginColor = (margin: number): string => {
 if (margin >= 0) return 'text-[#2C4A60]';
 return 'text-red-600';
  };

  return (
 <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-xl font-semibold text-gray-800">
 {data.module} Financial Summary
 </h3>
 <button
 onClick={() => setShowAssumptions(!showAssumptions)}
 className="flex items-center gap-2 text-sm text-chrome-600 hover:text-chrome-800 transition-colors"
 title="View Financial Model Assumptions"
 >
 <Info className="w-4 h-4" />
 Model Assumptions
 {showAssumptions ? (
 <ChevronUp className="w-4 h-4" />
 ) : (
 <ChevronDown className="w-4 h-4" />
 )}
 </button>
 </div>
 </div>

 {/* Key Financial Metrics */}
 <div className="p-6">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
 <div className="text-center">
 <div className="flex items-center justify-center mb-2">
 <DollarSign className="w-6 h-6 text-[#2C4A60]" />
 </div>
 <div className="text-2xl font-bold text-gray-900">
 {formatCurrency(data.totalValidatedBenefits)}
 </div>
 <div className="text-sm text-gray-600">
 Total Validated Benefits YTD
 </div>
 </div>

 <div className="text-center">
 <div className="flex items-center justify-center mb-2">
 <TrendingUp className="w-6 h-6 text-chrome-600" />
 </div>
 <div className="text-2xl font-bold text-gray-900">
 {formatCurrency(data.incrementalRevenue)}
 </div>
 <div className="text-sm text-gray-600">
 Incremental Revenue YTD
 </div>
 </div>

 <div className="text-center">
 <div className="flex items-center justify-center mb-2">
 <Target className={`w-6 h-6 ${getMarginColor(data.marginImpact)}`} />
 </div>
 <div className={`text-2xl font-bold ${getMarginColor(data.marginImpact)}`}>
 {formatPercentage(data.marginImpact)}
 </div>
 <div className="text-sm text-gray-600">
 Margin Impact
 </div>
 </div>

 <div className="text-center">
 <div className="flex items-center justify-center mb-2">
 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${getROIColor(data.roiPercentage)}`}>
 %
 </div>
 </div>
 <div className={`text-2xl font-bold ${getROIColor(data.roiPercentage).split(' ')[0]}`}>
 {formatPercentage(data.roiPercentage)}
 </div>
 <div className="text-sm text-gray-600">
 ROI Percentage
 </div>
 </div>
 </div>

 {/* Financial Model Assumptions - Collapsible */}
 {showAssumptions && (
 <div className="mb-6 p-4 bg-chrome-50 rounded-lg border border-chrome-200">
 <h4 className="font-semibold text-chrome-900 mb-3">
 {data.module} Financial Model Assumptions
 </h4>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {data.modelAssumptions.map((assumption, index) => (
 <div key={`${assumption.category}-${assumption.description}`} className="bg-white p-3 rounded border border-chrome-200">
 <div className="font-medium text-chrome-900 text-sm">
 {assumption.category}
 </div>
 <div className="text-gray-700 text-sm mb-1">
 {assumption.description}
 </div>
 <div className="flex justify-between items-center">
 <span className="font-semibold text-chrome-800">
 {assumption.value}
 </span>
 <span className="text-xs text-gray-500">
 {assumption.source}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* DRG Details Toggle */}
 <div className="flex justify-center mb-4">
 <button
 onClick={() => setShowDRGDetails(!showDRGDetails)}
 className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
 >
 <Eye className="w-4 h-4" />
 {showDRGDetails ? 'Hide' : 'Show'} DRG-Level Detail
 {showDRGDetails ? (
 <ChevronUp className="w-4 h-4" />
 ) : (
 <ChevronDown className="w-4 h-4" />
 )}
 </button>
 </div>

 {/* DRG Details Table - Collapsible */}
 {showDRGDetails && (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="px-4 py-3 text-left font-semibold text-gray-700">DRG Code</th>
 <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
 <th className="px-4 py-3 text-right font-semibold text-gray-700">Volume</th>
 <th className="px-4 py-3 text-right font-semibold text-gray-700">Revenue/Case</th>
 <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Revenue</th>
 <th className="px-4 py-3 text-right font-semibold text-gray-700">Avg LOS</th>
 <th className="px-4 py-3 text-right font-semibold text-gray-700">Margin %</th>
 </tr>
 </thead>
 <tbody>
 {data.drgDetails.map((drg, index) => (
 <tr key={drg.code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
 <td className="px-4 py-3 font-mono text-chrome-600 font-semibold">
 {drg.code}
 </td>
 <td className="px-4 py-3 text-gray-900">
 {drg.description}
 </td>
 <td className="px-4 py-3 text-right text-gray-900 font-medium">
 {drg.volume.toLocaleString()}
 </td>
 <td className="px-4 py-3 text-right text-gray-900 font-medium">
 {formatCurrency(drg.revenuePerCase)}
 </td>
 <td className="px-4 py-3 text-right text-gray-900 font-bold">
 {formatCurrency(drg.totalRevenue)}
 </td>
 <td className="px-4 py-3 text-right text-gray-700">
 {toFixed(drg.avgLengthOfStay, 1)} days
 </td>
 <td className={`px-4 py-3 text-right font-semibold ${getMarginColor(drg.margin)}`}>
 {formatPercentage(drg.margin)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Summary Row */}
 <div className="mt-4 p-4 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="grid grid-cols-4 gap-4 text-sm">
 <div>
 <span className="font-semibold text-chrome-900">Total Volume:</span>
 <div className="text-xl font-bold text-chrome-800">
 {data.drgDetails.reduce((sum, drg) => sum + drg.volume, 0).toLocaleString()}
 </div>
 </div>
 <div>
 <span className="font-semibold text-chrome-900">Total Revenue:</span>
 <div className="text-xl font-bold text-chrome-800">
 {formatCurrency(data.drgDetails.reduce((sum, drg) => sum + drg.totalRevenue, 0))}
 </div>
 </div>
 <div>
 <span className="font-semibold text-chrome-900">Avg LOS:</span>
 <div className="text-xl font-bold text-chrome-800">
 {toFixed(data.drgDetails.reduce((sum, drg) => sum + (drg.avgLengthOfStay * drg.volume), 0) /
 data.drgDetails.reduce((sum, drg) => sum + drg.volume, 0), 1)} days
 </div>
 </div>
 <div>
 <span className="font-semibold text-chrome-900">Avg Margin:</span>
 <div className={`text-xl font-bold ${getMarginColor(
 data.drgDetails.reduce((sum, drg) => sum + (drg.margin * drg.totalRevenue), 0) / 
 data.drgDetails.reduce((sum, drg) => sum + drg.totalRevenue, 0)
 )}`}>
 {formatPercentage(
 data.drgDetails.reduce((sum, drg) => sum + (drg.margin * drg.totalRevenue), 0) / 
 data.drgDetails.reduce((sum, drg) => sum + drg.totalRevenue, 0)
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
 * All data represents aggregated, de-identified information. No PHI is displayed.
 ** Revenue and margin calculations based on {data.module.toLowerCase()} service line performance.
 </div>
 </div>
  );
};

export default FinancialSummary;