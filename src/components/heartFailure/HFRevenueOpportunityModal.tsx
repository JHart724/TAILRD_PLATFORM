import React from 'react';
import { X, TrendingUp, AlertCircle, Clock, Eye, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Opportunity {
  priority: 'High' | 'Medium' | 'Low';
  revenueImpact: number;
  drgUpgrade: string;
  dueDate: string;
}

interface HFRevenueOpportunityModalProps {
  opportunities: Opportunity[];
  onClose: () => void;
  onViewDetails?: () => void;
}

const HFRevenueOpportunityModal: React.FC<HFRevenueOpportunityModalProps> = ({
  opportunities,
  onClose,
  onViewDetails
}) => {
  const formatMoney = (amount: number): string => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
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
  const drgColors = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const timelineColors = {
    'Due Today': '#EF4444',
    'Due This Week': '#F59E0B', 
    'Due This Month': '#10B981',
    'Due Later': '#6B7280'
  };

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload[0]) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-steel-300 rounded-lg shadow-lg">
          <p className="font-semibold text-steel-800">{data.drgUpgrade}</p>
          <p className="text-sm text-steel-600">
            Count: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm text-steel-600">
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
        <div className="bg-white p-3 border border-steel-300 rounded-lg shadow-lg">
          <p className="font-semibold text-steel-800">{data.category}</p>
          <p className="text-sm text-steel-600">
            Count: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm text-steel-600">
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
        <div className="flex justify-between items-start p-6 border-b border-steel-200 bg-gradient-to-r from-medical-blue-50 to-steel-50">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-medical-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-steel-900">Revenue Opportunities Pipeline</h2>
              <p className="text-sm text-steel-600 mt-1">
                {opportunities.length} opportunities • {formatMoney(totalRevenue)} total potential
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-steel-500 hover:text-steel-700 p-2 rounded-lg hover:bg-steel-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* High Priority */}
            <div className="bg-medical-red-50 rounded-xl p-6 border border-medical-red-200">
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
            <div className="bg-medical-amber-50 rounded-xl p-6 border border-medical-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-medical-amber-600 mr-3" />
                  <div>
                    <div className="text-lg font-bold text-medical-amber-900">Medium Priority</div>
                    <div className="text-sm text-medical-amber-700">Planned review</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-medical-amber-700">Count:</span>
                  <span className="text-2xl font-bold text-medical-amber-900">{mediumPriorityOpps.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-amber-700">Revenue:</span>
                  <span className="text-xl font-bold text-medical-amber-900">{formatMoney(mediumPriorityRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Total Potential */}
            <div className="bg-medical-green-50 rounded-xl p-6 border border-medical-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-medical-green-600 mr-3" />
                  <div>
                    <div className="text-lg font-bold text-medical-green-900">Total Potential</div>
                    <div className="text-sm text-medical-green-700">Combined opportunity</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-medical-green-700">Count:</span>
                  <span className="text-2xl font-bold text-medical-green-900">{opportunities.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-green-700">Revenue:</span>
                  <span className="text-xl font-bold text-medical-green-900">{formatMoney(totalRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* DRG Type Breakdown */}
            <div className="bg-steel-50 rounded-xl p-6 border border-steel-200">
              <h3 className="text-xl font-semibold text-steel-900 mb-6">DRG Upgrade Distribution</h3>
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
                        <span className="text-steel-700">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* DRG Details */}
              <div className="mt-4 space-y-2">
                {drgBreakdown.map((item, index) => (
                  <div key={item.drgUpgrade} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: drgColors[index % drgColors.length] }}
                      />
                      <span className="text-steel-700">{item.drgUpgrade}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-steel-900">{formatMoney(item.revenue)}</div>
                      <div className="text-steel-500 text-xs">{item.count} cases</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline/Urgency Distribution */}
            <div className="bg-steel-50 rounded-xl p-6 border border-steel-200">
              <h3 className="text-xl font-semibold text-steel-900 mb-6">Urgency Timeline</h3>
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
                  <div key={item.category} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: timelineColors[item.category as keyof typeof timelineColors] }}
                      />
                      <span className="text-steel-700">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-steel-900">{item.count} cases</div>
                      <div className="text-steel-500 text-xs">{formatMoney(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-steel-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-steel-600 bg-steel-100 rounded-lg hover:bg-steel-200 transition-colors font-medium"
            >
              Close
            </button>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="px-6 py-3 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors font-medium flex items-center"
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

export default HFRevenueOpportunityModal;