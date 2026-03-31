import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Stethoscope } from 'lucide-react';

// Import Heart Failure Care Team components
import PatientWorklistEnhanced from '../components/care-team/PatientWorklistEnhanced';
import ReferralTrackerEnhanced from '../components/care-team/ReferralTrackerEnhanced';
import TeamCollaborationPanel from '../components/care-team/TeamCollaborationPanel';
import CareGapAnalyzer from '../components/care-team/CareGapAnalyzer';
import RealTimeHospitalAlerts from '../components/care-team/RealTimeHospitalAlerts';

// Import clinical intelligence components
import HFPhenotypeClassification from '../components/clinical/HFPhenotypeClassification';
import GDMTContraindicationChecker from '../components/clinical/GDMTContraindicationChecker';
import MAGGICScoreCalculator from '../components/clinical/MAGGICScoreCalculator';
import SpecialtyPhenotypesDashboard from '../components/clinical/SpecialtyPhenotypesDashboard';
import AdvancedDeviceTracker from '../components/clinical/AdvancedDeviceTracker';
import ClinicalGapDetectionDashboard from '../components/clinical/ClinicalGapDetectionDashboard';
import MAGGICCalculator from '../../../components/riskCalculators/MAGGICCalculator';
import INTERMACSCalculator from '../../../components/riskCalculators/INTERMACSCalculator';
import AmyloidosisScreener from '../../../components/phenotypeDetection/AmyloidosisScreener';
import PhenotypeScreeningPanel from '../../../components/phenotypeDetection/PhenotypeScreeningPanel';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC<{ activeToolTab?: string; onToolTabChange?: (tab: string) => void }> = ({ activeToolTab: externalToolTab, onToolTabChange }) => {
  const [internalToolTab, setInternalToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(0);
  const activeToolTab = externalToolTab || internalToolTab;
  const setActiveToolTab = (tab: string) => { setInternalToolTab(tab); onToolTabChange?.(tab); };

  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'HF Phenotype Classification', component: HFPhenotypeClassification },
 { id: 'risk-calc', label: 'MAGGIC Risk Score', component: MAGGICScoreCalculator },
 { id: 'contraindication', label: 'GDMT Contraindications', component: GDMTContraindicationChecker },
 { id: 'phenotypes-dashboard', label: 'Specialty Phenotypes', component: SpecialtyPhenotypesDashboard },
 { id: 'devices', label: 'Device Tracker', component: AdvancedDeviceTracker },
 { id: 'maggic-standalone', label: 'MAGGIC Calculator', component: MAGGICCalculator },
 { id: 'intermacs', label: 'INTERMACS Profile', component: INTERMACSCalculator },
 { id: 'amyloidosis', label: 'Amyloidosis Screener', component: AmyloidosisScreener },
 { id: 'phenotype-screening', label: 'Phenotype Screening', component: PhenotypeScreeningPanel },
  ];

  const ActiveTool = tools.find(t => t.id === activeToolTab)?.component;

  return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-bold text-titanium-900 flex items-center gap-2">
 <Stethoscope className="w-6 h-6 text-porsche-600" />
 Clinical Intelligence Tools
 </h3>
 <div className="flex items-center gap-2">
 <Users className="w-4 h-4 text-titanium-500" />
 <select
 value={selectedPatientIdx}
 onChange={(e) => setSelectedPatientIdx(Number(e.target.value))}
 className="text-sm border border-titanium-200 rounded-lg px-3 py-1.5 bg-white text-titanium-800 focus:outline-none focus:ring-2 focus:ring-porsche-300"
 >
 {DEMO_PATIENT_ROSTER.map((p, i) => (
 <option key={p.context.patientId} value={i}>{p.label}</option>
 ))}
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
 ? 'bg-porsche-600 text-white shadow-lg'
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

type TabId = 'dashboard' | 'patients' | 'workflow' | 'safety' | 'hospital-alerts' | 'team' | 'documentation' | 'clinicaltools' | 'clinical-gaps';

const CareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };
  const [activeToolTab, setActiveToolTab] = useState<string>('phenotype');
  const [docTemplateFeedback, setDocTemplateFeedback] = useState<string | null>(null);
  const [expandedSafetyCard, setExpandedSafetyCard] = useState<string | null>(null);

  const tabs = [
 { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Care team overview & alerts' },
 { id: 'patients', label: 'Patients', icon: Users, description: 'Enhanced patient worklist' },
 { id: 'workflow', label: 'Workflow', icon: Calendar, description: 'GDMT optimization workflow' },
 { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
 { id: 'hospital-alerts', label: 'Hospital Alerts', icon: Heart, description: 'Real-time heart failure hospital alerts' },
 { id: 'team', label: 'Team', icon: UserCheck, description: 'Team collaboration & communication' },
 { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation tools' },
 { id: 'clinicaltools', label: 'Clinical Intelligence', icon: Stethoscope, description: 'Phenotype classification, risk calculators, and clinical decision support' },
 { id: 'clinical-gaps', label: 'Clinical Gaps', icon: AlertTriangle, description: '25-gap clinical gap detection' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'dashboard':
 return (
 <div className="space-y-6">
 <RealTimeHospitalAlerts />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <CareGapAnalyzer />
 <TeamCollaborationPanel />
 </div>
 </div>
 );
 case 'patients':
 return (
 <div className="space-y-6">
 <PatientWorklistEnhanced />
 </div>
 );
 case 'workflow':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Heart className="w-5 h-5 text-porsche-600" />
 GDMT Optimization Workflow
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">4-Pillar GDMT Optimization</h4>
 <div className="space-y-3">
 {[
 { pillar: 'ACE/ARB/ARNI', current: '89.2%', target: '≥95%', status: 'amber' },
 { pillar: 'Beta Blockers', current: '91.7%', target: '≥95%', status: 'amber' },
 { pillar: 'MRA', current: '76.4%', target: '≥85%', status: 'red' },
 { pillar: 'SGLT2i', current: '62.1%', target: '≥75%', status: 'red' }
 ].map((item, index) => (
 <div key={item.pillar} className={`p-3 rounded-lg border ${
 item.status === 'red' ? 'bg-red-50 border-red-200' :
 item.status === 'amber' ? 'bg-[#F0F5FA] border-[#C8D4DC]' : 'bg-[#F0F7F4] border-[#D8EDE6]'
 }`}>
 <div className="flex justify-between items-center">
 <span className="font-medium text-titanium-900">{item.pillar}</span>
 <div className="text-right">
 <div className="font-semibold text-titanium-900">{item.current}</div>
 <div className="text-xs text-titanium-600">{item.target}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Workflow Actions</h4>
 <div className="space-y-2">
 <button onClick={() => { handleTabChange('clinicaltools'); setActiveToolTab('contraindication'); }} className="w-full text-left p-3 rounded-lg bg-chrome-50 border border-chrome-200 hover:bg-chrome-100 transition-colors">
 <div className="font-medium text-chrome-900">Review MRA Eligibility</div>
 <div className="text-sm text-chrome-600">23 patients pending review</div>
 </button>
 <button onClick={() => { handleTabChange('clinicaltools'); setActiveToolTab('contraindication'); }} className="w-full text-left p-3 rounded-lg bg-arterial-50 border border-arterial-200 hover:bg-arterial-100 transition-colors">
 <div className="font-medium text-arterial-900">SGLT2i Assessment</div>
 <div className="text-sm text-arterial-600">31 patients for evaluation</div>
 </button>
 <button onClick={() => { handleTabChange('clinicaltools'); setActiveToolTab('contraindication'); }} className="w-full text-left p-3 rounded-lg bg-[#F0F7F4] border border-[#D8EDE6] hover:bg-[#C8D4DC] transition-colors">
 <div className="font-medium text-[#2C4A60]">Dose Optimization</div>
 <div className="text-sm text-[#2C4A60]">18 patients ready for titration</div>
 </button>
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
 Safety Monitoring
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {[
 { alert: 'High K+', count: 7, color: 'red', id: 'high-k', patients: ['Johnson, Mary - K+ 5.8', 'Smith, Robert - K+ 6.1', 'Davis, Carol - K+ 5.6'] },
 { alert: 'Low BP', count: 12, color: 'amber', id: 'low-bp', patients: ['Brown, James - BP 88/52', 'Wilson, Sarah - BP 90/58', 'Taylor, Mark - BP 85/50'] },
 { alert: 'Renal Function', count: 5, color: 'red', id: 'renal', patients: ['Anderson, Lisa - Cr 2.4', 'Thomas, John - Cr 2.1', 'Jackson, Amy - GFR 22'] },
 { alert: 'Drug Interactions', count: 3, color: 'amber', id: 'drug-interactions', patients: ['White, David - NSAID + ACEi', 'Harris, Susan - K-sparing + MRA', 'Martin, Paul - Digoxin + Amiodarone'] },
 { alert: 'Contraindications', count: 8, color: 'red', id: 'contraindications', patients: ['Clark, Nancy - ARNI + ACEi <36hr', 'Lewis, Rick - Bilateral RAS + ACEi', 'Walker, Jane - Angioedema hx + ACEi'] },
 { alert: 'Side Effects', count: 15, color: 'amber', id: 'side-effects', patients: ['Hall, Mike - Cough (ACEi)', 'Allen, Beth - Dizziness (BB)', 'Young, Tom - Gynecomastia (Spironolactone)'] }
 ].map((item, index) => (
 <div key={item.id}>
 <div
 onClick={() => setExpandedSafetyCard(expandedSafetyCard === item.id ? null : item.id)}
 className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
 item.color === 'red' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-[#F0F5FA] border-[#C8D4DC] hover:bg-[#F0F5FA]'
 } ${expandedSafetyCard === item.id ? 'ring-2 ring-offset-1 ' + (item.color === 'red' ? 'ring-red-400' : 'ring-amber-400') : ''}`}
 >
 <div className="text-center">
 <div className={`text-2xl font-bold ${
 item.color === 'red' ? 'text-red-600' : 'text-[#6B7280]'
 }`}>{item.count}</div>
 <div className="text-sm font-medium text-titanium-700">{item.alert}</div>
 <div className="text-xs text-titanium-500 mt-1">{expandedSafetyCard === item.id ? 'Click to collapse' : 'Click to view patients'}</div>
 </div>
 </div>
 {expandedSafetyCard === item.id && (
 <div className={`mt-2 p-3 rounded-lg border text-sm ${
 item.color === 'red' ? 'bg-red-50 border-red-100' : 'bg-[#F0F5FA] border-[#C8D4DC]'
 }`}>
 <div className="font-medium text-titanium-800 mb-2">Affected Patients (showing 3 of {item.count}):</div>
 {item.patients.map((patient, pIdx) => (
 <div key={patient} className="py-1 px-2 text-titanium-700 border-b border-titanium-100 last:border-b-0">
 {patient}
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 case 'hospital-alerts':
 return (
 <div className="space-y-6">
 <RealTimeHospitalAlerts />
 </div>
 );
 case 'team':
 return (
 <div className="space-y-6">
 <TeamCollaborationPanel />
 </div>
 );
 case 'documentation':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5 text-porsche-600" />
 Clinical Documentation
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Recent Notes</h4>
 <div className="space-y-3">
 {[
 { patient: 'Johnson, Mary', type: 'GDMT Review', time: '2 hours ago' },
 { patient: 'Smith, John', type: 'Follow-up', time: '4 hours ago' },
 { patient: 'Davis, Sarah', type: 'Medication Change', time: '6 hours ago' }
 ].map((note, index) => (
 <div key={`${note.patient}-${note.type}`} className="p-3 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="font-medium text-titanium-900">{note.patient}</div>
 <div className="text-sm text-chrome-600">{note.type}</div>
 <div className="text-xs text-titanium-500">{note.time}</div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Documentation Tools</h4>
 <div className="space-y-2">
 <button onClick={() => { setDocTemplateFeedback('gdmt'); setTimeout(() => setDocTemplateFeedback(null), 2000); }} className="w-full text-left p-3 rounded-lg bg-[#F0F7F4] border border-[#D8EDE6] hover:bg-[#C8D4DC] transition-colors">
 <div className="font-medium text-[#2C4A60]">{docTemplateFeedback === 'gdmt' ? '✓ Template Loaded' : 'GDMT Template'}</div>
 <div className="text-sm text-[#2C4A60]">Standardized assessment form</div>
 </button>
 <button onClick={() => { setDocTemplateFeedback('discharge'); setTimeout(() => setDocTemplateFeedback(null), 2000); }} className="w-full text-left p-3 rounded-lg bg-chrome-50 border border-chrome-200 hover:bg-chrome-100 transition-colors">
 <div className="font-medium text-chrome-900">{docTemplateFeedback === 'discharge' ? '✓ Template Loaded' : 'Discharge Planning'}</div>
 <div className="text-sm text-chrome-600">Heart failure discharge checklist</div>
 </button>
 <button onClick={() => { setDocTemplateFeedback('quality'); setTimeout(() => setDocTemplateFeedback(null), 2000); }} className="w-full text-left p-3 rounded-lg bg-arterial-50 border border-arterial-200 hover:bg-arterial-100 transition-colors">
 <div className="font-medium text-arterial-900">{docTemplateFeedback === 'quality' ? '✓ Template Loaded' : 'Quality Metrics'}</div>
 <div className="text-sm text-arterial-600">Performance documentation</div>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'clinicaltools':
 return <ClinicalToolsPanel activeToolTab={activeToolTab} onToolTabChange={setActiveToolTab} />;
 case 'clinical-gaps':
 return <ClinicalGapDetectionDashboard />;
 default:
 return (
 <div className="space-y-6">
 <RealTimeHospitalAlerts />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <CareGapAnalyzer />
 <TeamCollaborationPanel />
 </div>
 </div>
 );
 }
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => handleTabChange(tab.id as TabId)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? 'bg-porsche-50 border-porsche-200 text-porsche-600 shadow-lg scale-105'
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className="absolute inset-0 bg-gradient-to-r from-porsche-400 to-porsche-500 rounded-xl opacity-50" />
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

export default CareTeamView;
