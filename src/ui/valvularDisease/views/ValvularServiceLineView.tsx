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

  // Surgical Valve Program Metrics
  const surgicalValveMetrics = {
    totalCases: 89,
    successRate: 97.2,
    avgProcedureTime: 158,
    avgLengthOfStay: 5.8,
    mortalityRate: 1.8,
    strokeRate: 1.4,
    majorBleeding: 3.2,
    reoperationRate: 2.1
  };

  // Ross Procedure Metrics
  const rossMetrics = {
    totalCases: 23,
    successRate: 95.7,
    avgProcedureTime: 245,
    avgLengthOfStay: 7.2,
    mortalityRate: 2.6,
    strokeRate: 1.3,
    afibrillation: 15.2,
    reoperationRate: 1.8
  };

  // Surgical Valve Type Distribution
  const valveTypes = [
    { type: 'Mechanical Aortic (St. Jude)', count: 28, percentage: 31.5, outcomes: 96.8 },
    { type: 'Bioprosthetic Aortic (Edwards)', count: 24, percentage: 27.0, outcomes: 97.5 },
    { type: 'Ross Procedure (Autograft)', count: 23, percentage: 25.8, outcomes: 95.7 },
    { type: 'Mitral Repair/Replacement', count: 14, percentage: 15.7, outcomes: 97.1 }
  ];

  // Mitral Valve Surgery Program
  const mitralSurgeryMetrics = {
    totalCases: 18,
    repairSuccess: 94.4,
    clinicalSuccess: 92.8,
    avgProcedureTime: 195,
    avgLengthOfStay: 6.2,
    regurgitationReduction: 89.5,
    functionalImprovement: 88.1
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
    { metric: 'Surgical Success Rate', aortic: 97.2, mitral: 94.4, benchmark: 95.0, unit: '%' },
    { metric: 'Length of Stay', aortic: 5.8, mitral: 6.2, benchmark: 6.5, unit: 'days' },
    { metric: '30-Day Mortality', aortic: 1.8, mitral: 2.2, benchmark: 2.8, unit: '%' },
    { metric: 'Stroke Rate', aortic: 1.4, mitral: 1.6, benchmark: 2.5, unit: '%' },
    { metric: 'Major Bleeding', aortic: 3.2, mitral: 3.8, benchmark: 5.1, unit: '%' },
    { metric: 'Reoperation Rate', aortic: 2.1, mitral: 2.4, benchmark: 3.5, unit: '%' }
  ];

  // Surgeon Performance
  const surgeonPerformance = [
    { name: 'Dr. Chen', specialty: 'Aortic Surgery', cases: 45, successRate: 97.8, avgTime: 178, complexity: 'Complex' },
    { name: 'Dr. Thompson', specialty: 'Mitral Surgery', cases: 28, successRate: 96.3, avgTime: 192, complexity: 'Standard' },
    { name: 'Dr. Williams', specialty: 'Ross Procedure', cases: 23, successRate: 95.7, avgTime: 245, complexity: 'High' },
    { name: 'Dr. Garcia', specialty: 'Valve Repair', cases: 31, successRate: 98.1, avgTime: 165, complexity: 'Mixed' },
    { name: 'Dr. Kumar', specialty: 'Complex Valve', cases: 18, successRate: 94.4, avgTime: 220, complexity: 'High' }
  ];

  // Surgical Team Decisions
  const surgicalDecisions = [
    { indication: 'Severe Aortic Stenosis', total: 67, mechanical: 28, bioprosthetic: 39, ross: 0, recommendation: 'Age and lifestyle-based valve selection' },
    { indication: 'Aortic Regurgitation', total: 28, surgical: 13, ross: 15, recommendation: 'Ross procedure preferred for young patients with AR' },
    { indication: 'Mitral Regurgitation', total: 18, repair: 14, replacement: 4, recommendation: 'Repair preferred when feasible' },
    { indication: 'Bicuspid Aortic Valve with AR', total: 23, ross: 15, conventional: 8, recommendation: 'Ross procedure for young patients with AR' }
  ];

  // Surgical Volume Trends
  const surgicalTrends = [
    { month: 'Jan', aortic: 12, mitral: 4, ross: 3, complex: 2 },
    { month: 'Feb', aortic: 14, mitral: 5, ross: 4, complex: 3 },
    { month: 'Mar', aortic: 11, mitral: 6, ross: 4, complex: 2 },
    { month: 'Apr', aortic: 13, mitral: 3, ross: 5, complex: 1 },
    { month: 'May', aortic: 15, mitral: 7, ross: 2, complex: 4 },
    { month: 'Jun', aortic: 16, mitral: 5, ross: 5, complex: 3 }
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
            <span className="text-sm text-steel-600">Surgical Cases</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{surgicalValveMetrics.totalCases}</div>
          <div className="text-sm text-steel-600">This Month</div>
          <div className="text-xs text-emerald-600 mt-1">+18.2% from last month</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-steel-600">Surgical Success</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{surgicalValveMetrics.successRate}%</div>
          <div className="text-sm text-steel-600">Valve Surgery</div>
          <div className="text-xs text-emerald-600 mt-1">Above benchmark</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-blue-100">
              <Timer className="w-5 h-5 text-medical-blue-600" />
            </div>
            <span className="text-sm text-steel-600">Avg Procedure</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{surgicalValveMetrics.avgProcedureTime}min</div>
          <div className="text-sm text-steel-600">Surgery Duration</div>
          <div className="text-xs text-emerald-600 mt-1">8min improvement</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-amber-100">
              <Award className="w-5 h-5 text-medical-amber-600" />
            </div>
            <span className="text-sm text-steel-600">Length of Stay</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{surgicalValveMetrics.avgLengthOfStay}</div>
          <div className="text-sm text-steel-600">Days (avg)</div>
          <div className="text-xs text-emerald-600 mt-1">Below target</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* TAVR vs Surgical Comparison */}
        <div className="col-span-2 bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Aortic vs Mitral Surgery Quality Metrics</h3>
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
                    <div className="text-lg font-semibold text-medical-purple-700">{metric.aortic}{metric.unit}</div>
                    <div className="text-xs text-medical-purple-600">Aortic</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg bg-medical-blue-50 border border-medical-blue-200">
                    <div className="text-lg font-semibold text-medical-blue-700">{metric.mitral}{metric.unit}</div>
                    <div className="text-xs text-medical-blue-600">Mitral</div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    {metric.aortic < metric.benchmark && metric.mitral < metric.benchmark ? (
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
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Surgical Valve Performance</h3>
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
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Surgeon Performance</h3>
            <Users className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-3">
            {surgeonPerformance.map((operator, index) => (
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

      {/* Mitral Surgery Program Performance */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Mitral Surgery Program Performance</h3>
          <Activity className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-600 font-sf">{mitralSurgeryMetrics.totalCases}</div>
            <div className="text-sm text-emerald-700 font-medium">Total Cases</div>
            <div className="text-xs text-emerald-600 mt-1">This Quarter</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-blue-50 border border-medical-blue-200">
            <div className="text-2xl font-bold text-medical-blue-600 font-sf">{mitralSurgeryMetrics.repairSuccess}%</div>
            <div className="text-sm text-medical-blue-700 font-medium">Repair Success</div>
            <div className="text-xs text-medical-blue-600 mt-1">Surgical Repair</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-purple-50 border border-medical-purple-200">
            <div className="text-2xl font-bold text-medical-purple-600 font-sf">{mitralSurgeryMetrics.clinicalSuccess}%</div>
            <div className="text-sm text-medical-purple-700 font-medium">Clinical Success</div>
            <div className="text-xs text-medical-purple-600 mt-1">30-Day Outcomes</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-medical-amber-50 border border-medical-amber-200">
            <div className="text-2xl font-bold text-medical-amber-600 font-sf">{mitralSurgeryMetrics.regurgitationReduction}%</div>
            <div className="text-sm text-medical-amber-700 font-medium">MR Reduction</div>
            <div className="text-xs text-medical-amber-600 mt-1">≤ Moderate MR</div>
          </div>
        </div>
      </div>

      {/* Surgical Team Decision Analytics */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Surgical Team Decision Patterns</h3>
          <Stethoscope className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="space-y-4">
          {surgicalDecisions.map((decision, index) => (
            <div key={index} className="p-4 rounded-lg border border-steel-100">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-steel-900">{decision.indication}</div>
                <div className="text-sm text-steel-600">Total: {decision.total} cases</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-2">
                {decision.mechanical && (
                  <div className="text-center p-2 rounded bg-medical-purple-50">
                    <div className="text-lg font-semibold text-medical-purple-700">{decision.mechanical}</div>
                    <div className="text-xs text-medical-purple-600">Mechanical</div>
                  </div>
                )}
                {decision.bioprosthetic && (
                  <div className="text-center p-2 rounded bg-medical-blue-50">
                    <div className="text-lg font-semibold text-medical-blue-700">{decision.bioprosthetic}</div>
                    <div className="text-xs text-medical-blue-600">Bioprosthetic</div>
                  </div>
                )}
                {decision.ross && (
                  <div className="text-center p-2 rounded bg-emerald-50">
                    <div className="text-lg font-semibold text-emerald-700">{decision.ross}</div>
                    <div className="text-xs text-emerald-600">Ross</div>
                  </div>
                )}
                {decision.surgical && (
                  <div className="text-center p-2 rounded bg-medical-blue-50">
                    <div className="text-lg font-semibold text-medical-blue-700">{decision.surgical}</div>
                    <div className="text-xs text-medical-blue-600">Surgical</div>
                  </div>
                )}
                {decision.repair && (
                  <div className="text-center p-2 rounded bg-emerald-50">
                    <div className="text-lg font-semibold text-emerald-700">{decision.repair}</div>
                    <div className="text-xs text-emerald-600">Repair</div>
                  </div>
                )}
                {decision.replacement && (
                  <div className="text-center p-2 rounded bg-medical-amber-50">
                    <div className="text-lg font-semibold text-medical-amber-700">{decision.replacement}</div>
                    <div className="text-xs text-medical-amber-600">Replacement</div>
                  </div>
                )}
                {decision.conventional && (
                  <div className="text-center p-2 rounded bg-medical-blue-50">
                    <div className="text-lg font-semibold text-medical-blue-700">{decision.conventional}</div>
                    <div className="text-xs text-medical-blue-600">Conventional</div>
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