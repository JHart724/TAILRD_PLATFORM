import React, { useState } from 'react';
import { 
  Navigation, 
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
  Footprints,
  Heart,
  Search
} from 'lucide-react';
import LimbSalvageScreening from '../components/LimbSalvageScreening';

const PeripheralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'procedures' | 'screening'>('procedures');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  // PAD Program Metrics
  const padMetrics = {
    totalProcedures: 187,
    technicalSuccess: 96.8,
    primaryPatency: 89.3,
    limbSalvageRate: 94.3,
    avgProcedureTime: 95,
    avgLengthOfStay: 2.8,
    majorComplications: 3.2,
    thirtyDayReadmission: 8.9
  };

  // Procedure Type Distribution
  const procedureTypes = [
    { type: 'Balloon Angioplasty', count: 67, percentage: 35.8, success: 94.2 },
    { type: 'Drug-Eluting Stents', count: 48, percentage: 25.7, success: 97.9 },
    { type: 'Atherectomy', count: 34, percentage: 18.2, success: 95.6 },
    { type: 'Drug-Coated Balloons', count: 28, percentage: 15.0, success: 96.4 },
    { type: 'Covered Stents', count: 10, percentage: 5.3, success: 90.0 }
  ];

  // Vessel Territory Analysis
  const vesselTerritories = [
    { territory: 'Superficial Femoral Artery', cases: 89, success: 97.8, patency: 91.2 },
    { territory: 'Popliteal Artery', cases: 42, success: 95.2, patency: 87.8 },
    { territory: 'Tibial Vessels', cases: 67, success: 94.0, patency: 82.1 },
    { territory: 'Common Femoral Artery', cases: 23, success: 100.0, patency: 95.7 },
    { territory: 'Iliac Arteries', cases: 18, success: 100.0, patency: 94.4 }
  ];

  // Wound Care Outcomes
  const woundCareOutcomes = {
    totalPatients: 142,
    completeHealing: 87.3,
    partialHealing: 9.9,
    noImprovement: 2.8,
    avgHealingTime: 89,
    amputationRate: 3.5,
    infectionRate: 7.2
  };

  // WIfI Risk Stratification (proper matrix)
  const riskStratification = [
    { risk: 'Clinical Stage 1 (WIfI 0)', count: 78, percentage: 41.7, amputation: 2.0 },
    { risk: 'Clinical Stage 2 (WIfI 1)', count: 64, percentage: 34.2, amputation: 5.0 },
    { risk: 'Clinical Stage 3 (WIfI 2)', count: 32, percentage: 17.1, amputation: 15.0 },
    { risk: 'Clinical Stage 4 (WIfI 3)', count: 13, percentage: 7.0, amputation: 35.0 }
  ];

  // Device Performance
  const devicePerformance = [
    { device: 'Medtronic IN.PACT Admiral', usage: 28, patency: 89.3, restenosis: 8.7 },
    { device: 'Boston Scientific Ranger', usage: 21, patency: 87.2, restenosis: 11.4 },
    { device: 'Philips SterTec Blue', usage: 19, patency: 91.6, restenosis: 7.2 },
    { device: 'Abbott Supera Stent', usage: 16, patency: 93.8, restenosis: 6.3 },
    { device: 'CSI Orbital Atherectomy', usage: 12, patency: 88.9, restenosis: 9.5 }
  ];

  // Operator Performance
  const operatorPerformance = [
    { name: 'Dr. Wilson', procedures: 67, successRate: 98.5, avgTime: 87, specialty: 'Endovascular' },
    { name: 'Dr. Martinez', procedures: 54, successRate: 96.3, avgTime: 92, specialty: 'Vascular Surgery' },
    { name: 'Dr. Kim', procedures: 43, successRate: 97.7, avgTime: 89, specialty: 'Endovascular' },
    { name: 'Dr. Thompson', procedures: 38, successRate: 94.7, avgTime: 98, specialty: 'Vascular Surgery' },
    { name: 'Dr. Chen', procedures: 29, successRate: 96.6, avgTime: 85, specialty: 'Endovascular' }
  ];

  // Quality Metrics
  const qualityMetrics = [
    { metric: 'Technical Success Rate', value: 96.8, target: 94.0, status: 'above', unit: '%' },
    { metric: 'Primary Patency (1yr)', value: 89.3, target: 85.0, status: 'above', unit: '%' },
    { metric: 'Major Amputation Rate', value: 3.2, target: 5.0, status: 'below', unit: '%' },
    { metric: 'Procedure Time (avg)', value: 95, target: 120, status: 'below', unit: 'min' },
    { metric: 'Length of Stay (avg)', value: 2.8, target: 3.5, status: 'below', unit: 'days' },
    { metric: 'Complication Rate', value: 3.2, target: 5.5, status: 'below', unit: '%' }
  ];

  // Monthly Trends
  const monthlyTrends = [
    { month: 'Jan', procedures: 28, success: 96.4, patency: 88.7 },
    { month: 'Feb', procedures: 31, success: 96.8, patency: 89.1 },
    { month: 'Mar', procedures: 34, success: 97.1, patency: 90.2 },
    { month: 'Apr', procedures: 29, success: 96.6, patency: 88.9 },
    { month: 'May', procedures: 32, success: 97.2, patency: 89.8 },
    { month: 'Jun', procedures: 33, success: 96.5, patency: 89.6 }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'procedures', label: 'Procedure Analytics', icon: Activity },
          { id: 'screening', label: 'Limb Salvage Screening', icon: Search }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-medical-teal-500 text-medical-teal-600 bg-medical-teal-50'
                  : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Procedure Analytics Tab */}
      {activeTab === 'procedures' && (
        <div className="space-y-6">
          {/* Header Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-teal-100">
              <Navigation className="w-5 h-5 text-medical-teal-600" />
            </div>
            <span className="text-sm text-steel-600">This Month</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{padMetrics.totalProcedures}</div>
          <div className="text-sm text-steel-600">PAD Procedures</div>
          <div className="text-xs text-emerald-600 mt-1">+14.2% from last month</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-steel-600">Technical</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{padMetrics.technicalSuccess}%</div>
          <div className="text-sm text-steel-600">Success Rate</div>
          <div className="text-xs text-emerald-600 mt-1">Above benchmark</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-blue-100">
              <Heart className="w-5 h-5 text-medical-blue-600" />
            </div>
            <span className="text-sm text-steel-600">1-Year</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{padMetrics.primaryPatency}%</div>
          <div className="text-sm text-steel-600">Primary Patency</div>
          <div className="text-xs text-emerald-600 mt-1">+4.3% vs target</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-amber-100">
              <Footprints className="w-5 h-5 text-medical-amber-600" />
            </div>
            <span className="text-sm text-steel-600">Overall</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{padMetrics.limbSalvageRate}%</div>
          <div className="text-sm text-steel-600">Limb Salvage</div>
          <div className="text-xs text-emerald-600 mt-1">Exceeds target</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Procedure Type Analysis */}
        <div className="col-span-2 bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Procedure Type Performance</h3>
            <BarChart3 className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {procedureTypes.map((procedure, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:shadow-retina-2 transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-steel-900">{procedure.type}</div>
                  <div className="text-sm font-semibold text-emerald-600">{procedure.success}%</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-steel-600">{procedure.count} cases ({procedure.percentage}%)</span>
                  </div>
                  <div className="w-32 bg-steel-100 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-medical-teal-500"
                      style={{ width: `${procedure.percentage}%` }}
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
            <h3 className="text-lg font-semibold text-steel-900 font-sf">WIfI Clinical Staging</h3>
            <Target className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {riskStratification.map((risk, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-steel-700">{risk.risk}</span>
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
                  <span className="text-steel-600">Amputation: {risk.amputation}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Vessel Territory Outcomes */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Vessel Territory Outcomes</h3>
            <Activity className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {vesselTerritories.map((vessel, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:shadow-retina-2 transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-steel-900">{vessel.territory}</div>
                  <div className="text-sm text-steel-600">{vessel.cases} cases</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-steel-600">Technical Success</div>
                    <div className="text-lg font-semibold text-emerald-600">{vessel.success}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-steel-600">1-Year Patency</div>
                    <div className="text-lg font-semibold text-medical-blue-600">{vessel.patency}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wound Care Program */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Wound Care Program</h3>
            <Shield className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-600 font-sf">{woundCareOutcomes.completeHealing}%</div>
              <div className="text-sm text-emerald-700">Complete Healing</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-medical-amber-50 border border-medical-amber-200">
              <div className="text-2xl font-bold text-medical-amber-600 font-sf">{woundCareOutcomes.avgHealingTime}</div>
              <div className="text-sm text-medical-amber-700">Avg Healing (days)</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-steel-50">
              <span className="text-sm text-steel-600">Total Patients</span>
              <span className="font-semibold text-steel-900">{woundCareOutcomes.totalPatients}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-steel-50">
              <span className="text-sm text-steel-600">Partial Healing</span>
              <span className="font-semibold text-steel-900">{woundCareOutcomes.partialHealing}%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-steel-50">
              <span className="text-sm text-steel-600">Amputation Rate</span>
              <span className="font-semibold text-red-600">{woundCareOutcomes.amputationRate}%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-steel-50">
              <span className="text-sm text-steel-600">Infection Rate</span>
              <span className="font-semibold text-orange-600">{woundCareOutcomes.infectionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quality Metrics */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Quality Metrics</h3>
            <Award className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {qualityMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-steel-100">
                <div>
                  <div className="text-sm font-medium text-steel-900">{metric.metric}</div>
                  <div className="text-xs text-steel-600">Target: {metric.target}{metric.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-steel-900">{metric.value}{metric.unit}</div>
                  <div className={`text-xs ${
                    (metric.status === 'above' && !metric.metric.includes('Rate') && !metric.metric.includes('Time')) ||
                    (metric.status === 'below' && (metric.metric.includes('Rate') || metric.metric.includes('Time')))
                      ? 'text-emerald-600' 
                      : 'text-orange-600'
                  }`}>
                    {metric.status === 'above' ? '↑' : '↓'} Target
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
                    operator.specialty === 'Endovascular'
                      ? 'bg-medical-teal-100 text-medical-teal-700'
                      : 'bg-medical-blue-100 text-medical-blue-700'
                  }`}>
                    {operator.specialty}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-steel-600">Procedures</div>
                    <div className="font-semibold text-steel-900">{operator.procedures}</div>
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

      {/* Device Performance */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Device Performance Analysis</h3>
          <Shield className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {devicePerformance.map((device, index) => (
            <div key={index} className="p-4 rounded-lg border border-steel-100 text-center">
              <div className="font-medium text-steel-900 mb-2 text-sm">{device.device}</div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-steel-600">Usage</div>
                  <div className="font-semibold text-steel-900">{device.usage}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600">Patency</div>
                  <div className="font-semibold text-emerald-600">{device.patency}%</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600">Restenosis</div>
                  <div className="font-semibold text-orange-600">{device.restenosis}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Performance Trends */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">Monthly Performance Trends</h3>
          <TrendingUp className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {monthlyTrends.map((trend, index) => (
            <div key={index} className="text-center p-4 rounded-lg border border-steel-100">
              <div className="text-sm font-medium text-steel-900 mb-3">{trend.month}</div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-steel-600">Procedures</div>
                  <div className="font-semibold text-medical-teal-600">{trend.procedures}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600">Success</div>
                  <div className="font-semibold text-emerald-600">{trend.success}%</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600">Patency</div>
                  <div className="font-semibold text-medical-blue-600">{trend.patency}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}

      {/* Limb Salvage Screening Tab */}
      {activeTab === 'screening' && (
        <LimbSalvageScreening />
      )}
    </div>
  );
};

export default PeripheralServiceLineView;