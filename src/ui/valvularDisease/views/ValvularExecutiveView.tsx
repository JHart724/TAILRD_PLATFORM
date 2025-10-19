import React, { useState } from 'react';
import { 
  Heart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Activity,
  Award,
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const ValvularExecutiveView: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('quarter');

  // Executive KPIs
  const executiveKPIs = [
    {
      title: 'Total Valve Procedures',
      value: '2,847',
      change: '+14.8%',
      trend: 'up',
      icon: Heart,
      color: 'medical-purple'
    },
    {
      title: 'Program Revenue',
      value: '$18.2M',
      change: '+22.3%',
      trend: 'up',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'STS Risk Score',
      value: '2.1%',
      change: '-0.3%',
      trend: 'down',
      icon: Target,
      color: 'medical-blue'
    },
    {
      title: 'Patient Satisfaction',
      value: '4.8/5',
      change: '+0.2',
      trend: 'up',
      icon: Award,
      color: 'medical-amber'
    }
  ];

  // Procedure Volume by Type
  const procedureVolumes = [
    { 
      procedure: 'TAVR (Transcatheter Aortic Valve Replacement)', 
      volume: 1247, 
      revenue: '$9.8M', 
      growth: '+18.5%',
      margin: 34.2,
      riskScore: 1.8 
    },
    { 
      procedure: 'Surgical Aortic Valve Replacement', 
      volume: 523, 
      revenue: '$4.2M', 
      growth: '+12.1%',
      margin: 28.7,
      riskScore: 2.8 
    },
    { 
      procedure: 'Mitral Valve Repair/Replacement', 
      volume: 418, 
      revenue: '$2.9M', 
      growth: '+8.3%',
      margin: 31.5,
      riskScore: 3.2 
    },
    { 
      procedure: 'MitraClip (Transcatheter Mitral Repair)', 
      volume: 342, 
      revenue: '$1.8M', 
      growth: '+28.7%',
      margin: 38.9,
      riskScore: 2.1 
    },
    { 
      procedure: 'Tricuspid Valve Procedures', 
      volume: 186, 
      revenue: '$0.8M', 
      growth: '+15.2%',
      margin: 29.3,
      riskScore: 4.1 
    },
    { 
      procedure: 'Pulmonary Valve Replacement', 
      volume: 131, 
      revenue: '$0.5M', 
      growth: '+6.4%',
      margin: 26.8,
      riskScore: 2.5 
    }
  ];

  // Risk Stratification Distribution
  const riskDistribution = [
    { risk: 'Low Risk (STS <4%)', patients: 1847, percentage: 64.8, color: 'bg-emerald-500' },
    { risk: 'Intermediate Risk (STS 4-8%)', patients: 687, percentage: 24.1, color: 'bg-medical-amber-500' },
    { risk: 'High Risk (STS 8-15%)', patients: 234, percentage: 8.2, color: 'bg-orange-500' },
    { risk: 'Prohibitive Risk (STS >15%)', patients: 79, percentage: 2.8, color: 'bg-red-500' }
  ];

  // Quality Outcomes
  const qualityOutcomes = [
    { metric: '30-Day Mortality', value: '1.9%', benchmark: '2.5%', status: 'above' },
    { metric: 'Length of Stay (avg)', value: '4.2 days', benchmark: '5.1 days', status: 'above' },
    { metric: 'Readmission Rate', value: '8.7%', benchmark: '11.2%', status: 'above' },
    { metric: 'Infection Rate', value: '1.1%', benchmark: '1.8%', status: 'above' },
    { metric: 'Stroke Rate', value: '1.4%', benchmark: '2.1%', status: 'above' },
    { metric: 'Patient Satisfaction', value: '96.3%', benchmark: '92.1%', status: 'above' }
  ];

  // Financial Performance
  const financialMetrics = [
    { category: 'TAVR Program', revenue: 9800000, margin: 34.2, volume: 1247 },
    { category: 'Surgical AVR', revenue: 4200000, margin: 28.7, volume: 523 },
    { category: 'Mitral Program', revenue: 2900000, margin: 31.5, volume: 418 },
    { category: 'MitraClip', revenue: 1800000, margin: 38.9, volume: 342 },
    { category: 'Tricuspid', revenue: 800000, margin: 29.3, volume: 186 },
    { category: 'Pulmonary', revenue: 500000, margin: 26.8, volume: 131 }
  ];

  // Program Growth Trends
  const growthTrends = [
    { month: 'Jan', tavr: 95, surgical: 42, mitral: 31, mitraclip: 23 },
    { month: 'Feb', tavr: 108, surgical: 38, mitral: 35, mitraclip: 28 },
    { month: 'Mar', tavr: 112, surgical: 45, mitral: 33, mitraclip: 31 },
    { month: 'Apr', tavr: 119, surgical: 41, mitral: 38, mitraclip: 29 },
    { month: 'May', tavr: 125, surgical: 47, mitral: 36, mitraclip: 34 },
    { month: 'Jun', tavr: 131, surgical: 44, mitral: 39, mitraclip: 32 }
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        {executiveKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${kpi.color}-100`}>
                  <IconComponent className={`w-6 h-6 text-${kpi.color}-600`} />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  kpi.trend === 'up' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {kpi.change}
                </div>
              </div>
              <div className="text-3xl font-bold text-steel-900 font-sf mb-2">{kpi.value}</div>
              <div className="text-sm text-steel-600">{kpi.title}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Procedure Volume Analysis */}
        <div className="col-span-2 bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Procedure Volume & Revenue Analysis</h3>
            <BarChart3 className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {procedureVolumes.map((procedure, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:shadow-retina-2 transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-steel-900">{procedure.procedure}</div>
                    <div className="text-sm text-steel-600">STS Risk Score: {procedure.riskScore}%</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    procedure.growth.startsWith('+') 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {procedure.growth}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-steel-600">Volume</div>
                    <div className="text-lg font-semibold text-steel-900">{procedure.volume}</div>
                  </div>
                  <div>
                    <div className="text-sm text-steel-600">Revenue</div>
                    <div className="text-lg font-semibold text-steel-900">{procedure.revenue}</div>
                  </div>
                  <div>
                    <div className="text-sm text-steel-600">Margin</div>
                    <div className="text-lg font-semibold text-steel-900">{procedure.margin}%</div>
                  </div>
                  <div className="w-full bg-steel-100 rounded-full h-2 mt-4">
                    <div 
                      className="h-2 rounded-full bg-medical-purple-500"
                      style={{ width: `${(procedure.volume / 1247) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Stratification */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Risk Stratification</h3>
            <Target className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {riskDistribution.map((risk, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-steel-700">{risk.risk}</span>
                  <span className="text-sm font-semibold text-steel-900">{risk.patients}</span>
                </div>
                <div className="w-full bg-steel-100 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${risk.color}`}
                    style={{ width: `${risk.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-steel-600">{risk.percentage}% of patients</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quality Outcomes Dashboard */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Quality Outcomes vs Benchmarks</h3>
            <Award className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {qualityOutcomes.map((outcome, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Above Benchmark</span>
                </div>
                <div className="text-lg font-semibold text-steel-900">{outcome.value}</div>
                <div className="text-sm text-steel-600">{outcome.metric}</div>
                <div className="text-xs text-steel-500 mt-1">Benchmark: {outcome.benchmark}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Performance Summary */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Financial Performance</h3>
            <DollarSign className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {financialMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-steel-100">
                <div>
                  <div className="font-medium text-steel-900">{metric.category}</div>
                  <div className="text-sm text-steel-600">{metric.volume} procedures</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-steel-900">
                    ${(metric.revenue / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-emerald-600">{metric.margin}% margin</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 font-sf">$19.0M</div>
              <div className="text-sm text-emerald-600">Total Program Revenue</div>
              <div className="text-xs text-emerald-600 mt-1">32.1% Average Margin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Growth Trends */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Program Growth Trends</h3>
          <TrendingUp className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {growthTrends.map((trend, index) => (
            <div key={index} className="text-center p-4 rounded-lg border border-steel-100">
              <div className="text-sm font-medium text-steel-900 mb-3">{trend.month}</div>
              <div className="space-y-2">
                <div className="text-xs text-steel-600">
                  TAVR: <span className="font-semibold text-medical-purple-600">{trend.tavr}</span>
                </div>
                <div className="text-xs text-steel-600">
                  Surgical: <span className="font-semibold text-medical-blue-600">{trend.surgical}</span>
                </div>
                <div className="text-xs text-steel-600">
                  Mitral: <span className="font-semibold text-medical-amber-600">{trend.mitral}</span>
                </div>
                <div className="text-xs text-steel-600">
                  MitraClip: <span className="font-semibold text-emerald-600">{trend.mitraclip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ValvularExecutiveView;