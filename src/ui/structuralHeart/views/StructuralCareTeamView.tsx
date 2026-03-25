import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp, Stethoscope } from 'lucide-react';

// Import SH Valve Risk Score Calculator - the key calculator for this module
import SHValveRiskScoreCalculator from '../components/clinical/SHValveRiskScoreCalculator';

// Import remaining clinical intelligence components
import SHValvePhenotypeClassification from '../components/clinical/SHValvePhenotypeClassification';
import SHValveTherapyContraindicationChecker from '../components/clinical/SHValveTherapyContraindicationChecker';
import SHAdvancedProcedureTracker from '../components/clinical/SHAdvancedProcedureTracker';
import SHSpecialtyPhenotypesDashboard from '../components/clinical/SHSpecialtyPhenotypesDashboard';
import SHClinicalGapDetectionDashboard from '../components/clinical/SHClinicalGapDetectionDashboard';
import SHRealTimeHospitalAlerts from '../components/care-team/SHRealTimeHospitalAlerts';
import AmyloidosisScreener from '../../../components/phenotypeDetection/AmyloidosisScreener';

// Import Structural Heart specific components
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';

type TabId = 'dashboard' | 'patients' | 'workflow' | 'safety' | 'team' | 'documentation' | 'calculator' | 'clinicaltools' | 'clinical-gaps' | 'hospital-alerts';

