import React from 'react';
import { Zap, DollarSign, TrendingUp, Clock, Award, Users } from 'lucide-react';

interface EPMetric {
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

const EPExecutiveView: React.FC = () => {
  const kpiMetrics: EPMetric[] = [
    {
      label: 'Total EP Revenue',
      value: '$47.2M',
      subvalue: 'Quarterly performance',
      trend: { direction: 'up', value: '+12.4%', label: 'vs last quarter' },
      status: 'optimal',
      icon: DollarSign,
    },
    {
      label: 'Device Implant Volume',
      value: '1,847',
      subvalue: 'ICD/CRT/Pacemaker',
      trend: { direction: 'up', value: '+8.7%', label: 'vs last quarter' },
      status: 'optimal',
      icon: Zap,
    },
    {
      label: 'Ablation Success Rate',
      value: '94.2%',
      subvalue: '6-month freedom from AF',
      trend: { direction: 'up', value: '+2.1%', label: 'improvement' },
      status: 'optimal',
      icon: Award,
    },
    {
      label: 'Avg Case Duration',
      value: '127min',
      subvalue: 'Complex ablations',
      trend: { direction: 'down', value: '-15min', label: 'efficiency gain' },
      status: 'optimal',
      icon: Clock,
    },
  ];

  const procedureVolumes = [
    { procedure: 'ICD Implants', volume: 324, revenue: 12800000, margin: 38.2 },
    { procedure: 'CRT Implants', volume: 187, revenue: 8900000, margin: 42.1 },
    { procedure: 'AF Ablations', volume: 245, revenue: 14700000, margin: 45.8 },
    { procedure: 'VT Ablations', volume: 67, revenue: 5200000, margin: 48.3 },
    { procedure: 'Pacemakers', volume: 456, revenue: 6800000, margin: 28.5 },
    { procedure: 'Lead Extractions', volume: 89, revenue: 3400000, margin: 35.7 },
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
                  <IconComponent className="w-6 h-6 text-medical-blue-500" />
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
              EP Procedure Analytics
            </h2>
            <p className="text-steel-600">
              Volume, revenue, and margin analysis by procedure type
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

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {procedureVolumes.map((procedure) => (
            <div
              key={procedure.procedure}
              className="p-4 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-steel-900">{procedure.procedure}</h3>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  procedure.margin >= 40 ? 'bg-medical-green-100 text-medical-green-800' :
                  procedure.margin >= 30 ? 'bg-medical-amber-100 text-medical-amber-800' :
                  'bg-medical-red-100 text-medical-red-800'
                }`}>
                  {procedure.margin.toFixed(1)}% margin
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Volume:</span>
                  <span className="text-sm font-semibold text-steel-900">
                    {procedure.volume.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Revenue:</span>
                  <span className="text-sm font-semibold text-steel-900">
                    {formatCurrency(procedure.revenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Avg per case:</span>
                  <span className="text-sm font-semibold text-steel-900">
                    {formatCurrency(procedure.revenue / procedure.volume)}
                  </span>
                </div>
              </div>

              {/* Volume Bar */}
              <div className="mt-3">
                <div className="w-full bg-steel-100 rounded-full h-2">
                  <div
                    className="h-2 bg-medical-blue-500 rounded-full"
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
                <div className="font-medium text-steel-900">AF Ablation Success</div>
                <div className="text-sm text-steel-600">6-month freedom from AF</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">94.2%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Device Infection Rate</div>
                <div className="text-sm text-steel-600">30-day post-implant</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">0.8%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Lead Revision Rate</div>
                <div className="text-sm text-steel-600">1-year post-implant</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">2.1%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Appropriate ICD Shocks</div>
                <div className="text-sm text-steel-600">1-year follow-up</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">12.4%</div>
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
                <div className="font-medium text-steel-900">OR Utilization</div>
                <div className="text-sm text-steel-600">EP lab efficiency</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">87.3%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Same-day Discharge</div>
                <div className="text-sm text-steel-600">Device implants</div>
              </div>
              <div className="text-2xl font-bold text-medical-blue-600">76.8%</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Patient Satisfaction</div>
                <div className="text-sm text-steel-600">HCAHPS scores</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">9.2/10</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
              <div>
                <div className="font-medium text-steel-900">Staff Engagement</div>
                <div className="text-sm text-steel-600">Team satisfaction</div>
              </div>
              <div className="text-2xl font-bold text-medical-green-600">8.7/10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPExecutiveView;