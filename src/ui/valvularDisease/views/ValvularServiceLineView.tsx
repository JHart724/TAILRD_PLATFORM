import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Users,
  BarChart3,
  Shield,
  Timer,
  Award,
  Stethoscope,
  Calendar
} from 'lucide-react';

const ValvularServiceLineView: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  // TAVR Program Metrics
  const tavrMetrics = {
    totalCases: 131,
    successRate: 98.5,
    avgProcedureTime: 72,
    avgLengthOfStay: 2.3,
    mortalityRate: 1.5,
    strokeRate: 1.2,
    majorBleeding: 2.8,
    vascularComplications: 3.1
  };

  // Surgical AVR Metrics
  const surgicalAvrMetrics = {
    totalCases: 47,
    successRate: 96.8,
    avgProcedureTime: 185,
    avgLengthOfStay: 6.8,
    mortalityRate: 2.1,
    strokeRate: 1.9,
    afibrillation: 18.5,
    reoperationRate: 2.3
  };

  // Valve Type Distribution
  const valveTypes = [
    { type: 'Medtronic CoreValve Evolut', count: 42, percentage: 32.1, outcomes: 98.5 },
    { type: 'Edwards SAPIEN 3', count: 38, percentage: 29.0, outcomes: 98.7 },
    { type: 'Boston Scientific Lotus', count: 28, percentage: 21.4, outcomes: 97.8 },
    { type: 'Abbott Portico', count: 23, percentage: 17.5, outcomes: 98.1 }
  ];

  // MitraClip Program
  const mitraClipMetrics = {
    totalCases: 34,
    technicalSuccess: 97.1,
    clinicalSuccess: 91.2,
    avgProcedureTime: 95,
    avgLengthOfStay: 1.8,
    mrReduction: 88.2,
    functionalImprovement: 82.4
  };

  // Risk Score Analysis
  const riskAnalysis = [
    { riskCategory: 'Low Risk (STS <4%)', count: 89, percentage: 67.9, mortality: 0.8 },
    { riskCategory: 'Intermediate Risk (STS 4-8%)', count: 28, percentage: 21.4, mortality: 1.9 },
    { riskCategory: 'High Risk (STS 8-15%)', count: 11, percentage: 8.4, mortality: 4.2 },
    { riskCategory: 'Prohibitive Risk (STS >15%)', count: 3, percentage: 2.3, mortality: 7.8 }
  ];

  // Quality Metrics Comparison
  const qualityMetrics = [
    { metric: 'Device Success Rate', tavr: 98.5, surgical: 96.8, benchmark: 95.0, unit: '%' },
    { metric: 'Length of Stay', tavr: 2.3, surgical: 6.8, benchmark: 4.5, unit: 'days' },
    { metric: '30-Day Mortality', tavr: 1.5, surgical: 2.1, benchmark: 2.8, unit: '%' },
    { metric: 'Stroke Rate', tavr: 1.2, surgical: 1.9, benchmark: 2.5, unit: '%' },
    { metric: 'Major Bleeding', tavr: 2.8, surgical: 4.2, benchmark: 5.1, unit: '%' },
    { metric: 'Readmission Rate', tavr: 6.1, surgical: 8.7, benchmark: 12.3, unit: '%' }
  ];

  // Operator Performance
  const operatorPerformance = [
    { name: 'Dr. Mitchell', specialty: 'TAVR/Structural', cases: 78, successRate: 99.2, avgTime: 68, complexity: 'High' },
    { name: 'Dr. Chen', specialty: 'Cardiac Surgery', cases: 45, successRate: 97.8, avgTime: 178, complexity: 'Complex' },
    { name: 'Dr. Rodriguez', specialty: 'TAVR/MitraClip', cases: 52, successRate: 98.1, avgTime: 75, complexity: 'Mixed' },
    { name: 'Dr. Thompson', specialty: 'Cardiac Surgery', cases: 38, successRate: 96.3, avgTime: 192, complexity: 'Standard' },
    { name: 'Dr. Park', specialty: 'TAVR/Structural', cases: 41, successRate: 98.7, avgTime: 71, complexity: 'High' }
  ];

  // Heart Team Decisions
  const heartTeamDecisions = [
    { indication: 'Severe Aortic Stenosis', total: 156, tavr: 89, surgical: 67, recommendation: 'TAVR preferred for age >75' },
    { indication: 'Aortic Regurgitation', total: 28, tavr: 8, surgical: 20, recommendation: 'Surgical preferred' },
    { indication: 'Mitral Regurgitation', total: 45, mitraClip: 34, surgical: 11, recommendation: 'MitraClip first-line' },
    { indication: 'Tricuspid Regurgitation', total: 12, transcatheter: 7, surgical: 5, recommendation: 'Case-by-case' }
  ];

  // Device Utilization Trends
  const deviceTrends = [
    { month: 'Jan', medtronic: 12, edwards: 8, boston: 6, abbott: 4 },
    { month: 'Feb', medtronic: 14, edwards: 10, boston: 5, abbott: 6 },
    { month: 'Mar', medtronic: 11, edwards: 12, boston: 7, abbott: 5 },
    { month: 'Apr', medtronic: 13, edwards: 9, boston: 8, abbott: 4 },
    { month: 'May', medtronic: 15, edwards: 11, boston: 6, abbott: 7 },
    { month: 'Jun', medtronic: 16, edwards: 13, boston: 8, abbott: 5 }
  ];

  return (
    <div className="space-y-6">
      {/* Program Overview KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-purple-100">
              <Heart className="w-5 h-5 text-medical-purple-600" />
            </div>
            <span className="text-sm text-steel-600">TAVR Cases</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{tavrMetrics.totalCases}</div>
          <div className="text-sm text-steel-600">This Month</div>
          <div className="text-xs text-emerald-600 mt-1">+18.2% from last month</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-steel-600">Device Success</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{tavrMetrics.successRate}%</div>
          <div className="text-sm text-steel-600">TAVR Program</div>
          <div className="text-xs text-emerald-600 mt-1">Above benchmark</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-blue-100">
              <Timer className="w-5 h-5 text-medical-blue-600" />
            </div>
            <span className="text-sm text-steel-600">Avg Procedure</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{tavrMetrics.avgProcedureTime}min</div>
          <div className="text-sm text-steel-600">TAVR Duration</div>
          <div className="text-xs text-emerald-600 mt-1">8min improvement</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-amber-100">
              <Award className="w-5 h-5 text-medical-amber-600" />
            </div>
            <span className="text-sm text-steel-600">Length of Stay</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{tavrMetrics.avgLengthOfStay}</div>
          <div className="text-sm text-steel-600">Days (avg)</div>
          <div className="text-xs text-emerald-600 mt-1">Below target</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* TAVR vs Surgical Comparison */}
        <div className="col-span-2 bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">TAVR vs Surgical AVR Quality Metrics</h3>
            <BarChart3 className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {qualityMetrics.map((metric, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-steel-900">{metric.metric}</span>
                  <span className="text-xs text-steel-600">Benchmark: {metric.benchmark}{metric.unit}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-medical-purple-50 border border-medical-purple-200">
                    <div className="text-lg font-semibold text-medical-purple-700">{metric.tavr}{metric.unit}</div>
                    <div className="text-xs text-medical-purple-600">TAVR</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-medical-blue-50 border border-medical-blue-200">
                    <div className="text-lg font-semibold text-medical-blue-700">{metric.surgical}{metric.unit}</div>
                    <div className="text-xs text-medical-blue-600">Surgical</div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    {metric.tavr < metric.benchmark && metric.surgical < metric.benchmark ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Stratification */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">STS Risk Analysis</h3>
            <Target className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {riskAnalysis.map((risk, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-steel-700">{risk.riskCategory}</span>
                  <span className="text-sm font-semibold text-steel-900">{risk.count}</span>
                </div>
                <div className="w-full bg-steel-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-emerald-500' :
                      index === 1 ? 'bg-medical-amber-500' :
                      index === 2 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${risk.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-steel-600">{risk.percentage}% of cases</span>
                  <span className="text-steel-600">Mortality: {risk.mortality}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Valve Device Performance */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">TAVR Device Performance</h3>
            <Shield className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {valveTypes.map((valve, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:shadow-retina-2 transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-steel-900">{valve.type}</div>
                  <div className="text-sm font-semibold text-emerald-600">{valve.outcomes}%</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-steel-600">{valve.count} cases ({valve.percentage}%)</span>
                  </div>
                  <div className="w-24 bg-steel-100 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-medical-purple-500"
                      style={{ width: `${valve.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operator Performance */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Operator Performance</h3>
            <Users className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-3">
            {operatorPerformance.map((operator, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:bg-steel-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-steel-900">{operator.name}</div>
                    <div className="text-sm text-steel-600">{operator.specialty}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    operator.complexity === 'High' || operator.complexity === 'Complex'
                      ? 'bg-red-100 text-red-700'
                      : operator.complexity === 'Mixed'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {operator.complexity}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-steel-600">Cases</div>
                    <div className="font-semibold text-steel-900">{operator.cases}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Success Rate</div>
                    <div className="font-semibold text-steel-900">{operator.successRate}%</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Avg Time</div>
                    <div className="font-semibold text-steel-900">{operator.avgTime}min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MitraClip Program Performance */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">MitraClip Program Performance</h3>
          <Activity className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-600 font-sf">{mitraClipMetrics.totalCases}</div>
            <div className="text-sm text-emerald-700 font-medium">Total Cases</div>
            <div className="text-xs text-emerald-600 mt-1">This Quarter</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-blue-50 border border-medical-blue-200">
            <div className="text-2xl font-bold text-medical-blue-600 font-sf">{mitraClipMetrics.technicalSuccess}%</div>
            <div className="text-sm text-medical-blue-700 font-medium">Technical Success</div>
            <div className="text-xs text-medical-blue-600 mt-1">Device Deployment</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-purple-50 border border-medical-purple-200">
            <div className="text-2xl font-bold text-medical-purple-600 font-sf">{mitraClipMetrics.clinicalSuccess}%</div>
            <div className="text-sm text-medical-purple-700 font-medium">Clinical Success</div>
            <div className="text-xs text-medical-purple-600 mt-1">30-Day Outcomes</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-amber-50 border border-medical-amber-200">
            <div className="text-2xl font-bold text-medical-amber-600 font-sf">{mitraClipMetrics.mrReduction}%</div>
            <div className="text-sm text-medical-amber-700 font-medium">MR Reduction</div>
            <div className="text-xs text-medical-amber-600 mt-1">≤ Moderate MR</div>
          </div>
        </div>
      </div>

      {/* Heart Team Decision Analytics */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Heart Team Decision Patterns</h3>
          <Stethoscope className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="space-y-4">
          {heartTeamDecisions.map((decision, index) => (
            <div key={index} className="p-4 rounded-lg border border-steel-100">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-steel-900">{decision.indication}</div>
                <div className="text-sm text-steel-600">Total: {decision.total} cases</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-2">
                {decision.tavr && (
                  <div className="text-center p-2 rounded bg-medical-purple-50">
                    <div className="text-lg font-semibold text-medical-purple-700">{decision.tavr}</div>
                    <div className="text-xs text-medical-purple-600">TAVR</div>
                  </div>
                )}
                {decision.surgical && (
                  <div className="text-center p-2 rounded bg-medical-blue-50">
                    <div className="text-lg font-semibold text-medical-blue-700">{decision.surgical}</div>
                    <div className="text-xs text-medical-blue-600">Surgical</div>
                  </div>
                )}
                {decision.mitraClip && (
                  <div className="text-center p-2 rounded bg-emerald-50">
                    <div className="text-lg font-semibold text-emerald-700">{decision.mitraClip}</div>
                    <div className="text-xs text-emerald-600">MitraClip</div>
                  </div>
                )}
                {decision.transcatheter && (
                  <div className="text-center p-2 rounded bg-medical-amber-50">
                    <div className="text-lg font-semibold text-medical-amber-700">{decision.transcatheter}</div>
                    <div className="text-xs text-medical-amber-600">Transcatheter</div>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-steel-600 italic">{decision.recommendation}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ValvularServiceLineView;