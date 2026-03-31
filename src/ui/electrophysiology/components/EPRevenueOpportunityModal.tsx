import React from 'react';
import { X, TrendingUp, AlertCircle, Clock, Eye, DollarSign } from 'lucide-react';
import { toFixed } from '../../../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Opportunity {
  priority: 'High' | 'Medium' | 'Low';
  revenueImpact: number;
  drgUpgrade: string;
  dueDate: string;
}

interface EPRevenueOpportunityModalProps {
  opportunities: Opportunity[];
  onClose: () => void;
  onViewDetails?: () => void;
}

const EPRevenueOpportunityModal: React.FC<EPRevenueOpportunityModalProps> = ({
  opportunities,
  onClose,
  onViewDetails
}) => {
  const formatMoney = (amount: number): string => {
 if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
 if (amount >= 1000) return `$${toFixed(amount / 1000, 0)}K`;
 return `$${amount.toLocaleString()}`;
  };

  // Calculate summary metrics
  const highPriorityOpps = opportunities.filter(o => o.priority === 'High');
  const mediumPriorityOpps = opportunities.filter(o => o.priority === 'Medium');
  const totalRevenue = opportunities.reduce((sum, o) => sum + o.revenueImpact, 0);
  const highPriorityRevenue = highPriorityOpps.reduce((sum, o) => sum + o.revenueImpact, 0);
  const mediumPriorityRevenue = mediumPriorityOpps.reduce((sum, o) => sum + o.revenueImpact, 0);

  // DRG breakdown data
  const drgBreakdown = opportunities.reduce((acc, opp) => {
 const existing = acc.find(item => item.drgUpgrade === opp.drgUpgrade);
 if (existing) {
 existing.count += 1;
 existing.revenue += opp.revenueImpact;
 } else {
 acc.push({
 drgUpgrade: opp.drgUpgrade,
 count: 1,
 revenue: opp.revenueImpact
 });
 }
 return acc;
  }, [] as Array<{ drgUpgrade: string; count: number; revenue: number }>);

  // Timeline/Urgency distribution
  const calculateDaysUntilDue = (dueDate: string) => {
 const due = new Date(dueDate);
 const today = new Date();
 const diffTime = due.getTime() - today.getTime();
 return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const timelineData = opportunities.reduce((acc, opp) => {
 const days = calculateDaysUntilDue(opp.dueDate);
 let category: string;
 if (days <= 0) category = 'Due Today';
 else if (days <= 7) category = 'Due This Week';
 else if (days <= 30) category = 'Due This Month';
 else category = 'Due Later';

 const existing = acc.find(item => item.category === category);
 if (existing) {
 existing.count += 1;
 existing.revenue += opp.revenueImpact;
 } else {
 acc.push({
 category,
 count: 1,
 revenue: opp.revenueImpact
 });
 }
 return acc;
  }, [] as Array<{ category: string; count: number; revenue: number }>);

  // Ensure all categories are present
  const fullTimelineData = [
 'Due Today',
 'Due This Week', 
 'Due This Month',
 'Due Later'
  ].map(category => {
 const existing = timelineData.find(item => item.category === category);
 return existing || { category, count: 0, revenue: 0 };
  });

  // Colors for charts
  const drgColors = ['#6B8EA8', '#4A6880', '#4A6880', '#6B7280', '#9B2438'];
  const timelineColors = {
 'Due Today': '#9B2438',
 'Due This Week': '#6B7280', 
 'Due This Month': '#4A6880',
 'Due Later': '#6B7280'
  };

  const renderCustomTooltip = (props: any) => {
 if (props.active && props.payload && props.payload[0]) {
 const data = props.payload[0].payload;
 return (
 <div className="bg-white p-3 border border-titanium-300 rounded-lg shadow-lg">
 <p className="font-semibold text-titanium-800">{data.drgUpgrade}</p>
 <p className="text-sm text-titanium-600">
 Count: <span className="font-medium">{data.count}</span>
 </p>
 <p className="text-sm text-titanium-600">
 Revenue: <span className="font-medium">{formatMoney(data.revenue)}</span>
 </p>
 </div>
 );
 }
 return null;
  };

  const renderTimelineTooltip = (props: any) => {
 if (props.active && props.payload && props.payload[0]) {
 const data = props.payload[0].payload;
 return (
 <div className="bg-white p-3 border border-titanium-300 rounded-lg shadow-lg">
 <p className="font-semibold text-titanium-800">{data.category}</p>
 <p className="text-sm text-titanium-600">
 Count: <span className="font-medium">{data.count}</span>
 </p>
 <p className="text-sm text-titanium-600">
 Revenue: <span className="font-medium">{formatMoney(data.revenue)}</span>
 </p>
 </div>
 );
 }
 return null;
  };

  return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 
 {/* Header */}
 <div className="flex justify-between items-start p-6 border-b border-titanium-200 bg-gradient-to-r from-porsche-50 to-titanium-50">
 <div className="flex items-center">
 <TrendingUp className="w-6 h-6 text-porsche-600 mr-3" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900">Revenue Opportunities Pipeline</h2>
 <p className="text-sm text-titanium-600 mt-1">
 {opportunities.length} opportunities • {formatMoney(totalRevenue)} total potential
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
 
 {/* Summary Cards */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 
 {/* High Priority */}
 <div className="bg-red-50 p-4 rounded-lg border border-red-200">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <AlertCircle className="w-8 h-8 text-medical-red-600 mr-3" />
 <div>
 <div className="text-lg font-bold text-medical-red-900">High Priority</div>
 <div className="text-sm text-medical-red-700">Urgent attention required</div>
 </div>
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-medical-red-700">Count:</span>
 <span className="text-2xl font-bold text-medical-red-900">{highPriorityOpps.length}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-medical-red-700">Revenue:</span>
 <span className="text-xl font-bold text-medical-red-900">{formatMoney(highPriorityRevenue)}</span>
 </div>
 </div>
 </div>

 {/* Medium Priority */}
 <div className="bg-[#F0F5FA] p-4 rounded-lg border border-[#C8D4DC]">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <Clock className="w-8 h-8 text-crimson-600 mr-3" />
 <div>
 <div className="text-lg font-bold text-crimson-700">Medium Priority</div>
 <div className="text-sm text-crimson-700">Planned review</div>
 </div>
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-crimson-700">Count:</span>
 <span className="text-2xl font-bold text-crimson-700">{mediumPriorityOpps.length}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-crimson-700">Revenue:</span>
 <span className="text-xl font-bold text-crimson-700">{formatMoney(mediumPriorityRevenue)}</span>
 </div>
 </div>
 </div>

 {/* Total Potential */}
 <div className="bg-[#C8D4DC] p-4 rounded-lg border border-[#2C4A60]">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center">
 <DollarSign className="w-8 h-8 text-[#2C4A60] mr-3" />
 <div>
 <div className="text-lg font-bold text-[#2C4A60]">Total Potential</div>
 <div className="text-sm text-[#2C4A60]">Combined opportunity</div>
 </div>
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-[#2C4A60]">Count:</span>
 <span className="text-2xl font-bold text-[#2C4A60]">{opportunities.length}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[#2C4A60]">Revenue:</span>
 <span className="text-xl font-bold text-[#2C4A60]">{formatMoney(totalRevenue)}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
 
 {/* DRG Type Breakdown */}
 <div className="bg-titanium-50 rounded-xl p-6 border border-titanium-200">
 <h3 className="font-semibold text-gray-900 mb-4 mt-6">DRG Upgrade Distribution</h3>
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={drgBreakdown}
 dataKey="revenue"
 nameKey="drgUpgrade"
 cx="50%"
 cy="50%"
 outerRadius={100}
 innerRadius={40}
 paddingAngle={2}
 >
 {drgBreakdown.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={drgColors[index % drgColors.length]} />
 ))}
 </Pie>
 <Tooltip content={renderCustomTooltip} />
 <Legend 
 formatter={(value: string) => (
 <span className="text-titanium-700">{value}</span>
 )}
 />
 </PieChart>
 </ResponsiveContainer>
 </div>
 
 {/* DRG Details */}
 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
 {drgBreakdown.map((item, index) => (
 <div key={item.drgUpgrade} className="flex justify-between items-center text-sm">
 <div className="flex items-center">
 <div 
 className="w-3 h-3 rounded-full mr-2" 
 style={{ backgroundColor: drgColors[index % drgColors.length] }}
 />
 <span className="text-titanium-700">{item.drgUpgrade}</span>
 </div>
 <div className="text-right">
 <div className="font-semibold text-titanium-900">{formatMoney(item.revenue)}</div>
 <div className="text-titanium-500 text-xs">{item.count} cases</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Timeline/Urgency Distribution */}
 <div className="bg-titanium-50 rounded-xl p-6 border border-titanium-200">
 <h3 className="text-xl font-semibold text-titanium-900 mb-6">Urgency Timeline</h3>
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={fullTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
 <XAxis 
 dataKey="category" 
 stroke="#64748B"
 fontSize={12}
 angle={-45}
 textAnchor="end"
 height={80}
 />
 <YAxis stroke="#64748B" fontSize={12} />
 <Tooltip content={renderTimelineTooltip} />
 <Bar dataKey="count" radius={[4, 4, 0, 0]}>
 {fullTimelineData.map((entry, index) => (
 <Cell 
 key={`cell-${index}`} 
 fill={timelineColors[entry.category as keyof typeof timelineColors]} 
 />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Timeline Summary */}
 <div className="mt-4 space-y-2">
 {fullTimelineData.map((item) => (
 <div key={item.category} className="flex justify-between items-center text-sm gap-4 mb-2">
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <div className="w-2 h-2 rounded-full bg-porsche-500 flex-shrink-0" />
 <span className="text-gray-700 truncate">{item.category}</span>
 </div>
 <div className="flex items-center gap-3 flex-shrink-0 text-right">
 <span className="font-medium text-gray-900 whitespace-nowrap">{item.count} cases</span>
 <span className="font-semibold text-[#2C4A60] whitespace-nowrap">${toFixed(item.revenue / 1000, 0)}K</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex justify-end gap-4 pt-6 border-t border-titanium-200">
 <button
 onClick={onClose}
 className="px-6 py-3 text-titanium-600 bg-titanium-100 rounded-lg hover:bg-titanium-200 transition-colors font-medium"
 >
 Close
 </button>
 {onViewDetails && (
 <button
 onClick={onViewDetails}
 className="px-6 py-3 bg-porsche-600 text-white rounded-lg hover:bg-porsche-700 transition-colors font-medium flex items-center"
 >
 <Eye className="w-5 h-5 mr-2" />
 View Details in Service Line
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPRevenueOpportunityModal;