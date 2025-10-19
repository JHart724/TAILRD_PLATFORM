import React, { useState } from 'react';
import { 
  Navigation, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  Award,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Heart,
  Footprints
} from 'lucide-react';

const PeripheralExecutiveView: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('quarter');

  // Executive KPIs
  const executiveKPIs = [
    {
      title: 'Total PAD Procedures',
      value: '1,842',
      change: '+16.7%',
      trend: 'up',
      icon: Navigation,
      color: 'medical-teal'
    },
    {
      title: 'Program Revenue',
      value: '$12.8M',
      change: '+19.4%',
      trend: 'up',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Limb Salvage Rate',
      value: '94.3%',
      change: '+2.1%',
      trend: 'up',
      icon: Footprints,
      color: 'medical-blue'
    },
    {
      title: 'Patient Satisfaction',
      value: '4.7/5',
      change: '+0.3',
      trend: 'up',
      icon: Award,
      color: 'medical-amber'
    }
  ];

  // Procedure Volume by Type
  const procedureVolumes = [
    { 
      procedure: 'Endovascular Revascularization', 
      volume: 847, 
      revenue: '$5.2M', 
      growth: '+22.1%',
      margin: 38.7,
      complexity: 'Standard-Complex' 
    },
    { 
      procedure: 'Peripheral Bypass Surgery', 
      volume: 298, 
      revenue: '$2.8M', 
      growth: '+8.9%',
      margin: 28.3,
      complexity: 'Complex' 
    },
    { 
      procedure: 'Diabetic Foot Salvage', 
      volume: 421, 
      revenue: '$2.1M', 
      growth: '+15.4%',
      margin: 31.2,
      complexity: 'Complex-Critical' 
    },
    { 
      procedure: 'Carotid Interventions', 
      volume: 189, 
      revenue: '$1.7M', 
      growth: '+12.3%',
      margin: 42.1,
      complexity: 'Standard' 
    },
    { 
      procedure: 'Renal Artery Interventions', 
      volume: 87, 
      revenue: '$0.6M', 
      growth: '+18.7%',
      margin: 35.9,
      complexity: 'Standard-Complex' 
    }
  ];

  // Disease Severity Distribution
  const diseaseDistribution = [
    { severity: 'Claudication (Rutherford 1-3)', patients: 743, percentage: 59.6, color: 'bg-emerald-500' },
    { severity: 'Rest Pain (Rutherford 4)', patients: 187, percentage: 15.0, color: 'bg-medical-amber-500' },
    { severity: 'Tissue Loss (Rutherford 5-6)', patients: 317, percentage: 25.4, color: 'bg-red-500' }
  ];

  // Quality Outcomes
  const qualityOutcomes = [
    { metric: 'Technical Success Rate', value: '96.8%', benchmark: '94.2%', status: 'above' },
    { metric: 'Primary Patency (12mo)', value: '89.3%', benchmark: '85.1%', status: 'above' },
    { metric: 'Major Amputation Rate', value: '3.7%', benchmark: '5.8%', status: 'above' },
    { metric: 'Length of Stay (avg)', value: '2.8 days', benchmark: '3.6 days', status: 'above' },
    { metric: '30-Day Readmission', value: '8.9%', benchmark: '12.4%', status: 'above' },
    { metric: 'Wound Healing Rate', value: '87.2%', benchmark: '82.6%', status: 'above' }
  ];

  // Financial Performance
  const financialMetrics = [
    { category: 'Endovascular', revenue: 5200000, margin: 38.7, volume: 847 },
    { category: 'Bypass Surgery', revenue: 2800000, margin: 28.3, volume: 298 },
    { category: 'Foot Salvage', revenue: 2100000, margin: 31.2, volume: 421 },
    { category: 'Carotid', revenue: 1700000, margin: 42.1, volume: 189 },
    { category: 'Renal', revenue: 600000, margin: 35.9, volume: 87 }
  ];

  // Risk Factor Analysis
  const riskFactors = [
    { factor: 'Diabetes Mellitus', prevalence: 78.3, impact: 'High', management: 'Optimized' },
    { factor: 'Smoking History', prevalence: 67.2, impact: 'High', management: 'Cessation Program' },
    { factor: 'Hypertension', prevalence: 89.1, impact: 'Moderate', management: 'Controlled' },
    { factor: 'Dyslipidemia', prevalence: 82.4, impact: 'Moderate', management: 'Statin Therapy' },
    { factor: 'Chronic Kidney Disease', prevalence: 34.7, impact: 'High', management: 'Nephrology Co-care' },
    { factor: 'Coronary Artery Disease', prevalence: 56.8, impact: 'High', management: 'Cardiology Co-care' }
  ];

  // Program Growth Trends
  const growthTrends = [
    { month: 'Jan', endovascular: 68, bypass: 23, foot: 31, carotid: 14 },
    { month: 'Feb', endovascular: 74, bypass: 21, foot: 35, carotid: 16 },
    { month: 'Mar', endovascular: 82, bypass: 25, foot: 38, carotid: 18 },
    { month: 'Apr', endovascular: 79, bypass: 27, foot: 42, carotid: 15 },
    { month: 'May', endovascular: 87, bypass: 24, foot: 39, carotid: 19 },
    { month: 'Jun', endovascular: 91, bypass: 28, foot: 44, carotid: 17 }
  ];

  // Limb Salvage Outcomes
  const limbSalvageOutcomes = [
    { timeframe: '30 Days', rate: 98.7, target: 95.0 },
    { timeframe: '6 Months', rate: 96.2, target: 90.0 },
    { timeframe: '1 Year', rate: 94.3, target: 85.0 },
    { timeframe: '2 Years', rate: 91.8, target: 80.0 }
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
            <h3 className="text-lg font-semibold text-steel-900 font-sf">PAD Procedure Volume & Revenue Analysis</h3>
            <BarChart3 className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {procedureVolumes.map((procedure, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:shadow-retina-2 transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-steel-900">{procedure.procedure}</div>
                    <div className="text-sm text-steel-600">Complexity: {procedure.complexity}</div>
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
                      className="h-2 rounded-full bg-medical-teal-500"
                      style={{ width: `${(procedure.volume / 847) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disease Severity Distribution */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Disease Severity</h3>
            <Target className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {diseaseDistribution.map((disease, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-steel-700">{disease.severity}</span>
                  <span className="text-sm font-semibold text-steel-900">{disease.patients}</span>
                </div>
                <div className="w-full bg-steel-100 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${disease.color}`}
                    style={{ width: `${disease.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-steel-600">{disease.percentage}% of patients</div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-medical-teal-50 rounded-lg border border-medical-teal-200">
            <div className="text-center">
              <div className="text-sm text-medical-teal-700 font-medium">Critical Limb Ischemia</div>
              <div className="text-2xl font-bold text-medical-teal-600 font-sf">25.4%</div>
              <div className="text-xs text-medical-teal-600">Requiring urgent intervention</div>
            </div>
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

        {/* Limb Salvage Outcomes */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Limb Salvage Outcomes</h3>
            <Footprints className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {limbSalvageOutcomes.map((outcome, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-steel-100">
                <div>
                  <div className="font-medium text-steel-900">{outcome.timeframe}</div>
                  <div className="text-sm text-steel-600">Target: {outcome.target}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-600 font-sf">{outcome.rate}%</div>
                  <div className="text-xs text-emerald-600">
                    +{(outcome.rate - outcome.target).toFixed(1)}% vs target
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 font-sf">94.3%</div>
              <div className="text-sm text-emerald-600">Overall Limb Salvage Rate</div>
              <div className="text-xs text-emerald-600 mt-1">Above national average</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Risk Factor Management */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Risk Factor Management</h3>
            <AlertTriangle className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-3">
            {riskFactors.map((factor, index) => (
              <div key={index} className="p-3 rounded-lg border border-steel-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-steel-900">{factor.factor}</div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    factor.impact === 'High' 
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {factor.impact} Impact
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-steel-600">Prevalence: </span>
                    <span className="font-semibold text-steel-900">{factor.prevalence}%</span>
                  </div>
                  <div className="text-sm text-emerald-600">{factor.management}</div>
                </div>
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
              <div className="text-2xl font-bold text-emerald-700 font-sf">$12.4M</div>
              <div className="text-sm text-emerald-600">Total Program Revenue</div>
              <div className="text-xs text-emerald-600 mt-1">35.2% Average Margin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Growth Trends */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">PAD Program Growth Trends</h3>
          <TrendingUp className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {growthTrends.map((trend, index) => (
            <div key={index} className="text-center p-4 rounded-lg border border-steel-100">
              <div className="text-sm font-medium text-steel-900 mb-3">{trend.month}</div>
              <div className="space-y-2">
                <div className="text-xs text-steel-600">
                  Endovascular: <span className="font-semibold text-medical-teal-600">{trend.endovascular}</span>
                </div>
                <div className="text-xs text-steel-600">
                  Bypass: <span className="font-semibold text-medical-blue-600">{trend.bypass}</span>
                </div>
                <div className="text-xs text-steel-600">
                  Foot Salvage: <span className="font-semibold text-medical-amber-600">{trend.foot}</span>
                </div>
                <div className="text-xs text-steel-600">
                  Carotid: <span className="font-semibold text-emerald-600">{trend.carotid}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PeripheralExecutiveView;