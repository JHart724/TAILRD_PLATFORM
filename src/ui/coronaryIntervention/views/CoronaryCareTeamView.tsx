import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Activity, 
  Timer,
  Heart,
  Phone,
  MapPin,
  FileText,
  TrendingUp,
  AlertCircle,
  Zap,
  UserCheck,
  Stethoscope,
  Building2,
  Calculator,
  Shield
} from 'lucide-react';

// Import clinical calculators and safety screening
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';

const CoronaryCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('acute-care');
  const [selectedCalculator, setSelectedCalculator] = useState<'grace' | 'timi' | 'syntax'>('grace');

  // High-Risk Patient Queue (Surgical candidates requiring multidisciplinary evaluation)
  const surgicalCandidates = [
    {
      id: '1',
      mrn: 'MRN-CAB001',
      name: 'David Martinez',
      age: 72,
      diagnosis: 'Triple Vessel CAD',
      syntaxScore: 28,
      euroscore: 4.2,
      recommendation: 'CABG preferred',
      status: 'Heart Team Review',
      urgency: 'elective',
      riskFactors: ['DM', 'CKD']
    },
    {
      id: '2',
      mrn: 'MRN-CAB002',
      name: 'Patricia Kim',
      age: 68,
      diagnosis: 'LAD + Aortic Stenosis',
      syntaxScore: 32,
      euroscore: 6.8,
      recommendation: 'CABG + AVR',
      status: 'Surgical Consultation',
      urgency: 'urgent',
      riskFactors: ['Age >65', 'AS']
    }
  ];

  // Acute Care Queue
  const acuteCareQueue = [
    {
      id: '1',
      mrn: 'MRN-001234',
      name: 'Robert Chen',
      age: 67,
      diagnosis: 'STEMI - Anterior',
      presentation: '08:45 AM',
      doorToBalloon: 67,
      status: 'In Cath Lab',
      urgency: 'critical',
      operator: 'Dr. Rodriguez',
      eta: '2 min'
    },
    {
      id: '2',
      mrn: 'MRN-005678',
      name: 'Maria Santos',
      age: 72,
      diagnosis: 'NSTEMI',
      presentation: '09:15 AM',
      doorToBalloon: null,
      status: 'Prep Complete',
      urgency: 'urgent',
      operator: 'Dr. Chen',
      eta: '15 min'
    },
    {
      id: '3',
      mrn: 'MRN-009012',
      name: 'James Wilson',
      age: 58,
      diagnosis: 'Unstable Angina',
      presentation: '09:30 AM',
      doorToBalloon: null,
      status: 'ED Workup',
      urgency: 'moderate',
      operator: 'TBD',
      eta: '45 min'
    }
  ];

  // Cath Lab Status
  const cathLabStatus = [
    {
      lab: 'Cath Lab 1',
      status: 'occupied',
      patient: 'Robert Chen',
      procedure: 'Primary PCI',
      operator: 'Dr. Rodriguez',
      startTime: '09:52 AM',
      estimatedEnd: '10:45 AM',
      complexity: 'Standard'
    },
    {
      lab: 'Cath Lab 2',
      status: 'turnover',
      patient: null,
      procedure: null,
      operator: null,
      startTime: null,
      estimatedEnd: '10:15 AM',
      complexity: null
    },
    {
      lab: 'Cath Lab 3',
      status: 'available',
      patient: null,
      procedure: null,
      operator: null,
      startTime: null,
      estimatedEnd: null,
      complexity: null
    },
    {
      lab: 'Cath Lab 4',
      status: 'occupied',
      patient: 'Sarah Johnson',
      procedure: 'Elective PCI',
      operator: 'Dr. Park',
      startTime: '08:30 AM',
      estimatedEnd: '10:30 AM',
      complexity: 'Complex'
    }
  ];

  // Team Members (Combined Interventional + Surgical)
  const teamMembers = [
    {
      name: 'Dr. Rodriguez',
      role: 'Interventional Cardiologist',
      status: 'In Procedure',
      location: 'Cath Lab 1',
      availability: 'Busy until 10:45 AM',
      caseLoad: 2,
      phone: '(555) 0101'
    },
    {
      name: 'Dr. Chen',
      role: 'Interventional Cardiologist',
      status: 'Available',
      location: 'On Call Room',
      availability: 'Ready for next case',
      caseLoad: 1,
      phone: '(555) 0102'
    },
    {
      name: 'Dr. Mitchell',
      role: 'Cardiac Surgeon',
      status: 'Pre-op',
      location: 'OR 2 Prep',
      availability: 'Surgery at 7:00 AM',
      caseLoad: 2,
      phone: '(555) 0104'
    },
    {
      name: 'Dr. Thompson',
      role: 'Cardiac Surgeon',
      status: 'In Surgery',
      location: 'OR 1',
      availability: 'Busy until 1:15 PM',
      caseLoad: 1,
      phone: '(555) 0105'
    },
    {
      name: 'Dr. Park',
      role: 'Interventional Cardiologist',
      status: 'In Procedure',
      location: 'Cath Lab 4',
      availability: 'Busy until 10:30 AM',
      caseLoad: 1,
      phone: '(555) 0103'
    },
    {
      name: 'Sarah Mitchell, RN',
      role: 'Cath Lab Coordinator',
      status: 'Available',
      location: 'Central Station',
      availability: 'Coordinating care',
      caseLoad: 4,
      phone: '(555) 0201'
    },
    {
      name: 'Jennifer Park, RN',
      role: 'OR Coordinator',
      status: 'Available',
      location: 'OR Central',
      availability: 'Coordinating surgical cases',
      caseLoad: 3,
      phone: '(555) 0202'
    },
    {
      name: 'Mike Thompson, RT',
      role: 'Cath Lab Technologist',
      status: 'Available',
      location: 'Equipment Room',
      availability: 'Equipment ready',
      caseLoad: 2,
      phone: '(555) 0301'
    }
  ];

  // Performance Metrics
  const performanceMetrics = [
    { metric: 'Avg Door-to-Balloon', value: '72 min', target: '< 60 min', status: 'needs_improvement' },
    { metric: 'PCI Success Rate', value: '97.2%', target: '> 95%', status: 'good' },
    { metric: '30-Day Readmission', value: '4.2%', target: '< 5%', status: 'good' },
    { metric: 'Patient Satisfaction', value: '4.7/5', target: '> 4.5', status: 'good' }
  ];

  // Recent Completions
  const recentCompletions = [
    {
      patient: 'Emily Davis',
      procedure: 'Elective PCI - LAD',
      operator: 'Dr. Williams',
      duration: '78 min',
      outcome: 'Successful',
      complications: 'None',
      time: '07:45 AM'
    },
    {
      patient: 'John Martinez',
      procedure: 'Primary PCI - RCA',
      operator: 'Dr. Thompson',
      duration: '65 min',
      outcome: 'Successful',
      complications: 'Minor bleeding',
      time: '06:30 AM'
    },
    {
      patient: 'Linda Brown',
      procedure: 'Complex PCI - LCX',
      operator: 'Dr. Davis',
      duration: '125 min',
      outcome: 'Successful',
      complications: 'None',
      time: '05:15 AM'
    }
  ];

  const getStatusColor = (status: string, urgency?: string) => {
    if (urgency === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'urgent') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (urgency === 'moderate') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    
    switch (status) {
      case 'occupied': return 'bg-red-100 text-red-700 border-red-200';
      case 'turnover': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Procedure': return 'bg-red-100 text-red-700 border-red-200';
      case 'In Surgery': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pre-op': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-steel-100 text-steel-700 border-steel-200';
    }
  };

  const tabs = [
    { id: 'acute-care', label: 'Acute Care Queue', icon: AlertTriangle },
    { id: 'surgical-candidates', label: 'Surgical Candidates', icon: Heart },
    { id: 'clinical-tools', label: 'Clinical Tools', icon: Calculator },
    { id: 'safety-screening', label: 'Safety Screening', icon: Shield },
    { id: 'cath-labs', label: 'Cath Lab Status', icon: Activity },
    { id: 'team', label: 'Team Coordination', icon: Users },
    { id: 'performance', label: 'Performance Metrics', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-steel-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white text-medical-amber-600 shadow-retina-2'
                  : 'text-steel-600 hover:text-steel-900'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'acute-care' && (
        <div className="space-y-6">
          {/* Queue Header */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Acute Coronary Care Queue</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-steel-600">
                  Active Cases: <span className="font-semibold text-steel-900">{acuteCareQueue.length}</span>
                </div>
                <button className="px-4 py-2 bg-medical-amber-500 text-white rounded-lg hover:bg-medical-amber-600 transition-colors">
                  Add Patient
                </button>
              </div>
            </div>
            
            {/* Patient Queue */}
            <div className="space-y-3">
              {acuteCareQueue.map((patient) => (
                <div key={patient.id} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor('', patient.urgency)}`}>
                        {patient.urgency.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{patient.name}</div>
                        <div className="text-sm text-steel-600">{patient.mrn} • Age {patient.age}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.diagnosis}</div>
                        <div className="text-xs text-steel-600">Presentation: {patient.presentation}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.status}</div>
                        <div className="text-xs text-steel-600">
                          {patient.doorToBalloon ? `D2B: ${patient.doorToBalloon}min` : `ETA: ${patient.eta}`}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.operator}</div>
                        <div className="text-xs text-steel-600">Operator</div>
                      </div>
                      
                      <button className="p-2 text-medical-amber-600 hover:bg-medical-amber-50 rounded-lg transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'surgical-candidates' && (
        <div className="space-y-6">
          {/* Queue Header */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Surgical Candidates - Heart Team Review</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-steel-600">
                  Pending Review: <span className="font-semibold text-steel-900">{surgicalCandidates.length}</span>
                </div>
                <button className="px-4 py-2 bg-medical-amber-500 text-white rounded-lg hover:bg-medical-amber-600 transition-colors">
                  Schedule Heart Team
                </button>
              </div>
            </div>
            
            {/* Surgical Candidates */}
            <div className="space-y-3">
              {surgicalCandidates.map((patient) => (
                <div key={patient.id} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor('', patient.urgency)}`}>
                        {patient.urgency.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{patient.name}</div>
                        <div className="text-sm text-steel-600">{patient.mrn} • Age {patient.age}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.diagnosis}</div>
                        <div className="text-xs text-steel-600">SYNTAX: {patient.syntaxScore} • EuroSCORE: {patient.euroscore}%</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.recommendation}</div>
                        <div className="text-xs text-steel-600">Risk Factors: {patient.riskFactors.join(', ')}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.status}</div>
                        <div className="text-xs text-steel-600">Multidisciplinary Review</div>
                      </div>
                      
                      <button className="p-2 text-medical-amber-600 hover:bg-medical-amber-50 rounded-lg transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clinical-tools' && (
        <div className="space-y-6">
          {/* Calculator Selection */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <h3 className="text-lg font-semibold text-steel-900 font-sf mb-4">Clinical Risk Calculators</h3>
            <div className="flex space-x-2 mb-6">
              {[
                { id: 'grace' as const, label: 'GRACE Score', description: 'ACS Risk Assessment' },
                { id: 'timi' as const, label: 'TIMI Score', description: 'UA/NSTEMI Risk' },
                { id: 'syntax' as const, label: 'SYNTAX Score', description: 'Lesion Complexity' }
              ].map((calc) => (
                <button
                  key={calc.id}
                  onClick={() => setSelectedCalculator(calc.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all flex-1 text-left ${
                    selectedCalculator === calc.id
                      ? 'border-medical-amber-400 bg-medical-amber-50 text-medical-amber-800'
                      : 'border-steel-200 hover:border-steel-300 text-steel-700'
                  }`}
                >
                  <div className="font-semibold">{calc.label}</div>
                  <div className="text-sm opacity-80">{calc.description}</div>
                </button>
              ))}
            </div>
            
            {/* Selected Calculator */}
            {selectedCalculator === 'grace' && <GRACEScoreCalculator />}
            {selectedCalculator === 'timi' && <TIMIScoreCalculator />}
            {selectedCalculator === 'syntax' && <SYNTAXScoreCalculator />}
          </div>
        </div>
      )}

      {activeTab === 'safety-screening' && (
        <div className="space-y-6">
          <CoronarySafetyScreening />
        </div>
      )}

      {activeTab === 'cath-labs' && (
        <div className="space-y-6">
          {/* Cath Lab Overview */}
          <div className="grid grid-cols-4 gap-4">
            {cathLabStatus.map((lab, index) => (
              <div key={index} className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-steel-900 font-sf">{lab.lab}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lab.status)}`}>
                    {lab.status.toUpperCase()}
                  </div>
                </div>
                
                {lab.patient ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-steel-900">{lab.patient}</div>
                    <div className="text-xs text-steel-600">{lab.procedure}</div>
                    <div className="text-xs text-steel-600">Dr: {lab.operator}</div>
                    <div className="text-xs text-steel-600">Started: {lab.startTime}</div>
                    <div className="text-xs text-steel-600">Est. End: {lab.estimatedEnd}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      lab.complexity === 'Complex' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {lab.complexity}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-steel-600">
                    {lab.status === 'turnover' ? `Ready: ${lab.estimatedEnd}` : 'Ready for next case'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Team Members</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-steel-600">
                  Available: <span className="font-semibold text-emerald-600">2</span>
                </div>
                <div className="text-sm text-steel-600">
                  Busy: <span className="font-semibold text-red-600">3</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-steel-900">{member.name}</div>
                      <div className="text-sm text-steel-600">{member.role}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(member.status)}`}>
                      {member.status}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.availability}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">Cases: {member.caseLoad}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-4 gap-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs text-emerald-600">On Target</span>
                </div>
                <div className="text-2xl font-bold text-steel-900 font-sf">{metric.value}</div>
                <div className="text-sm text-steel-600">{metric.metric}</div>
                <div className="text-xs text-steel-500 mt-1">Target: {metric.target}</div>
              </div>
            ))}
          </div>
          
          {/* Recent Completions */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Recent Completions</h3>
              <Calendar className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="space-y-4">
              {recentCompletions.map((completion, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:bg-steel-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{completion.patient}</div>
                        <div className="text-sm text-steel-600">{completion.procedure}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{completion.operator}</div>
                        <div className="text-xs text-steel-600">Operator</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{completion.duration}</div>
                        <div className="text-xs text-steel-600">Duration</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-emerald-600">{completion.outcome}</div>
                        <div className="text-xs text-steel-600">{completion.complications}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{completion.time}</div>
                        <div className="text-xs text-steel-600">Completed</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoronaryCareTeamView;