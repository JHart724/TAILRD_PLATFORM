import React, { useState } from 'react';
import { X, DollarSign, Clock, TrendingDown, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toFixed } from '../../../utils/formatters';

interface Case {
  caseId: string;
  ageRange: string;
  los: number;
  cost: number;
  revenue: number;
  margin: number;
  marginPercent: number;
}

interface SHDRGDetailModalProps {
  drgCode: string;
  description: string;
  volume: number;
  avgReimbursement: number;
  totalRevenue: number;
  avgLos: number;
  avgCost: number;
  margin: number;
  targetLos: number;
  hospitalAvgLos: number;
  nationalBenchmarkLos: number;
  cases: Case[];
  onClose: () => void;
}

type SortField = keyof Case;
type SortDirection = 'asc' | 'desc';

const SHDRGDetailModal: React.FC<SHDRGDetailModalProps> = ({
  drgCode,
  description,
  volume,
  avgReimbursement,
  totalRevenue,
  avgLos,
  avgCost,
  margin,
  targetLos,
  hospitalAvgLos,
  nationalBenchmarkLos,
  cases,
  onClose
}) => {
  const [sortField, setSortField] = useState<SortField>('marginPercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatMoney = (amount: number): string => {
 if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
 if (amount >= 1000) return `$${toFixed(amount / 1000, 1)}K`;
 return `$${amount.toLocaleString()}`;
  };

  const getMarginColor = (marginPercent: number): string => {
 if (marginPercent >= 20) return 'text-teal-700';
 if (marginPercent >= 10) return 'text-crimson-600';
 return 'text-medical-red-600';
  };

  const getMarginBgColor = (marginPercent: number): string => {
 if (marginPercent >= 20) return 'bg-chrome-50';
 if (marginPercent >= 10) return 'bg-crimson-50';
 return 'bg-medical-red-50';
  };

  // Length of Stay data
  const losComparisonData = [
 { 
 category: 'Target', 
 value: targetLos, 
 color: '#4A6880',
 label: `Target: ${targetLos} days`
 },
 { 
 category: 'Our Average', 
 value: avgLos, 
 color: avgLos <= targetLos ? '#4A6880' : '#9B2438',
 label: `Our Average: ${avgLos} days`
 },
 { 
 category: 'Hospital Avg', 
 value: hospitalAvgLos, 
 color: '#2C4A60',
 label: `Hospital Average: ${hospitalAvgLos} days`
 },
 { 
 category: 'National', 
 value: nationalBenchmarkLos, 
 color: '#6B7280',
 label: `National Benchmark: ${nationalBenchmarkLos} days`
 }
  ];

  const handleSort = (field: SortField) => {
 if (field === sortField) {
 setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDirection('desc');
 }
  };

  const sortedCases = [...(cases || [])].sort((a, b) => {
 const aVal = a[sortField];
 const bVal = b[sortField];
 const multiplier = sortDirection === 'asc' ? 1 : -1;
 
 if (typeof aVal === 'string' && typeof bVal === 'string') {
 return aVal.localeCompare(bVal) * multiplier;
 }
 return ((aVal as number) - (bVal as number)) * multiplier;
  });

  const renderTooltip = (props: any) => {
 if (props.active && props.payload && props.payload[0]) {
 const data = props.payload[0].payload;
 return (
 <div className="bg-white p-3 border border-titanium-300 rounded-lg shadow-lg">
 <p className="font-semibold text-titanium-800">{data.category}</p>
 <p className="text-sm text-titanium-600">
 Length of Stay: <span className="font-medium">{data.value} days</span>
 </p>
 </div>
 );
 }
 return null;
  };

  return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 
 {/* Header */}
 <div className="flex justify-between items-start p-6 border-b border-titanium-200 bg-gradient-to-r from-porsche-50 to-titanium-50">
 <div className="flex items-center">
 <BarChart3 className="w-6 h-6 text-porsche-600 mr-3" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900">DRG {drgCode}</h2>
 <p className="text-lg text-titanium-700 mt-1">{description}</p>
 <p className="text-sm text-titanium-600 mt-1">
 Q4 2025 Performance • {volume.toLocaleString()} cases
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="text-titanium-500 hover:text-titanium-700 p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="p-6">
 
 {/* Summary Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 
 {/* Total Revenue */}
 <div className="bg-chrome-50 rounded-xl p-6 border border-titanium-300">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <DollarSign className="w-8 h-8 text-teal-700 mr-3" />
 <div>
 <div className="text-lg font-bold text-teal-700">Total Revenue</div>
 </div>
 </div>
 </div>
 <div className="text-3xl font-bold text-teal-700">
 {formatMoney(totalRevenue)}
 </div>
 <div className="text-sm text-teal-700 mt-1">
 Avg: {formatMoney(avgReimbursement)}
 </div>
 </div>

 {/* Average LOS */}
 <div className="bg-porsche-50 rounded-xl p-6 border border-porsche-200">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <Clock className="w-8 h-8 text-porsche-600 mr-3" />
 <div>
 <div className="text-lg font-bold text-porsche-900">Average LOS</div>
 </div>
 </div>
 </div>
 <div className="text-3xl font-bold text-porsche-900">
 {avgLos} days
 </div>
 <div className={`text-sm mt-1 ${avgLos <= targetLos ? 'text-teal-700' : 'text-medical-red-700'}`}>
 Target: {targetLos} days
 </div>
 </div>

 {/* Average Cost */}
 <div className="bg-arterial-50 rounded-xl p-6 border border-arterial-200">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <TrendingDown className="w-8 h-8 text-arterial-600 mr-3" />
 <div>
 <div className="text-lg font-bold text-arterial-900">Average Cost</div>
 </div>
 </div>
 </div>
 <div className="text-3xl font-bold text-arterial-900">
 {formatMoney(avgCost)}
 </div>
 <div className="text-sm text-arterial-700 mt-1">
 Per case
 </div>
 </div>

 {/* Margin */}
 <div className="bg-chrome-50 rounded-xl p-6 border border-titanium-300">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <TrendingUp className="w-8 h-8 text-teal-700 mr-3" />
 <div>
 <div className="text-lg font-bold text-teal-700">Margin</div>
 </div>
 </div>
 </div>
 <div className="text-3xl font-bold text-teal-700">
 {toFixed(margin, 1)}%
 </div>
 <div className="text-sm text-teal-700 mt-1">
 Above target
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
 
 {/* Length of Stay Comparison */}
 <div className="bg-titanium-50 rounded-xl p-6 border border-titanium-200">
 <h3 className="text-xl font-semibold text-titanium-900 mb-6">Length of Stay Comparison</h3>
 <div className="h-80">
 <ResponsiveContainer width="100%" height={250}>
 <BarChart
 data={losComparisonData}
 layout="vertical"
 margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
 >
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis type="number" />
 <YAxis type="category" dataKey="category" width={90} />
 <Tooltip />
 <Bar dataKey="value" radius={[0, 8, 8, 0]}>
 {losComparisonData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 
 {/* LOS Summary */}
 <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
 {losComparisonData.map((item) => (
 <div key={item.category} className="flex justify-between items-center">
 <div className="flex items-center">
 <div 
 className="w-3 h-3 rounded mr-2" 
 style={{ backgroundColor: item.color }}
 />
 <span className="text-titanium-700">{item.category}:</span>
 </div>
 <span className="font-semibold text-titanium-900">{item.value} days</span>
 </div>
 ))}
 </div>
 </div>

 {/* Case Distribution Summary */}
 <div className="bg-titanium-50 rounded-xl p-6 border border-titanium-200">
 <h3 className="text-xl font-semibold text-titanium-900 mb-6">Case Performance Summary</h3>
 
 {/* Performance Indicators */}
 <div className="space-y-4 mb-6">
 <div className="bg-white rounded-lg p-4 border border-titanium-200">
 <div className="flex justify-between items-center">
 <span className="text-titanium-700">Cases Above Target Margin (≥20%)</span>
 <div className="text-right">
 <div className="text-xl font-bold text-teal-700">
 {(cases || []).filter(c => c.marginPercent >= 20).length}
 </div>
 <div className="text-sm text-titanium-500">
 {(cases?.length ? toFixed((cases.filter(c => c.marginPercent >= 20).length / cases.length) * 100, 1) : 0)}%
 </div>
 </div>
 </div>
 </div>
 
 <div className="bg-white rounded-lg p-4 border border-titanium-200">
 <div className="flex justify-between items-center">
 <span className="text-titanium-700">Cases Below Target LOS</span>
 <div className="text-right">
 <div className="text-xl font-bold text-porsche-600">
 {(cases || []).filter(c => c.los <= targetLos).length}
 </div>
 <div className="text-sm text-titanium-500">
 {(cases?.length ? toFixed((cases.filter(c => c.los <= targetLos).length / cases.length) * 100, 1) : 0)}%
 </div>
 </div>
 </div>
 </div>
 
 <div className="bg-white rounded-lg p-4 border border-titanium-200">
 <div className="flex justify-between items-center">
 <span className="text-titanium-700">Average Case Margin</span>
 <div className="text-right">
 <div className="text-xl font-bold text-titanium-900">
 {formatMoney((cases?.length ? cases.reduce((sum, c) => sum + c.margin, 0) / cases.length : 0))}
 </div>
 <div className="text-sm text-titanium-500">
 {(cases?.length ? toFixed(cases.reduce((sum, c) => sum + c.marginPercent, 0) / cases.length, 1) : 0)}%
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Case Distribution Table */}
 <div className="bg-titanium-50 rounded-xl p-6 border border-titanium-200">
 <h3 className="text-xl font-semibold text-titanium-900 mb-6">Top 10 Case Performance (De-identified)</h3>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="text-left text-sm text-titanium-600 border-b border-titanium-300">
 <th 
 className="pb-3 font-medium cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('caseId')}
 >
 <div className="flex items-center">
 Case ID
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('ageRange')}
 >
 <div className="flex items-center">
 Age Range
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium text-right cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('los')}
 >
 <div className="flex items-center justify-end">
 LOS (days)
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium text-right cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('cost')}
 >
 <div className="flex items-center justify-end">
 Cost
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium text-right cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('revenue')}
 >
 <div className="flex items-center justify-end">
 Revenue
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium text-right cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('margin')}
 >
 <div className="flex items-center justify-end">
 Margin $
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 <th 
 className="pb-3 font-medium text-right cursor-pointer hover:text-titanium-800"
 onClick={() => handleSort('marginPercent')}
 >
 <div className="flex items-center justify-end">
 Margin %
 <ArrowUpDown className="w-4 h-4 ml-1" />
 </div>
 </th>
 </tr>
 </thead>
 <tbody className="text-sm">
 {sortedCases.slice(0, 10).map((caseItem, index) => (
 <tr key={caseItem.caseId} className="border-b border-titanium-200 hover:bg-white">
 <td className="py-3 font-medium text-titanium-900">{caseItem.caseId}</td>
 <td className="py-3 text-titanium-700">{caseItem.ageRange}</td>
 <td className="py-3 text-right font-medium text-titanium-900">{caseItem.los}</td>
 <td className="py-3 text-right font-medium text-titanium-900">{formatMoney(caseItem.cost)}</td>
 <td className="py-3 text-right font-medium text-titanium-900">{formatMoney(caseItem.revenue)}</td>
 <td className="py-3 text-right font-medium text-titanium-900">{formatMoney(caseItem.margin)}</td>
 <td className="py-3 text-right">
 <span 
 className={`px-2 py-1 rounded text-sm font-medium ${getMarginBgColor(caseItem.marginPercent)} ${getMarginColor(caseItem.marginPercent)}`}
 >
 {toFixed(caseItem.marginPercent, 1)}%
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Close Button */}
 <div className="flex justify-end mt-8 pt-6 border-t border-titanium-200">
 <button
 onClick={onClose}
 className="px-6 py-3 text-titanium-600 bg-titanium-100 rounded-lg hover:bg-titanium-200 transition-colors font-medium"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 </div>
  );
};

export default SHDRGDetailModal;