import React, { useState } from 'react';
import { User, TrendingUp, TrendingDown, Award, AlertTriangle, X, Users, Calendar, FileText, Activity, ChevronRight } from 'lucide-react';

interface ProviderData {
  id: string;
  name: string;
  title: string;
  patients: number;
  gdmtOptimal: number;
  gdmtRate: number;
  readmissionRate: number;
  lvefImprovement: number;
  qualityScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  specialtyFocus: string[];
  caseComplexity: 'low' | 'medium' | 'high';
}

interface ProviderPatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  gdmtPillars: number;
  riskScore: number;
  lastVisit: Date;
  diagnoses: string[];
  nextSteps: string[];
}

const ProviderScorecard: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof ProviderData>('qualityScore');
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedProviderForPanel, setSelectedProviderForPanel] = useState<string | null>(null);

  // Mock provider data - will be replaced with real API data
  const providerData: ProviderData[] = [
    {
      id: 'DR001',
      name: 'Dr. Sarah Rivera',
      title: 'Interventional Cardiologist',
      patients: 374,
      gdmtOptimal: 284,
      gdmtRate: 75.9,
      readmissionRate: 8.2,
      lvefImprovement: 12.4,
      qualityScore: 94.2,
      trend: 'up',
      trendValue: 5.2,
      specialtyFocus: ['Complex PCI', 'Structural Heart'],
      caseComplexity: 'high',
    },
    {
      id: 'DR002',
      name: 'Dr. Michael Chen',
      title: 'Heart Failure Specialist',
      patients: 468,
      gdmtOptimal: 334,
      gdmtRate: 71.4,
      readmissionRate: 9.1,
      lvefImprovement: 14.7,
      qualityScore: 91.8,
      trend: 'up',
      trendValue: 3.1,
      specialtyFocus: ['Advanced HF', 'LVAD'],
      caseComplexity: 'high',
    },
    {
      id: 'DR003',
      name: 'Dr. Amanda Foster',
      title: 'General Cardiologist',
      patients: 312,
      gdmtOptimal: 196,
      gdmtRate: 62.8,
      readmissionRate: 11.7,
      lvefImprovement: 8.9,
      qualityScore: 82.4,
      trend: 'down',
      trendValue: -2.8,
      specialtyFocus: ['Preventive Cardiology'],
      caseComplexity: 'medium',
    },
    {
      id: 'DR004',
      name: 'Dr. James Park',
      title: 'Electrophysiologist',
      patients: 196,
      gdmtOptimal: 142,
      gdmtRate: 72.4,
      readmissionRate: 7.8,
      lvefImprovement: 11.2,
      qualityScore: 88.9,
      trend: 'up',
      trendValue: 4.7,
      specialtyFocus: ['Device Therapy', 'Arrhythmias'],
      caseComplexity: 'high',
    },
    {
      id: 'DR005',
      name: 'Dr. Lisa Martinez',
      title: 'Heart Failure Specialist',
      patients: 406,
      gdmtOptimal: 308,
      gdmtRate: 75.9,
      readmissionRate: 8.9,
      lvefImprovement: 13.1,
      qualityScore: 92.7,
      trend: 'stable',
      trendValue: 0.2,
      specialtyFocus: ['Transplant', 'Advanced HF'],
      caseComplexity: 'high',
    },
  ];

  // Mock patient data for each provider
  const providerPatients: Record<string, ProviderPatientData[]> = {
    'DR001': [
      { id: 'P001', name: 'Johnson, Mary', age: 67, ejectionFraction: 25, gdmtPillars: 4, riskScore: 85, lastVisit: new Date('2024-10-20'), diagnoses: ['HFrEF', 'Diabetes', 'CKD'], nextSteps: ['Continue current therapy', 'Monitor labs'] },
      { id: 'P002', name: 'Smith, Robert', age: 72, ejectionFraction: 30, gdmtPillars: 3, riskScore: 78, lastVisit: new Date('2024-10-18'), diagnoses: ['HFrEF', 'AFib'], nextSteps: ['Add SGLT2 inhibitor', 'Cardiology follow-up'] },
      { id: 'P003', name: 'Davis, Patricia', age: 59, ejectionFraction: 35, gdmtPillars: 2, riskScore: 65, lastVisit: new Date('2024-10-22'), diagnoses: ['HFrEF', 'HTN'], nextSteps: ['Optimize MRA dosing', 'Add beta-blocker'] }
    ],
    'DR002': [
      { id: 'P004', name: 'Wilson, James', age: 70, ejectionFraction: 28, gdmtPillars: 4, riskScore: 82, lastVisit: new Date('2024-10-19'), diagnoses: ['HFrEF', 'CAD', 'Diabetes'], nextSteps: ['Continue optimal therapy', 'Device evaluation'] },
      { id: 'P005', name: 'Brown, Linda', age: 65, ejectionFraction: 32, gdmtPillars: 3, riskScore: 75, lastVisit: new Date('2024-10-21'), diagnoses: ['HFrEF', 'COPD'], nextSteps: ['Add fourth pillar', 'Pulmonary consultation'] },
      { id: 'P006', name: 'Miller, David', age: 68, ejectionFraction: 26, gdmtPillars: 4, riskScore: 88, lastVisit: new Date('2024-10-23'), diagnoses: ['HFrEF', 'CKD', 'AFib'], nextSteps: ['ICD evaluation', 'Continue therapy'] }
    ],
    'DR003': [
      { id: 'P007', name: 'Garcia, Maria', age: 63, ejectionFraction: 40, gdmtPillars: 2, riskScore: 58, lastVisit: new Date('2024-10-17'), diagnoses: ['HFpEF', 'Diabetes'], nextSteps: ['Optimize GDMT', 'Diabetes management'] },
      { id: 'P008', name: 'Taylor, John', age: 71, ejectionFraction: 38, gdmtPillars: 1, riskScore: 72, lastVisit: new Date('2024-10-16'), diagnoses: ['HFrEF', 'HTN'], nextSteps: ['Initiate GDMT therapy', 'Cardiology referral'] }
    ],
    'DR004': [
      { id: 'P009', name: 'Anderson, Susan', age: 66, ejectionFraction: 29, gdmtPillars: 3, riskScore: 79, lastVisit: new Date('2024-10-24'), diagnoses: ['HFrEF', 'AFib'], nextSteps: ['Device therapy assessment', 'Rhythm management'] },
      { id: 'P010', name: 'Thomas, Michael', age: 69, ejectionFraction: 33, gdmtPillars: 4, riskScore: 76, lastVisit: new Date('2024-10-22'), diagnoses: ['HFrEF', 'VT'], nextSteps: ['ICD follow-up', 'Continue therapy'] }
    ],
    'DR005': [
      { id: 'P011', name: 'Martinez, Carlos', age: 58, ejectionFraction: 22, gdmtPillars: 4, riskScore: 92, lastVisit: new Date('2024-10-25'), diagnoses: ['HFrEF', 'LVAD candidate'], nextSteps: ['LVAD evaluation', 'Transplant assessment'] },
      { id: 'P012', name: 'Lee, Jennifer', age: 64, ejectionFraction: 27, gdmtPillars: 4, riskScore: 86, lastVisit: new Date('2024-10-20'), diagnoses: ['HFrEF', 'CKD'], nextSteps: ['Continue therapy', 'Monitor renal function'] }
    ]
  };

  const sortedProviders = [...providerData].sort((a, b) => {
    if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
      return (b[sortBy] as number) - (a[sortBy] as number);
    }
    return 0;
  });

  const getPerformanceColor = (value: number, type: 'rate' | 'readmission' | 'quality') => {
    if (type === 'readmission') {
      if (value <= 8) return 'text-medical-green-600 bg-medical-green-50';
      if (value <= 12) return 'text-medical-amber-600 bg-medical-amber-50';
      return 'text-medical-red-600 bg-medical-red-50';
    }
    
    if (type === 'quality') {
      if (value >= 90) return 'text-medical-green-600 bg-medical-green-50';
      if (value >= 80) return 'text-medical-amber-600 bg-medical-amber-50';
      return 'text-medical-red-600 bg-medical-red-50';
    }
    
    // Default for rates
    if (value >= 70) return 'text-medical-green-600 bg-medical-green-50';
    if (value >= 60) return 'text-medical-amber-600 bg-medical-amber-50';
    return 'text-medical-red-600 bg-medical-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-medical-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-medical-red-600" />;
      default:
        return <div className="w-4 h-4 bg-steel-400 rounded-full"></div>;
    }
  };

  const selectedProviderData = providerData.find(p => p.id === selectedProvider);
  const panelProviderData = providerData.find(p => p.id === selectedProviderForPanel);
  const panelPatients = selectedProviderForPanel ? providerPatients[selectedProviderForPanel] || [] : [];

  const handleProviderPanelClick = (providerId: string) => {
    setSelectedProviderForPanel(providerId);
    setShowPatientPanel(true);
  };

  const closeProviderPanel = () => {
    setShowPatientPanel(false);
    setSelectedProviderForPanel(null);
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Provider Performance Scorecard
          </h2>
          <p className="text-steel-600">
            GDMT adoption and quality metrics by physician • Click provider cards for patient details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as keyof ProviderData)}
            className="px-3 py-2 border border-steel-300 rounded-lg text-sm bg-white"
          >
            <option value="qualityScore">Quality Score</option>
            <option value="gdmtRate">GDMT Rate</option>
            <option value="patients">Patient Volume</option>
            <option value="readmissionRate">Readmission Rate</option>
          </select>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {sortedProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setSelectedProvider(
              selectedProvider === provider.id ? null : provider.id
            )}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left group ${
              selectedProvider === provider.id
                ? 'border-medical-blue-400 shadow-retina-3 bg-medical-blue-50/30'
                : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2'
            }`}
          >
            {/* Provider Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-medical-blue-100">
                  <User className="w-5 h-5 text-medical-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-steel-900">{provider.name}</div>
                  <div className="text-sm text-steel-600">{provider.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(provider.trend)}
                <span className={`text-sm font-semibold ${
                  provider.trend === 'up' ? 'text-medical-green-600' :
                  provider.trend === 'down' ? 'text-medical-red-600' : 'text-steel-600'
                }`}>
                  {provider.trend !== 'stable' && (provider.trendValue > 0 ? '+' : '')}{provider.trendValue}%
                </span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-steel-50">
                <div className="text-2xl font-bold text-steel-900">{provider.patients}</div>
                <div className="text-xs text-steel-600">Patients</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.gdmtRate, 'rate')}`}>
                <div className="text-2xl font-bold">{provider.gdmtRate.toFixed(1)}%</div>
                <div className="text-xs">GDMT Rate</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.readmissionRate, 'readmission')}`}>
                <div className="text-2xl font-bold">{provider.readmissionRate.toFixed(1)}%</div>
                <div className="text-xs">Readmit Rate</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.qualityScore, 'quality')}`}>
                <div className="text-2xl font-bold">{provider.qualityScore.toFixed(0)}</div>
                <div className="text-xs">Quality Score</div>
              </div>
            </div>

            {/* Specialty Focus */}
            <div className="mt-3 flex flex-wrap gap-1">
              {provider.specialtyFocus.map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-steel-100 text-steel-700 rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>

            {/* View Patients Button */}
            <div className="mt-3 pt-3 border-t border-steel-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleProviderPanelClick(provider.id);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors text-sm font-medium"
              >
                <Users className="w-4 h-4" />
                View {providerPatients[provider.id]?.length || 0} Patients
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Provider Detailed View */}
      {selectedProviderData && (
        <div className="p-6 bg-medical-blue-50/50 rounded-xl border-2 border-medical-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-steel-900 font-sf">
                {selectedProviderData.name}
              </h3>
              <p className="text-steel-600">{selectedProviderData.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-medical-blue-600" />
              <span className="text-lg font-bold text-medical-blue-600">
                Rank #{sortedProviders.findIndex(p => p.id === selectedProviderData.id) + 1}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">Total Patients</div>
              <div className="text-3xl font-bold text-steel-900">{selectedProviderData.patients}</div>
              <div className="text-sm text-steel-600 mt-1">
                {selectedProviderData.gdmtOptimal} on optimal GDMT
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">GDMT Adoption</div>
              <div className="text-3xl font-bold text-medical-blue-600">
                {selectedProviderData.gdmtRate.toFixed(1)}%
              </div>
              <div className="text-sm text-steel-600 mt-1">
                vs {(sortedProviders.reduce((sum, p) => sum + p.gdmtRate, 0) / sortedProviders.length).toFixed(1)}% avg
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">LVEF Improvement</div>
              <div className="text-3xl font-bold text-medical-green-600">
                +{selectedProviderData.lvefImprovement.toFixed(1)}%
              </div>
              <div className="text-sm text-steel-600 mt-1">
                Average increase
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">Case Complexity</div>
              <div className={`text-2xl font-bold ${
                selectedProviderData.caseComplexity === 'high' ? 'text-medical-red-600' :
                selectedProviderData.caseComplexity === 'medium' ? 'text-medical-amber-600' :
                'text-medical-green-600'
              }`}>
                {selectedProviderData.caseComplexity.toUpperCase()}
              </div>
              <div className="text-sm text-steel-600 mt-1">
                Risk-adjusted
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-steel-200">
        <div>
          <div className="text-sm text-steel-600 mb-1">Top Performer</div>
          <div className="text-lg font-bold text-medical-green-600">
            {sortedProviders[0].name}
          </div>
          <div className="text-sm text-steel-600">
            {sortedProviders[0].qualityScore.toFixed(1)} Quality Score
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Average GDMT Rate</div>
          <div className="text-lg font-bold text-steel-900">
            {(sortedProviders.reduce((sum, p) => sum + p.gdmtRate, 0) / sortedProviders.length).toFixed(1)}%
          </div>
          <div className="text-sm text-steel-600">
            Across {sortedProviders.length} providers
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Total Patients</div>
          <div className="text-lg font-bold text-medical-blue-600">
            {sortedProviders.reduce((sum, p) => sum + p.patients, 0)}
          </div>
          <div className="text-sm text-steel-600">
            Heart failure patients
          </div>
        </div>
      </div>

      {/* Provider Patient Panel */}
      {showPatientPanel && panelProviderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-steel-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-steel-900">{panelProviderData.name}</h3>
                  <p className="text-steel-600 mt-1">
                    {panelProviderData.title} \u2022 {panelPatients.length} patients
                  </p>
                </div>
                <button
                  onClick={closeProviderPanel}
                  className="p-2 rounded-lg hover:bg-steel-100 transition-colors"
                >
                  <X className="w-5 h-5 text-steel-600" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {/* Provider Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="text-sm text-blue-700 font-medium">Total Patients</div>
                  <div className="text-2xl font-bold text-blue-800">{panelProviderData.patients}</div>
                </div>
                <div className={`p-4 rounded-xl ${
                  panelProviderData.gdmtRate >= 70 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-amber-50 to-amber-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    panelProviderData.gdmtRate >= 70 ? 'text-green-700' : 'text-amber-700'
                  }`}>GDMT Rate</div>
                  <div className={`text-2xl font-bold ${
                    panelProviderData.gdmtRate >= 70 ? 'text-green-800' : 'text-amber-800'
                  }`}>{panelProviderData.gdmtRate.toFixed(1)}%</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="text-sm text-purple-700 font-medium">Quality Score</div>
                  <div className="text-2xl font-bold text-purple-800">{panelProviderData.qualityScore.toFixed(0)}</div>
                </div>
                <div className={`p-4 rounded-xl ${
                  panelProviderData.readmissionRate <= 8 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'
                }`}>
                  <div className={`text-sm font-medium ${
                    panelProviderData.readmissionRate <= 8 ? 'text-green-700' : 'text-red-700'
                  }`}>Readmission Rate</div>
                  <div className={`text-2xl font-bold ${
                    panelProviderData.readmissionRate <= 8 ? 'text-green-800' : 'text-red-800'
                  }`}>{panelProviderData.readmissionRate.toFixed(1)}%</div>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Details
                </h4>
                
                {panelPatients.map((patient) => (
                  <div key={patient.id} className="border border-steel-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          patient.riskScore >= 80 ? 'bg-red-500' :
                          patient.riskScore >= 60 ? 'bg-amber-500' : 'bg-green-500'
                        }`}>
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-steel-900">{patient.name}</div>
                          <div className="text-sm text-steel-600">
                            Age {patient.age} \u2022 EF {patient.ejectionFraction}% \u2022 Risk Score: {patient.riskScore}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        patient.riskScore >= 80 ? 'bg-red-100 text-red-700' :
                        patient.riskScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {patient.riskScore >= 80 ? 'HIGH RISK' : patient.riskScore >= 60 ? 'MODERATE RISK' : 'LOW RISK'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          GDMT Status
                        </div>
                        <div className={`text-sm px-2 py-1 rounded-full ${
                          patient.gdmtPillars === 4 ? 'bg-green-100 text-green-700' :
                          patient.gdmtPillars >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {patient.gdmtPillars}/4 pillars active
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last Visit
                        </div>
                        <div className="text-sm text-steel-600">
                          {patient.lastVisit.toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2">Diagnoses</div>
                        <div className="flex flex-wrap gap-1">
                          {patient.diagnoses.slice(0, 2).map((diagnosis, idx) => (
                            <span key={idx} className="px-2 py-1 bg-medical-blue-100 text-medical-blue-700 text-xs rounded-full">
                              {diagnosis}
                            </span>
                          ))}
                          {patient.diagnoses.length > 2 && (
                            <span className="px-2 py-1 bg-steel-100 text-steel-600 text-xs rounded-full">
                              +{patient.diagnoses.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Next Steps
                      </div>
                      <div className="space-y-1">
                        {patient.nextSteps.map((step, idx) => (
                          <div key={idx} className="text-sm text-steel-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-medical-blue-500 rounded-full flex-shrink-0"></div>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {panelPatients.length === 0 && (
                  <div className="text-center py-8 text-steel-500">
                    No patient data available for this provider.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-steel-200">
                <button 
                  className="flex-1 bg-medical-blue-500 text-white py-3 px-4 rounded-lg hover:bg-medical-blue-600 transition-colors font-medium"
                  onClick={() => {
                    console.log('Opening provider report');
                    // TODO: Implement provider report modal
                    alert('View Provider Report - Detailed provider performance report will open');
                  }}
                >
                  View Provider Report
                </button>
                <button 
                  className="flex-1 bg-white border border-steel-300 text-steel-700 py-3 px-4 rounded-lg hover:bg-steel-50 transition-colors font-medium"
                  onClick={() => {
                    console.log('Scheduling team meeting');
                    // TODO: Implement team meeting scheduler
                    alert('Schedule Team Meeting - Meeting scheduler will open');
                  }}
                >
                  Schedule Team Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderScorecard;