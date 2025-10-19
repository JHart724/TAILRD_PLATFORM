import React from 'react';
import { Activity, DollarSign, TrendingUp, Clock, Award, Users, AlertTriangle, Heart } from 'lucide-react';

interface CoronaryMetric {
  label: string;
  value: string;
  subvalue?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    label: string;
  };
  status?: 'optimal' | 'warning' | 'critical';
  icon: React.ElementType;
}

const CoronaryExecutiveView: React.FC = () => {
  const kpiMetrics: CoronaryMetric[] = [
    {
      label: 'Total PCI Revenue',
      value: '$67.8M',
      subvalue: 'Quarterly performance',
      trend: { direction: 'up', value: '+14.2%', label: 'vs last quarter' },
      status: 'optimal',
      icon: DollarSign,
    },
    {
      label: 'PCI Volume',
      value: '2,847',
      subvalue: 'All interventions',
      trend: { direction: 'up', value: '+11.8%', label: 'vs last quarter' },
      status: 'optimal',
      icon: Activity,
    },
    {
      label: 'Door-to-Balloon Time',
      value: '67min',
      subvalue: 'STEMI average',
      trend: { direction: 'down', value: '-8min', label: 'improvement' },
      status: 'optimal',
      icon: Clock,
    },
    {
      label: 'PCI Success Rate',
      value: '97.2%',
      subvalue: 'Procedural success',
      trend: { direction: 'up', value: '+1.8%', label: 'improvement' },
      status: 'optimal',
      icon: Award,
    },
  ];

  const procedureVolumes = [
    { 
      procedure: 'Elective PCI', 
      volume: 1847, 
      revenue: 32400000, 
      margin: 38.4,
      avgCost: 17543,
      complexity: 'Standard',
      outcomes: { mortality: 0.3, mi: 1.2, tvr: 4.8 }
    },
    { 
      procedure: 'Primary PCI (STEMI)', 
      volume: 456, 
      revenue: 18200000, 
      margin: 42.1,
      avgCost: 39912,
      complexity: 'High',
      outcomes: { mortality: 2.8, mi: 1.8, tvr: 6.2 }
    },
    { 
      procedure: 'Complex PCI (CTO/Bifurcation)', 
      volume: 287, 
      revenue: 12800000, 
      margin: 45.8,
      avgCost: 44599,
      complexity: 'Very High',
      outcomes: { mortality: 0.7, mi: 2.4, tvr: 8.7 }
    },
    { 
      procedure: 'Rescue PCI', 
      volume: 89, 
      revenue: 2900000, 
      margin: 35.2,
      avgCost: 32584,
      complexity: 'High',
      outcomes: { mortality: 4.5, mi: 3.4, tvr: 9.1 }
    },
    { 
      procedure: 'Rotational Atherectomy', 
      volume: 78, 
      revenue: 1800000, 
      margin: 48.3,
      avgCost: 23077,
      complexity: 'Very High',
      outcomes: { mortality: 1.3, mi: 2.6, tvr: 12.8 }
    },
    { 
      procedure: 'IABP/Impella Support', 
      volume: 90, 
      revenue: 3200000, 
      margin: 28.7,
      avgCost: 35556,
      complexity: 'Critical',
      outcomes: { mortality: 12.2, mi: 5.6, tvr: 15.6 }
    }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      optimal: 'border-l-medical-green-400 bg-medical-green-50/50',
      warning: 'border-l-medical-amber-400 bg-medical-amber-50/50',
      critical: 'border-l-medical-red-400 bg-medical-red-50/50',
    };
    return colors[status as keyof typeof colors] || colors.optimal;
  };

  const getTrendColor = (direction: string) => {
    return direction === 'up' ? 'text-medical-green-600' : 'text-medical-red-600';
  };

  const getComplexityColor = (complexity: string) => {
    const colors = {
      'Standard': 'bg-medical-green-100 text-medical-green-800',
      'High': 'bg-medical-amber-100 text-medical-amber-800',
      'Very High': 'bg-medical-red-100 text-medical-red-800',
      'Critical': 'bg-medical-red-200 text-medical-red-900'
    };
    return colors[complexity as keyof typeof colors] || colors['Standard'];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const totalRevenue = procedureVolumes.reduce((sum, p) => sum + p.revenue, 0);
  const totalVolume = procedureVolumes.reduce((sum, p) => sum + p.volume, 0);
  const avgMargin = procedureVolumes.reduce((sum, p, _, arr) => sum + p.margin / arr.length, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <div
              key={metric.label}
              className={`retina-card p-6 border-l-4 ${getStatusColor(metric.status || 'optimal')}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                    {metric.label}
                  </div>
                  <div className="text-4xl font-bold text-steel-900 mb-1 font-sf">
                    {metric.value}
                  </div>
                  {metric.subvalue && (
                    <div className="text-sm text-steel-600">{metric.subvalue}</div>
                  )}
                </div>
                <div className="ml-4 p-3 rounded-xl bg-white/70">
                  <IconComponent className="w-6 h-6 text-medical-amber-500" />
                </div>
              </div>

              {metric.trend && (
                <div className={`flex items-center gap-2 text-sm font-semibold ${getTrendColor(metric.trend.direction)}`}>
                  <TrendingUp className={`w-4 h-4 ${metric.trend.direction === 'down' ? 'rotate-180' : ''}`} />
                  <span>{metric.trend.value}</span>
                  <span className="text-steel-500 font-normal ml-1">{metric.trend.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Procedure Volume & Revenue Analysis */}
      <div className="retina-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
              Coronary Intervention Analytics
            </h2>
            <p className="text-steel-600">
              Volume, revenue, outcomes, and complexity analysis by procedure type
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-steel-600 mb-1">Total Quarterly Revenue</div>
            <div className="text-3xl font-bold text-steel-900 font-sf">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-sm text-steel-600">
              {totalVolume.toLocaleString()} procedures • {avgMargin.toFixed(1)}% avg margin
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {procedureVolumes.map((procedure) => (
            <div
              key={procedure.procedure}
              className="p-6 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-steel-900 text-lg">{procedure.procedure}</h3>
                <div className="flex gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getComplexityColor(procedure.complexity)}`}>
                    {procedure.complexity}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                    procedure.margin >= 40 ? 'bg-medical-green-100 text-medical-green-800' :
                    procedure.margin >= 30 ? 'bg-medical-amber-100 text-medical-amber-800' :
                    'bg-medical-red-100 text-medical-red-800'
                  }`}>
                    {procedure.margin.toFixed(1)}% margin
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-steel-600 mb-1">Volume</div>
                  <div className="text-xl font-bold text-steel-900 font-sf">{procedure.volume}</div>
                </div>
                <div>
                  <div className="text-sm text-steel-600 mb-1">Revenue</div>
                  <div className="text-xl font-bold text-steel-900 font-sf">
                    {formatCurrency(procedure.revenue)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-steel-600 mb-1">Avg Cost</div>
                  <div className="text-xl font-bold text-steel-900 font-sf">
                    {formatCurrency(procedure.avgCost)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-steel-600 mb-1">Per Case Revenue</div>
                  <div className="text-xl font-bold text-steel-900 font-sf">
                    {formatCurrency(procedure.revenue / procedure.volume)}
                  </div>
                </div>
              </div>

              {/* 30-Day Outcomes */}
              <div className="mt-4 pt-4 border-t border-steel-100">
                <div className="text-sm font-semibold text-steel-700 mb-2">30-Day Outcomes (%)</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-steel-600">Mortality</div>
                    <div className="font-bold text-medical-red-600">{procedure.outcomes.mortality}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-steel-600">MI</div>
                    <div className="font-bold text-medical-amber-600">{procedure.outcomes.mi}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-steel-600">TVR</div>
                    <div className="font-bold text-medical-amber-600">{procedure.outcomes.tvr}%</div>
                  </div>
                </div>
              </div>

              {/* Volume Bar */}
              <div className="mt-4">
                <div className="w-full bg-steel-100 rounded-full h-2">
                  <div
                    className="h-2 bg-medical-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(procedure.volume / Math.max(...procedureVolumes.map(p => p.volume))) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality & Outcomes Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="retina-card p-6">
          <h3 className="text-xl font-bold text-steel-900 mb-4 font-sf">
            Quality Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Door-to-Balloon Time</div>
                <div className="text-sm text-steel-600">STEMI patients (Goal: <90min)</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">67min</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">PCI Success Rate</div>
                <div className="text-sm text-steel-600">TIMI 3 flow restoration</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">97.2%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Contrast Volume</div>
                <div className="text-sm text-steel-600">Average per case</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">187mL</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Radiation Dose</div>
                <div className="text-sm text-steel-600">DAP (Gy·cm²)</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">42.8</div>
            </div>
          </div>
        </div>

        <div className="retina-card p-6">
          <h3 className="text-xl font-bold text-steel-900 mb-4 font-sf">
            Operational Excellence
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Cath Lab Utilization</div>
                <div className="text-sm text-steel-600">Average across 4 labs</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">84.7%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Same-Day Discharge</div>
                <div className="text-sm text-steel-600">Elective PCI patients</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">68.4%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Patient Satisfaction</div>
                <div className="text-sm text-steel-600">HCAHPS scores</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">9.1/10</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Staff Engagement</div>
                <div className="text-sm text-steel-600">Team satisfaction</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">8.8/10</div>
            </div>
          </div>
        </div>
      </div>

      {/* STEMI Performance Dashboard */}
      <div className="retina-card p-8">
        <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
          STEMI Performance Analytics
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-medical-green-50 rounded-xl border border-medical-green-200">
            <h4 className="font-semibold text-medical-green-800 mb-3">Door-to-Balloon <60min</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cases:</span>
                <span className="font-semibold">198 (43.4%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Time:</span>
                <span className="font-semibold">48min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">1.8%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 rounded-xl border border-medical-amber-200">
            <h4 className="font-semibold text-medical-amber-800 mb-3">Door-to-Balloon 60-90min</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cases:</span>
                <span className="font-semibold">187 (41.0%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Time:</span>
                <span className="font-semibold">73min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">2.7%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-red-50 rounded-xl border border-medical-red-200">
            <h4 className="font-semibold text-medical-red-800 mb-3">Door-to-Balloon >90min</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cases:</span>
                <span className="font-semibold">71 (15.6%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Time:</span>
                <span className="font-semibold">118min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">4.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="mt-6 pt-6 border-t border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4">Monthly Door-to-Balloon Trend</h4>
          <div className="grid grid-cols-6 gap-2 text-center text-sm">
            {[
              { month: 'May', time: 72, cases: 89 },
              { month: 'Jun', time: 69, cases: 94 },
              { month: 'Jul', time: 71, cases: 87 },
              { month: 'Aug', time: 68, cases: 92 },
              { month: 'Sep', time: 65, cases: 96 },
              { month: 'Oct', time: 67, cases: 98 }
            ].map((data, index) => (
              <div key={index} className="p-2 bg-steel-50 rounded">
                <div className="font-semibold text-steel-800">{data.month}</div>
                <div className="text-medical-blue-600 font-bold">{data.time}min</div>
                <div className="text-steel-600 text-xs">{data.cases} cases</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoronaryExecutiveView;