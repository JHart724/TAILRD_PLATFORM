import React from 'react';
import { Heart, DollarSign, TrendingUp, Clock, Award, Users, Shield, Activity } from 'lucide-react';

interface StructuralMetric {
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

const StructuralExecutiveView: React.FC = () => {
  const kpiMetrics: StructuralMetric[] = [
    {
      label: 'Total Structural Revenue',
      value: '$89.4M',
      subvalue: 'Quarterly performance',
      trend: { direction: 'up', value: '+18.7%', label: 'vs last quarter' },
      status: 'optimal',
      icon: DollarSign,
    },
    {
      label: 'TAVR Volume',
      value: '347',
      subvalue: 'Transcatheter aortic valves',
      trend: { direction: 'up', value: '+24.3%', label: 'vs last quarter' },
      status: 'optimal',
      icon: Heart,
    },
    {
      label: 'MitraClip Success Rate',
      value: '96.8%',
      subvalue: '30-day outcomes',
      trend: { direction: 'up', value: '+3.2%', label: 'improvement' },
      status: 'optimal',
      icon: Award,
    },
    {
      label: 'Avg Case Duration',
      value: '142min',
      subvalue: 'Complex structural procedures',
      trend: { direction: 'down', value: '-18min', label: 'efficiency gain' },
      status: 'optimal',
      icon: Clock,
    },
  ];

  const procedureVolumes = [
    { 
      procedure: 'TAVR (Transcatheter Aortic Valve)', 
      volume: 347, 
      revenue: 32500000, 
      margin: 52.8,
      avgCost: 93645,
      outcomes: { mortality: 1.4, stroke: 2.1, vascular: 4.7 }
    },
    { 
      procedure: 'MitraClip (Transcatheter Mitral Repair)', 
      volume: 156, 
      revenue: 18200000, 
      margin: 48.9,
      avgCost: 116667,
      outcomes: { mortality: 2.6, stroke: 1.8, bleeding: 3.2 }
    },
    { 
      procedure: 'WATCHMAN (Left Atrial Appendage)', 
      volume: 89, 
      revenue: 4900000, 
      margin: 45.2,
      avgCost: 55056,
      outcomes: { mortality: 0.7, stroke: 1.1, bleeding: 2.4 }
    },
    { 
      procedure: 'Paravalvular Leak Closure', 
      volume: 34, 
      revenue: 2400000, 
      margin: 41.8,
      avgCost: 70588,
      outcomes: { mortality: 1.8, stroke: 2.9, vascular: 5.9 }
    },
    { 
      procedure: 'TMVR (Transcatheter Mitral Valve)', 
      volume: 23, 
      revenue: 3200000, 
      margin: 38.7,
      avgCost: 139130,
      outcomes: { mortality: 4.3, stroke: 2.2, bleeding: 6.5 }
    },
    { 
      procedure: 'Tricuspid Intervention', 
      volume: 18, 
      revenue: 1400000, 
      margin: 35.4,
      avgCost: 77778,
      outcomes: { mortality: 3.7, stroke: 1.4, bleeding: 4.1 }
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
                  <IconComponent className="w-6 h-6 text-medical-red-500" />
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
              Structural Heart Procedure Analytics
            </h2>
            <p className="text-steel-600">
              Volume, revenue, outcomes, and margin analysis by procedure type
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
                <div className={`px-3 py-1 rounded text-xs font-semibold ${
                  procedure.margin >= 50 ? 'bg-medical-green-100 text-medical-green-800' :
                  procedure.margin >= 40 ? 'bg-medical-amber-100 text-medical-amber-800' :
                  'bg-medical-red-100 text-medical-red-800'
                }`}>
                  {procedure.margin.toFixed(1)}% margin
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
                    <div className="text-steel-600">Stroke</div>
                    <div className="font-bold text-medical-amber-600">{procedure.outcomes.stroke}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-steel-600">
                      {procedure.outcomes.vascular ? 'Vascular' : 'Bleeding'}
                    </div>
                    <div className="font-bold text-medical-amber-600">
                      {procedure.outcomes.vascular || procedure.outcomes.bleeding}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Volume Bar */}
              <div className="mt-4">
                <div className="w-full bg-steel-100 rounded-full h-2">
                  <div
                    className="h-2 bg-medical-red-500 rounded-full transition-all duration-300"
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
                <div className="font-medium text-steel-900">TAVR 30-Day Mortality</div>
                <div className="text-sm text-steel-600">Society Benchmark: &lt;2%</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">1.4%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">MitraClip Success Rate</div>
                <div className="text-sm text-steel-600">MR reduction ≥1 grade</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">96.8%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">WATCHMAN Implant Success</div>
                <div className="text-sm text-steel-600">Successful device deployment</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">98.9%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Average Length of Stay</div>
                <div className="text-sm text-steel-600">Post-procedure LOS</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">2.1 days</div>
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
                <div className="font-medium text-steel-900">Hybrid OR Utilization</div>
                <div className="text-sm text-steel-600">Structural heart suite efficiency</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">89.3%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Same-Day Discharge</div>
                <div className="text-sm text-steel-600">TAVR/WATCHMAN procedures</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">34.2%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Patient Satisfaction</div>
                <div className="text-sm text-steel-600">HCAHPS scores</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">9.4/10</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Heart Team Efficiency</div>
                <div className="text-sm text-steel-600">MDT decision to procedure</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">12.4 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Stratification Analysis */}
      <div className="retina-card p-8">
        <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
          Risk Stratification & Outcomes
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-medical-green-50 rounded-xl border border-medical-green-200">
            <h4 className="font-semibold text-medical-green-800 mb-3">Low Risk (STS &lt;4%)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>TAVR Volume:</span>
                <span className="font-semibold">186 cases</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">0.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg LOS:</span>
                <span className="font-semibold">1.6 days</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 rounded-xl border border-medical-amber-200">
            <h4 className="font-semibold text-medical-amber-800 mb-3">Intermediate Risk (STS 4-8%)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>TAVR Volume:</span>
                <span className="font-semibold">127 cases</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">1.6%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg LOS:</span>
                <span className="font-semibold">2.3 days</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-red-50 rounded-xl border border-medical-red-200">
            <h4 className="font-semibold text-medical-red-800 mb-3">High Risk (STS &gt;8%)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>TAVR Volume:</span>
                <span className="font-semibold">34 cases</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>30-Day Mortality:</span>
                <span className="font-semibold">4.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg LOS:</span>
                <span className="font-semibold">3.8 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructuralExecutiveView;