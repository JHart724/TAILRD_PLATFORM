import React, { useState } from 'react';
import { Zap, Clock, Award, TrendingUp, Users, Calendar, Target, Activity, Brain } from 'lucide-react';
import EPClinicalDecisionSupport from '../components/EPClinicalDecisionSupport';

interface EPProvider {
  id: string;
  name: string;
  specialty: string;
  totalCases: number;
  successRate: number;
  avgDuration: number;
  complicationRate: number;
  patientSatisfaction: number;
  revenue: number;
  caseTypes: {
    ablations: number;
    devices: number;
    extractions: number;
  };
  trends: {
    volume: { direction: 'up' | 'down'; value: string };
    quality: { direction: 'up' | 'down'; value: string };
  };
}

interface EPProcedure {
  name: string;
  volume: number;
  successRate: number;
  avgDuration: number;
  complications: number;
  revenue: number;
  trend: { direction: 'up' | 'down'; value: string };
  qualityMetrics: {
    appropriateness: number;
    outcomes: number;
    satisfaction: number;
  };
}

const EPServiceLineView: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('volume');
  const [activeTab, setActiveTab] = useState<'performance' | 'procedures' | 'clinical-support'>('performance');

  const providers: EPProvider[] = [
    {
      id: 'dr-martinez',
      name: 'Dr. Sarah Martinez',
      specialty: 'Cardiac Electrophysiology',
      totalCases: 324,
      successRate: 96.2,
      avgDuration: 118,
      complicationRate: 1.8,
      patientSatisfaction: 9.4,
      revenue: 2400000,
      caseTypes: { ablations: 145, devices: 142, extractions: 37 },
      trends: {
        volume: { direction: 'up', value: '+12%' },
        quality: { direction: 'up', value: '+1.2%' }
      }
    },
    {
      id: 'dr-chen',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiac Electrophysiology',
      totalCases: 287,
      successRate: 94.8,
      avgDuration: 132,
      complicationRate: 2.1,
      patientSatisfaction: 9.1,
      revenue: 2100000,
      caseTypes: { ablations: 124, devices: 118, extractions: 45 },
      trends: {
        volume: { direction: 'up', value: '+8%' },
        quality: { direction: 'down', value: '-0.5%' }
      }
    },
    {
      id: 'dr-thompson',
      name: 'Dr. Lisa Thompson',
      specialty: 'Cardiac Electrophysiology',
      totalCases: 256,
      successRate: 95.7,
      avgDuration: 125,
      complicationRate: 1.6,
      patientSatisfaction: 9.6,
      revenue: 1900000,
      caseTypes: { ablations: 118, devices: 101, extractions: 37 },
      trends: {
        volume: { direction: 'up', value: '+15%' },
        quality: { direction: 'up', value: '+2.1%' }
      }
    },
    {
      id: 'dr-rodriguez',
      name: 'Dr. Carlos Rodriguez',
      specialty: 'Cardiac Electrophysiology',
      totalCases: 198,
      successRate: 93.4,
      avgDuration: 145,
      complicationRate: 2.8,
      patientSatisfaction: 8.9,
      revenue: 1500000,
      caseTypes: { ablations: 89, devices: 78, extractions: 31 },
      trends: {
        volume: { direction: 'down', value: '-3%' },
        quality: { direction: 'up', value: '+0.8%' }
      }
    }
  ];

  const procedures: EPProcedure[] = [
    {
      name: 'Atrial Fibrillation Ablation',
      volume: 476,
      successRate: 89.2,
      avgDuration: 168,
      complications: 12,
      revenue: 14280000,
      trend: { direction: 'up', value: '+18%' },
      qualityMetrics: { appropriateness: 94.5, outcomes: 89.2, satisfaction: 9.3 }
    },
    {
      name: 'Ventricular Tachycardia Ablation',
      volume: 142,
      successRate: 78.9,
      avgDuration: 245,
      complications: 8,
      revenue: 5680000,
      trend: { direction: 'up', value: '+12%' },
      qualityMetrics: { appropriateness: 96.8, outcomes: 78.9, satisfaction: 8.9 }
    },
    {
      name: 'ICD Implantation',
      volume: 324,
      successRate: 98.1,
      avgDuration: 87,
      complications: 4,
      revenue: 12960000,
      trend: { direction: 'up', value: '+7%' },
      qualityMetrics: { appropriateness: 92.1, outcomes: 98.1, satisfaction: 9.1 }
    },
    {
      name: 'CRT-D Implantation',
      volume: 187,
      successRate: 96.8,
      avgDuration: 142,
      complications: 3,
      revenue: 9350000,
      trend: { direction: 'up', value: '+22%' },
      qualityMetrics: { appropriateness: 89.4, outcomes: 96.8, satisfaction: 9.4 }
    },
    {
      name: 'Lead Extraction',
      volume: 150,
      successRate: 94.7,
      avgDuration: 198,
      complications: 12,
      revenue: 3750000,
      trend: { direction: 'up', value: '+8%' },
      qualityMetrics: { appropriateness: 97.3, outcomes: 94.7, satisfaction: 8.7 }
    }
  ];

  const getProviderRank = (provider: EPProvider, metric: string) => {
    const sortedProviders = [...providers].sort((a, b) => {
      switch (metric) {
        case 'volume': return b.totalCases - a.totalCases;
        case 'quality': return b.successRate - a.successRate;
        case 'efficiency': return a.avgDuration - b.avgDuration;
        case 'revenue': return b.revenue - a.revenue;
        default: return 0;
      }
    });
    return sortedProviders.findIndex(p => p.id === provider.id) + 1;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getTrendColor = (direction: string) => {
    return direction === 'up' ? 'text-medical-green-600' : 'text-medical-red-600';
  };

  const getPerformanceColor = (value: number, type: 'rate' | 'duration' | 'satisfaction') => {
    if (type === 'rate') {
      return value >= 95 ? 'text-medical-green-600' : value >= 90 ? 'text-medical-amber-600' : 'text-medical-red-600';
    } else if (type === 'duration') {
      return value <= 120 ? 'text-medical-green-600' : value <= 150 ? 'text-medical-amber-600' : 'text-medical-red-600';
    } else {
      return value >= 9 ? 'text-medical-green-600' : value >= 8 ? 'text-medical-amber-600' : 'text-medical-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'performance', label: 'Provider Performance', icon: Users },
          { id: 'procedures', label: 'Procedure Analytics', icon: Zap },
          { id: 'clinical-support', label: 'Clinical Decision Support', icon: Brain }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-medical-blue-500 text-medical-blue-600 bg-medical-blue-50'
                  : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Provider Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="retina-card p-6 border-l-4 border-l-medical-blue-400 bg-medical-blue-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider">
              Total Procedures
            </div>
            <Activity className="w-5 h-5 text-medical-blue-500" />
          </div>
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">1,279</div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-medical-green-600" />
            <span className="font-semibold text-medical-green-600">+11.2%</span>
            <span className="text-steel-500">vs last quarter</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-green-400 bg-medical-green-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider">
              Success Rate
            </div>
            <Award className="w-5 h-5 text-medical-green-500" />
          </div>
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">94.8%</div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-medical-green-600" />
            <span className="font-semibold text-medical-green-600">+1.4%</span>
            <span className="text-steel-500">improvement</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-amber-400 bg-medical-amber-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider">
              Avg Duration
            </div>
            <Clock className="w-5 h-5 text-medical-amber-500" />
          </div>
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">132min</div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 rotate-180 text-medical-green-600" />
            <span className="font-semibold text-medical-green-600">-8min</span>
            <span className="text-steel-500">efficiency gain</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-red-400 bg-medical-red-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider">
              Complication Rate
            </div>
            <Target className="w-5 h-5 text-medical-red-500" />
          </div>
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">2.1%</div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 rotate-180 text-medical-green-600" />
            <span className="font-semibold text-medical-green-600">-0.3%</span>
            <span className="text-steel-500">reduction</span>
          </div>
        </div>
      </div>

      {/* Provider Performance Dashboard */}
      <div className="retina-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
              Provider Performance Scorecard
            </h2>
            <p className="text-steel-600">
              Comprehensive performance analytics by electrophysiologist
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'volume', label: 'Volume', icon: Activity },
              { id: 'quality', label: 'Quality', icon: Award },
              { id: 'efficiency', label: 'Efficiency', icon: Clock },
              { id: 'revenue', label: 'Revenue', icon: TrendingUp }
            ].map((metric) => {
              const IconComponent = metric.icon;
              return (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                    selectedMetric === metric.id
                      ? 'bg-medical-blue-500 text-white shadow-md'
                      : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                selectedProvider === provider.id
                  ? 'border-medical-blue-400 bg-medical-blue-50 shadow-retina-3'
                  : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2 bg-white'
              }`}
              onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-steel-900">{provider.name}</h3>
                  <p className="text-sm text-steel-600">{provider.specialty}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className={`text-xs px-2 py-1 rounded font-semibold ${
                      getProviderRank(provider, selectedMetric) === 1 ? 'bg-medical-green-100 text-medical-green-800' :
                      getProviderRank(provider, selectedMetric) <= 2 ? 'bg-medical-amber-100 text-medical-amber-800' :
                      'bg-steel-100 text-steel-700'
                    }`}>
                      #{getProviderRank(provider, selectedMetric)} in {selectedMetric}
                    </div>
                  </div>
                </div>
                <Users className="w-6 h-6 text-medical-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-steel-600">Total Cases</div>
                  <div className="text-xl font-bold text-steel-900 font-sf">{provider.totalCases}</div>
                  <div className={`text-xs font-semibold ${getTrendColor(provider.trends.volume.direction)}`}>
                    {provider.trends.volume.value}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-steel-600">Success Rate</div>
                  <div className={`text-xl font-bold font-sf ${getPerformanceColor(provider.successRate, 'rate')}`}>
                    {provider.successRate}%
                  </div>
                  <div className={`text-xs font-semibold ${getTrendColor(provider.trends.quality.direction)}`}>
                    {provider.trends.quality.value}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-steel-50 rounded-lg p-2">
                  <div className="text-xs text-steel-600">Ablations</div>
                  <div className="text-sm font-bold text-steel-900">{provider.caseTypes.ablations}</div>
                </div>
                <div className="bg-steel-50 rounded-lg p-2">
                  <div className="text-xs text-steel-600">Devices</div>
                  <div className="text-sm font-bold text-steel-900">{provider.caseTypes.devices}</div>
                </div>
                <div className="bg-steel-50 rounded-lg p-2">
                  <div className="text-xs text-steel-600">Extractions</div>
                  <div className="text-sm font-bold text-steel-900">{provider.caseTypes.extractions}</div>
                </div>
              </div>

              {selectedProvider === provider.id && (
                <div className="mt-4 pt-4 border-t border-steel-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-steel-600">Avg Duration:</span>
                      <span className={`ml-2 font-semibold ${getPerformanceColor(provider.avgDuration, 'duration')}`}>
                        {provider.avgDuration}min
                      </span>
                    </div>
                    <div>
                      <span className="text-steel-600">Revenue:</span>
                      <span className="ml-2 font-semibold text-steel-900">{formatCurrency(provider.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-steel-600">Complications:</span>
                      <span className="ml-2 font-semibold text-medical-red-600">{provider.complicationRate}%</span>
                    </div>
                    <div>
                      <span className="text-steel-600">Satisfaction:</span>
                      <span className={`ml-2 font-semibold ${getPerformanceColor(provider.patientSatisfaction, 'satisfaction')}`}>
                        {provider.patientSatisfaction}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Procedure Excellence Dashboard */}
      <div className="retina-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
              Procedure Excellence Analytics
            </h2>
            <p className="text-steel-600">
              Detailed performance metrics by procedure type
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {procedures.map((procedure) => (
            <div
              key={procedure.name}
              className="p-6 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-steel-900">{procedure.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className={`text-xs px-2 py-1 rounded font-semibold ${getTrendColor(procedure.trend.direction)} bg-opacity-10`}>
                      {procedure.trend.value} trend
                    </div>
                    <div className="text-sm text-steel-600">
                      {procedure.volume} cases • {formatCurrency(procedure.revenue)} revenue
                    </div>
                  </div>
                </div>
                <Zap className="w-6 h-6 text-medical-blue-500" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-sm text-steel-600 mb-1">Volume</div>
                  <div className="text-2xl font-bold text-steel-900 font-sf">{procedure.volume}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-steel-600 mb-1">Success Rate</div>
                  <div className={`text-2xl font-bold font-sf ${getPerformanceColor(procedure.successRate, 'rate')}`}>
                    {procedure.successRate}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-steel-600 mb-1">Avg Duration</div>
                  <div className={`text-2xl font-bold font-sf ${getPerformanceColor(procedure.avgDuration, 'duration')}`}>
                    {procedure.avgDuration}min
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-steel-600 mb-1">Complications</div>
                  <div className="text-2xl font-bold text-medical-red-600 font-sf">{procedure.complications}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-steel-600 mb-1">Revenue</div>
                  <div className="text-2xl font-bold text-steel-900 font-sf">
                    {formatCurrency(procedure.revenue)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-steel-100">
                <div className="text-sm font-semibold text-steel-700 mb-2">Quality Metrics</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Appropriateness:</span>
                    <span className="font-semibold text-medical-green-600">
                      {procedure.qualityMetrics.appropriateness}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Outcomes:</span>
                    <span className="font-semibold text-medical-green-600">
                      {procedure.qualityMetrics.outcomes}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Satisfaction:</span>
                    <span className="font-semibold text-medical-green-600">
                      {procedure.qualityMetrics.satisfaction}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}

      {/* Procedure Analytics Tab */}
      {activeTab === 'procedures' && (
        <div className="space-y-6">
          {/* Procedure Excellence Dashboard */}
          <div className="retina-card p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
                  Procedure Excellence Analytics
                </h2>
                <p className="text-steel-600">
                  Detailed performance metrics by procedure type
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {procedures.map((procedure) => (
                <div
                  key={procedure.name}
                  className="p-6 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-steel-900">{procedure.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className={`text-xs px-2 py-1 rounded font-semibold ${getTrendColor(procedure.trend.direction)} bg-opacity-10`}>
                          {procedure.trend.value} trend
                        </div>
                        <div className="text-sm text-steel-600">
                          {procedure.volume} cases • {formatCurrency(procedure.revenue)} revenue
                        </div>
                      </div>
                    </div>
                    <Zap className="w-6 h-6 text-medical-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-steel-600 mb-1">Volume</div>
                      <div className="text-2xl font-bold text-steel-900 font-sf">{procedure.volume}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-steel-600 mb-1">Success Rate</div>
                      <div className={`text-2xl font-bold font-sf ${getPerformanceColor(procedure.successRate, 'rate')}`}>
                        {procedure.successRate}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-steel-600 mb-1">Avg Duration</div>
                      <div className={`text-2xl font-bold font-sf ${getPerformanceColor(procedure.avgDuration, 'duration')}`}>
                        {procedure.avgDuration}min
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-steel-600 mb-1">Complications</div>
                      <div className="text-2xl font-bold text-medical-red-600 font-sf">{procedure.complications}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-steel-600 mb-1">Revenue</div>
                      <div className="text-2xl font-bold text-steel-900 font-sf">
                        {formatCurrency(procedure.revenue)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-steel-100">
                    <div className="text-sm font-semibold text-steel-700 mb-2">Quality Metrics</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex justify-between">
                        <span className="text-steel-600">Appropriateness:</span>
                        <span className="font-semibold text-medical-green-600">
                          {procedure.qualityMetrics.appropriateness}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-steel-600">Outcomes:</span>
                        <span className="font-semibold text-medical-green-600">
                          {procedure.qualityMetrics.outcomes}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-steel-600">Satisfaction:</span>
                        <span className="font-semibold text-medical-green-600">
                          {procedure.qualityMetrics.satisfaction}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clinical Decision Support Tab */}
      {activeTab === 'clinical-support' && (
        <EPClinicalDecisionSupport />
      )}
    </div>
  );
};

export default EPServiceLineView;