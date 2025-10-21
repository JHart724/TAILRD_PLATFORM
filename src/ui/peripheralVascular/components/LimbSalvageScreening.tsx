import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Users, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Target,
  Activity,
  Heart,
  Stethoscope,
  Search,
  Filter
} from 'lucide-react';

interface HighRiskPatient {
  id: string;
  name: string;
  age: number;
  mrn: string;
  race: string;
  zipCode: string;
  rurality: 'Urban' | 'Suburban' | 'Rural';
  insurance: string;
  riskFactors: string[];
  abi: number | null;
  lastScreening: string;
  amputationRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  disparityFlags: string[];
  clinicalIndicators: string[];
  lastVisit: string;
  nextAction: string;
}

interface DisparityMetrics {
  totalHighRisk: number;
  byRace: { [key: string]: number };
  byRurality: { [key: string]: number };
  byInsurance: { [key: string]: number };
  careGaps: number;
  averageTimeToDiagnosis: number;
  amputationRateByGroup: { [key: string]: number };
}

const LimbSalvageScreening: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screening' | 'disparities' | 'outreach'>('screening');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // High-risk patients identified through disparity-aware screening
  const highRiskPatients: HighRiskPatient[] = [
    {
      id: 'PAD001',
      name: 'Johnson, Maria',
      age: 67,
      mrn: 'MRN-567890',
      race: 'African American',
      zipCode: '63110',
      rurality: 'Urban',
      insurance: 'Medicaid',
      riskFactors: ['Diabetes', 'Hypertension', 'CKD', 'Obesity'],
      abi: 0.55,
      lastScreening: '2025-09-15',
      amputationRisk: 'High',
      disparityFlags: ['High-risk race', 'Medicaid coverage', 'Multiple comorbidities'],
      clinicalIndicators: ['Non-healing wound', 'Rest pain', 'Tissue loss'],
      lastVisit: '2025-10-10',
      nextAction: 'Urgent vascular consult'
    },
    {
      id: 'PAD002',
      name: 'Garcia, Roberto',
      age: 59,
      mrn: 'MRN-234567',
      race: 'Hispanic',
      zipCode: '78201',
      rurality: 'Rural',
      insurance: 'Uninsured',
      riskFactors: ['Diabetes', 'Smoking', 'Family History'],
      abi: null,
      lastScreening: '2024-12-20',
      amputationRisk: 'Critical',
      disparityFlags: ['High-risk ethnicity', 'Rural location', 'Uninsured', 'Delayed screening'],
      clinicalIndicators: ['Claudication symptoms', 'Atypical leg pain'],
      lastVisit: '2025-08-15',
      nextAction: 'Emergency ABI screening'
    },
    {
      id: 'PAD003',
      name: 'Standing Bear, Joseph',
      age: 72,
      mrn: 'MRN-345678',
      race: 'Native American',
      zipCode: '87301',
      rurality: 'Rural',
      insurance: 'IHS',
      riskFactors: ['Diabetes', 'Hypertension', 'Heart Disease'],
      abi: 0.42,
      lastScreening: '2025-07-08',
      amputationRisk: 'Critical',
      disparityFlags: ['High-risk race', 'Rural location', 'Limited specialist access'],
      clinicalIndicators: ['Ulceration', 'Poor wound healing', 'Reduced pulses'],
      lastVisit: '2025-09-22',
      nextAction: 'Limb salvage evaluation'
    },
    {
      id: 'PAD004',
      name: 'Washington, Denise',
      age: 54,
      mrn: 'MRN-456789',
      race: 'African American',
      zipCode: '36104',
      rurality: 'Urban',
      insurance: 'Medicare',
      riskFactors: ['Diabetes', 'Obesity', 'Sedentary'],
      abi: 0.68,
      lastScreening: '2025-08-30',
      amputationRisk: 'Moderate',
      disparityFlags: ['High-risk race', 'Multiple risk factors'],
      clinicalIndicators: ['Intermittent claudication', 'Decreased exercise tolerance'],
      lastVisit: '2025-10-05',
      nextAction: 'Exercise therapy + monitoring'
    }
  ];

  // Disparity metrics
  const disparityMetrics: DisparityMetrics = {
    totalHighRisk: 247,
    byRace: {
      'African American': 89,
      'Hispanic': 67,
      'Native American': 34,
      'White': 42,
      'Asian': 15
    },
    byRurality: {
      'Rural': 124,
      'Suburban': 78,
      'Urban': 45
    },
    byInsurance: {
      'Medicaid': 98,
      'Uninsured': 67,
      'Medicare': 56,
      'Commercial': 26
    },
    careGaps: 89,
    averageTimeToDiagnosis: 14.2,
    amputationRateByGroup: {
      'African American': 8.9,
      'Hispanic': 7.2,
      'Native American': 12.4,
      'White': 4.1,
      'Overall': 6.8
    }
  };

  const filteredPatients = highRiskPatients.filter(patient => 
    filterRisk === 'all' || patient.amputationRisk.toLowerCase() === filterRisk.toLowerCase()
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-steel-100 text-steel-800 border-steel-300';
    }
  };

  const getRuralityColor = (rurality: string) => {
    switch (rurality) {
      case 'Rural': return 'bg-red-100 text-red-700';
      case 'Suburban': return 'bg-yellow-100 text-yellow-700';
      case 'Urban': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-steel-100 text-steel-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'screening', label: 'High-Risk Screening', icon: Search },
          { id: 'disparities', label: 'Disparity Analytics', icon: Users },
          { id: 'outreach', label: 'Proactive Outreach', icon: Target }
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

      {/* High-Risk Screening Tab */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-steel-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-medical-teal-600" />
                High-Risk Patient Identification
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-steel-600" />
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-medical-teal-500 text-white rounded-lg hover:bg-medical-teal-600 transition-colors">
                  Export List
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="text-2xl font-bold text-red-600">89</div>
                <div className="text-sm text-red-700">Critical Risk</div>
                <div className="text-xs text-red-600 mt-1">Immediate intervention needed</div>
              </div>
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">67</div>
                <div className="text-sm text-orange-700">High Risk</div>
                <div className="text-xs text-orange-600 mt-1">Urgent evaluation required</div>
              </div>
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">91</div>
                <div className="text-sm text-yellow-700">Moderate Risk</div>
                <div className="text-xs text-yellow-600 mt-1">Enhanced monitoring</div>
              </div>
              <div className="p-4 rounded-lg bg-medical-teal-50 border border-medical-teal-200">
                <div className="text-2xl font-bold text-medical-teal-600">89</div>
                <div className="text-sm text-medical-teal-700">Care Gaps</div>
                <div className="text-xs text-medical-teal-600 mt-1">Overdue for screening</div>
              </div>
            </div>

            {/* Patient List */}
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="p-6 border border-steel-200 rounded-xl hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-steel-900">{patient.name}</h4>
                        <div className="text-sm text-steel-600">{patient.mrn} • Age {patient.age} • {patient.race}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4 text-steel-400" />
                          <span className="text-sm text-steel-600">{patient.zipCode}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRuralityColor(patient.rurality)}`}>
                            {patient.rurality}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(patient.amputationRisk)}`}>
                        {patient.amputationRisk} Risk
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Disparity Flags */}
                    <div>
                      <h5 className="text-sm font-semibold text-steel-700 mb-2">Disparity Risk Factors</h5>
                      <div className="space-y-1">
                        {patient.disparityFlags.map((flag, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-steel-600">{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Indicators */}
                    <div>
                      <h5 className="text-sm font-semibold text-steel-700 mb-2">Clinical Indicators</h5>
                      <div className="space-y-1">
                        {patient.clinicalIndicators.map((indicator, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Stethoscope className="w-3 h-3 text-medical-blue-500" />
                            <span className="text-xs text-steel-600">{indicator}</span>
                          </div>
                        ))}
                      </div>
                      {patient.abi && (
                        <div className="mt-2 p-2 bg-steel-50 rounded">
                          <div className="text-xs text-steel-600">ABI: <span className="font-semibold">{patient.abi}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Next Actions */}
                    <div>
                      <h5 className="text-sm font-semibold text-steel-700 mb-2">Recommended Action</h5>
                      <div className="p-3 bg-medical-teal-50 border border-medical-teal-200 rounded-lg">
                        <div className="text-sm font-medium text-medical-teal-800">{patient.nextAction}</div>
                        <div className="text-xs text-medical-teal-600 mt-1">Last visit: {patient.lastVisit}</div>
                      </div>
                      <button className="w-full mt-3 px-4 py-2 bg-medical-teal-500 text-white rounded-lg hover:bg-medical-teal-600 transition-colors text-sm">
                        Schedule Intervention
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disparity Analytics Tab */}
      {activeTab === 'disparities' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <h3 className="text-xl font-bold text-steel-900 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-medical-teal-600" />
              Health Disparity Analytics
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Race/Ethnicity */}
              <div className="p-6 bg-white border border-steel-200 rounded-xl">
                <h4 className="font-semibold text-steel-900 mb-4">High-Risk by Race/Ethnicity</h4>
                <div className="space-y-3">
                  {Object.entries(disparityMetrics.byRace).map(([race, count]) => (
                    <div key={race} className="flex items-center justify-between">
                      <span className="text-sm text-steel-700">{race}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-steel-900">{count}</span>
                        <div className="w-16 bg-steel-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-medical-teal-500 rounded-full"
                            style={{ width: `${(count / Math.max(...Object.values(disparityMetrics.byRace))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Geographic Access */}
              <div className="p-6 bg-white border border-steel-200 rounded-xl">
                <h4 className="font-semibold text-steel-900 mb-4">Geographic Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(disparityMetrics.byRurality).map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between">
                      <span className="text-sm text-steel-700">{location}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-steel-900">{count}</span>
                        <div className="w-16 bg-steel-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-orange-500 rounded-full"
                            style={{ width: `${(count / Math.max(...Object.values(disparityMetrics.byRurality))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amputation Rates by Group */}
              <div className="p-6 bg-white border border-steel-200 rounded-xl">
                <h4 className="font-semibold text-steel-900 mb-4">Amputation Rates (%)</h4>
                <div className="space-y-3">
                  {Object.entries(disparityMetrics.amputationRateByGroup).map(([group, rate]) => (
                    <div key={group} className="flex items-center justify-between">
                      <span className="text-sm text-steel-700">{group}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${rate > 8 ? 'text-red-600' : rate > 6 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {rate}%
                        </span>
                        <div className="w-16 bg-steel-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${rate > 8 ? 'bg-red-500' : rate > 6 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                            style={{ width: `${(rate / 15) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6 mt-8">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{disparityMetrics.averageTimeToDiagnosis}</div>
                <div className="text-sm text-orange-700">Average Days to Diagnosis</div>
                <div className="text-xs text-orange-600 mt-1">Higher in rural/minority populations</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{disparityMetrics.careGaps}</div>
                <div className="text-sm text-red-700">Patients with Care Gaps</div>
                <div className="text-xs text-red-600 mt-1">Overdue for recommended screening</div>
              </div>
              <div className="p-4 bg-medical-teal-50 border border-medical-teal-200 rounded-lg">
                <div className="text-2xl font-bold text-medical-teal-600">2.8x</div>
                <div className="text-sm text-medical-teal-700">Higher Risk in Minorities</div>
                <div className="text-xs text-medical-teal-600 mt-1">Compared to overall population</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proactive Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <h3 className="text-xl font-bold text-steel-900 mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-medical-teal-600" />
              Proactive Outreach Recommendations
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Outreach Actions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-steel-900">Immediate Actions Needed</h4>
                <div className="space-y-3">
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <div className="font-medium text-red-800">Critical Risk Patients (89)</div>
                    <div className="text-sm text-red-700 mt-1">Schedule urgent vascular evaluation within 48 hours</div>
                    <button className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                      Generate Contact List
                    </button>
                  </div>
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <div className="font-medium text-orange-800">Overdue ABI Screening (67)</div>
                    <div className="text-sm text-orange-700 mt-1">High-risk patients without recent screening</div>
                    <button className="mt-2 px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700">
                      Schedule Screening
                    </button>
                  </div>
                  <div className="p-4 border-l-4 border-medical-teal-500 bg-medical-teal-50">
                    <div className="font-medium text-medical-teal-800">Rural Access Initiative (124)</div>
                    <div className="text-sm text-medical-teal-700 mt-1">Mobile screening unit deployment recommended</div>
                    <button className="mt-2 px-3 py-1 bg-medical-teal-600 text-white rounded text-xs hover:bg-medical-teal-700">
                      Plan Mobile Unit
                    </button>
                  </div>
                </div>
              </div>

              {/* Community Health Initiatives */}
              <div className="space-y-4">
                <h4 className="font-semibold text-steel-900">Community Health Initiatives</h4>
                <div className="space-y-3">
                  <div className="p-4 bg-white border border-steel-200 rounded-lg">
                    <div className="font-medium text-steel-900">Diabetes Education Program</div>
                    <div className="text-sm text-steel-600 mt-1">Target: Hispanic/Latino community centers</div>
                    <div className="text-xs text-emerald-600 mt-2">Expected impact: 30% reduction in late-stage PAD</div>
                  </div>
                  <div className="p-4 bg-white border border-steel-200 rounded-lg">
                    <div className="font-medium text-steel-900">ABI Screening Events</div>
                    <div className="text-sm text-steel-600 mt-1">Community health fairs in high-risk zip codes</div>
                    <div className="text-xs text-emerald-600 mt-2">Scheduled: 3 events next quarter</div>
                  </div>
                  <div className="p-4 bg-white border border-steel-200 rounded-lg">
                    <div className="font-medium text-steel-900">Cultural Competency Training</div>
                    <div className="text-sm text-steel-600 mt-1">Provider education on disparity-aware care</div>
                    <div className="text-xs text-emerald-600 mt-2">Goal: Reduce time to diagnosis by 40%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome Projections */}
            <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="font-semibold text-emerald-800 mb-4">Projected Impact of Interventions</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">35%</div>
                  <div className="text-sm text-emerald-700">Reduction in Late-Stage PAD</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">28%</div>
                  <div className="text-sm text-emerald-700">Decrease in Amputation Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">$2.8M</div>
                  <div className="text-sm text-emerald-700">Annual Cost Savings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LimbSalvageScreening;