// Clinical Intelligence sub-tab panel (includes all 5 tools, with risk calc as default)
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(4);
  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: SHValvePhenotypeClassification },
 { id: 'risk-calc', label: 'Risk Calculator', component: SHValveRiskScoreCalculator },
 { id: 'contraindication', label: 'Contraindication Checker', component: SHValveTherapyContraindicationChecker },
 { id: 'interventions', label: 'Procedure Tracker', component: SHAdvancedProcedureTracker },
 { id: 'specialty', label: 'Specialty Phenotypes', component: SHSpecialtyPhenotypesDashboard },
 { id: 'amyloidosis', label: 'Amyloidosis Screener', component: AmyloidosisScreener },
  ];

  const ActiveTool = tools.find(t => t.id === activeToolTab)?.component;

  return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center justify-between mb-4">
   <h3 className="text-xl font-bold text-titanium-900 flex items-center gap-2">
     <Stethoscope className="w-6 h-6 text-arterial-600" />
     Clinical Intelligence Tools
   </h3>
   <div className="flex items-center gap-2">
     <Users className="w-4 h-4 text-titanium-500" />
     <select value={selectedPatientIdx} onChange={(e) => setSelectedPatientIdx(Number(e.target.value))} className="text-sm border border-titanium-200 rounded-lg px-3 py-1.5 bg-white text-titanium-800 focus:outline-none focus:ring-2 focus:ring-porsche-300">
       {DEMO_PATIENT_ROSTER.map((p, i) => (<option key={p.context.patientId} value={i}>{p.label}</option>))}
     </select>
   </div>
 </div>
 <div className="flex flex-wrap gap-2">
 {tools.map(tool => (
 <button
 key={tool.id}
 onClick={() => setActiveToolTab(tool.id)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
 activeToolTab === tool.id
 ? 'bg-arterial-600 text-white shadow-lg'
 : 'bg-white text-titanium-600 hover:bg-white border border-titanium-200'
 }`}
 >
 {tool.label}
 </button>
 ))}
 </div>
 </div>
 {ActiveTool && <ActiveTool patientData={selectedPatient} />}
 </div>
  );
};

const StructuralCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
 { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Structural heart metrics overview' },
 { id: 'patients', label: 'Patients', icon: Users, description: 'TAVR and structural heart patients' },
 { id: 'workflow', label: 'Workflow', icon: Calendar, description: 'Heart team workflows' },
 { id: 'hospital-alerts', label: 'Hospital Alerts', icon: Heart, description: 'Real-time structural heart hospital alerts' },
 { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
 { id: 'calculator', label: 'STS Risk Score', icon: Gauge, description: 'Surgical risk calculator' },
 { id: 'clinicaltools', label: 'Clinical Intelligence', icon: Stethoscope, description: 'Phenotype classification, contraindication checking, and procedure tracking' },
 { id: 'team', label: 'Team', icon: UserCheck, description: 'Heart team collaboration' },
 { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation' },
 { id: 'clinical-gaps', label: 'Clinical Gaps', icon: AlertTriangle, description: 'SH clinical gap detection dashboard' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'dashboard':
 return (
 <div className="space-y-6">
 {/* Structural Heart Metrics Overview */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Heart className="w-8 h-8 text-arterial-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">327</div>
 <div className="text-sm text-titanium-600">TAVR Procedures MTD</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Activity className="w-8 h-8 text-green-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">98.2%</div>
 <div className="text-sm text-titanium-600">Success Rate</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Clock className="w-8 h-8 text-amber-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">2.1</div>
 <div className="text-sm text-titanium-600">Avg LOS (days)</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Users className="w-8 h-8 text-chrome-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">152</div>
 <div className="text-sm text-titanium-600">Active Referrals</div>
 </div>
 </div>
 </div>
 </div>
 <TAVRAnalyticsDashboard />
 </div>
 );
 case 'patients':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-arterial-600" />
 Structural Heart Patient Worklist
 </h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-titanium-200">
 <th className="text-left p-3 font-semibold text-titanium-700">Patient</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Procedure</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Risk Score</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Status</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Next Action</th>
 </tr>
 </thead>
 <tbody>
 {[
 { name: 'Smith, John', procedure: 'TAVR', risk: 'Low (2.1%)', status: 'Pre-op', action: 'Heart Team Review' },
 { name: 'Johnson, Mary', procedure: 'MitraClip', risk: 'Moderate (5.8%)', status: 'Scheduled', action: 'Pre-op Testing' },
 { name: 'Williams, Robert', procedure: 'TAVR', risk: 'High (12.3%)', status: 'Evaluation', action: 'Risk Assessment' },
 { name: 'Brown, Sarah', procedure: 'TriClip', risk: 'Low (1.9%)', status: 'Post-op', action: 'Follow-up Echo' }
 ].map((patient) => (
 <tr key={patient.name} className="border-b border-titanium-100 hover:bg-arterial-50/50">
 <td className="p-3 font-medium text-titanium-900">{patient.name}</td>
 <td className="p-3 text-titanium-700">{patient.procedure}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.risk.includes('Low') ? 'bg-green-100 text-green-700' :
 patient.risk.includes('Moderate') ? 'bg-amber-100 text-amber-700' :
 'bg-red-100 text-red-700'
 }`}>
 {patient.risk}
 </span>
 </td>
 <td className="p-3 text-titanium-700">{patient.status}</td>
 <td className="p-3 text-arterial-600 font-medium">{patient.action}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 case 'calculator':
 return (
 <div className="space-y-6">
 <SHValveRiskScoreCalculator />
 </div>
 );
 case 'clinicaltools':
 return <ClinicalToolsPanel />;
 case 'clinical-gaps':
 return <SHClinicalGapDetectionDashboard />;
 case 'hospital-alerts':
 return <SHRealTimeHospitalAlerts />;
 case 'workflow':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-arterial-600" />
 Heart Team Workflow
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Pending Reviews</h4>
 <div className="space-y-3">
 {[
 { patient: 'Davis, Michael', procedure: 'TAVR', urgency: 'High' },
 { patient: 'Wilson, Linda', procedure: 'MitraClip', urgency: 'Medium' },
 { patient: 'Garcia, Carlos', procedure: 'PFO Closure', urgency: 'Low' }
 ].map((item) => (
 <div key={item.patient} className={`p-3 rounded-lg border ${
 item.urgency === 'High' ? 'bg-red-50 border-red-200' :
 item.urgency === 'Medium' ? 'bg-amber-50 border-amber-200' :
 'bg-green-50 border-green-200'
 }`}>
 <div className="font-medium text-titanium-900">{item.patient}</div>
 <div className="text-sm text-titanium-600">{item.procedure}</div>
 <div className={`text-xs font-medium ${
 item.urgency === 'High' ? 'text-red-600' :
 item.urgency === 'Medium' ? 'text-amber-600' :
 'text-green-600'
 }`}>
 {item.urgency} Priority
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Today's Procedures</h4>
 <div className="space-y-3">
 {[
 { time: '08:00', patient: 'Anderson, Kate', procedure: 'TAVR' },
 { time: '10:30', patient: 'Martinez, Jose', procedure: 'MitraClip' },
 { time: '14:00', patient: 'Thompson, David', procedure: 'PFO Closure' }
 ].map((item) => (
 <div key={`${item.time}-${item.patient}`} className="p-3 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="flex justify-between items-center">
 <div>
 <div className="font-medium text-titanium-900">{item.patient}</div>
 <div className="text-sm text-chrome-600">{item.procedure}</div>
 </div>
 <div className="text-sm font-medium text-chrome-700">{item.time}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Follow-up Required</h4>
 <div className="space-y-3">
 {[
 { patient: 'Lee, Susan', days: '30-day Echo', status: 'Due' },
 { patient: 'Miller, James', days: '90-day Follow-up', status: 'Overdue' },
 { patient: 'Taylor, Nancy', days: '6-month CT', status: 'Scheduled' }
 ].map((item) => (
 <div key={item.patient} className={`p-3 rounded-lg border ${
 item.status === 'Overdue' ? 'bg-red-50 border-red-200' :
 item.status === 'Due' ? 'bg-amber-50 border-amber-200' :
 'bg-green-50 border-green-200'
 }`}>
 <div className="font-medium text-titanium-900">{item.patient}</div>
 <div className="text-sm text-titanium-600">{item.days}</div>
 <div className={`text-xs font-medium ${
 item.status === 'Overdue' ? 'text-red-600' :
 item.status === 'Due' ? 'text-amber-600' :
 'text-green-600'
 }`}>
 {item.status}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'safety':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Shield className="w-5 h-5 text-red-600" />
 Safety Monitoring & Risk Assessment
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { alert: 'High Surgical Risk', count: 3, color: 'red' },
 { alert: 'Bleeding Risk', count: 7, color: 'amber' },
 { alert: 'Renal Function', count: 2, color: 'red' },
 { alert: 'Contraindications', count: 1, color: 'amber' }
 ].map((item) => (
 <div key={item.alert} className={`p-4 rounded-xl border ${
 item.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
 }`}>
 <div className="text-center">
 <div className={`text-2xl font-bold ${
 item.color === 'red' ? 'text-red-600' : 'text-amber-600'
 }`}>{item.count}</div>
 <div className="text-sm font-medium text-titanium-700">{item.alert}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 case 'team':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <UserCheck className="w-5 h-5 text-arterial-600" />
 Heart Team Collaboration
 </h3>
 <StructuralReferralNetworkVisualization />
 </div>
 </div>
 );
 case 'documentation':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5 text-arterial-600" />
 Clinical Documentation
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Recent Notes</h4>
 <div className="space-y-3">
 {[
 { patient: 'Smith, John', type: 'TAVR Evaluation', time: '1 hour ago' },
 { patient: 'Davis, Mary', type: 'Heart Team Note', time: '3 hours ago' },
 { patient: 'Wilson, Bob', type: 'Post-op Note', time: '5 hours ago' }
 ].map((note) => (
 <div key={note.patient} className="p-3 bg-arterial-50 rounded-lg border border-arterial-200">
 <div className="font-medium text-titanium-900">{note.patient}</div>
 <div className="text-sm text-arterial-600">{note.type}</div>
 <div className="text-xs text-titanium-500">{note.time}</div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Documentation Tools</h4>
 <div className="space-y-2">
 <button className="w-full text-left p-3 rounded-lg bg-arterial-50 border border-arterial-200 hover:bg-arterial-100 transition-colors">
 <div className="font-medium text-arterial-900">TAVR Assessment</div>
 <div className="text-sm text-arterial-600">Comprehensive evaluation form</div>
 </button>
 <button className="w-full text-left p-3 rounded-lg bg-chrome-50 border border-chrome-200 hover:bg-chrome-100 transition-colors">
 <div className="font-medium text-chrome-900">Heart Team Note</div>
 <div className="text-sm text-chrome-600">Multidisciplinary decision template</div>
 </button>
 <button className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
 <div className="font-medium text-green-900">Procedure Note</div>
 <div className="text-sm text-green-600">Standardized operative note</div>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 default:
 return (
 <div className="space-y-6">
 <TAVRAnalyticsDashboard />
 </div>
 );
 }
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as TabId)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? 'bg-arterial-50 border-arterial-200 text-arterial-600 shadow-lg scale-105'
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? 'text-arterial-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? 'text-arterial-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className="absolute inset-0 bg-gradient-to-r from-arterial-400/20 to-arterial-500/20 rounded-xl opacity-50" />
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* Tab Content */}
 <div className="space-y-6">
 {renderTabContent()}
 </div>
 </div>
 </div>
  );
};

export default StructuralCareTeamView;
