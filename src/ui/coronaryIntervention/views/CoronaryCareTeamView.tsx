import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Heart, Users, Workflow, Shield, FileText, Calculator, ClipboardCheck, ListTodo, Stethoscope, AlertTriangle } from 'lucide-react';

// Import our new components
import CasePlanningTool from '../components/care-team/CasePlanningTool';
import ProtectedPCIChecklist from '../components/care-team/ProtectedPCIChecklist';
import CoronaryWorklist from '../components/care-team/CoronaryWorklist';

// Import clinical intelligence components
import CoronaryPhenotypeClassification from '../components/clinical/CoronaryPhenotypeClassification';
import AntiplateletContraindicationChecker from '../components/clinical/AntiplateletContraindicationChecker';
import CoronaryRiskScoreCalculator from '../components/clinical/CoronaryRiskScoreCalculator';
import CoronarySpecialtyPhenotypesDashboard from '../components/clinical/CoronarySpecialtyPhenotypesDashboard';
import AdvancedInterventionTracker from '../components/clinical/AdvancedInterventionTracker';

// Import clinical gap detection dashboard
import CADClinicalGapDetectionDashboard from '../components/clinical/CADClinicalGapDetectionDashboard';
import FRAMINGHAMHFCalculator from '../../../components/riskCalculators/FRAMINGHAMHFCalculator';
import SharedGRACEScoreCalculator from '../../../components/riskCalculators/GRACEScoreCalculator';

// Import existing components from config
import { coronaryCareTeamConfig } from '../config/careTeamConfig';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(3);
  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: CoronaryPhenotypeClassification },
 { id: 'risk-calc', label: 'Risk Calculator', component: CoronaryRiskScoreCalculator },
 { id: 'contraindication', label: 'Contraindication Checker', component: AntiplateletContraindicationChecker },
 { id: 'interventions', label: 'Intervention Tracker', component: AdvancedInterventionTracker },
 { id: 'specialty', label: 'Specialty Phenotypes', component: CoronarySpecialtyPhenotypesDashboard },
 { id: 'framingham', label: 'Framingham HF Score', component: FRAMINGHAMHFCalculator },
 { id: 'grace-calc', label: 'GRACE Score', component: SharedGRACEScoreCalculator },
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

// Extended interface to support custom tabs
interface CoronaryCareTeamViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'porsche' | 'chrome-blue' | 'medical-red' | 'crimson' | 'arterial';
  tabs: Array<{
 id: string;
 label: string;
 icon: React.ElementType;
 description?: string;
  }>;
  tabContent: {
 dashboard: React.ComponentType<any>;
 patients: React.ComponentType<any>;
 workflow: React.ComponentType<any>;
 safety: React.ComponentType<any>;
 team: React.ComponentType<any>;
 documentation: React.ComponentType<any>;
 planning: React.ComponentType<any>;
 checklist: React.ComponentType<any>;
 worklist: React.ComponentType<any>;
 clinicaltools: React.ComponentType<any>;
 'clinical-gaps': React.ComponentType<any>;
  };
}

// Extended tab type
type CoronaryCareTeamTab =
  | 'dashboard'
  | 'patients'
  | 'workflow'
  | 'safety'
  | 'team'
  | 'documentation'
  | 'planning'
  | 'checklist'
  | 'worklist'
  | 'clinicaltools'
  | 'clinical-gaps';

const CoronaryCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CoronaryCareTeamTab>('dashboard');

  const handleTabChange = (tab: CoronaryCareTeamTab) => {
    setActiveTab(tab);
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Extended configuration with our new components
  const config: CoronaryCareTeamViewConfig = {
 ...coronaryCareTeamConfig,
 tabs: [
 ...coronaryCareTeamConfig.tabs.filter(t => t.id !== 'clinical-gaps').slice(0, 2),
 {
 id: 'clinical-gaps',
 label: 'Clinical Gaps',
 icon: AlertTriangle,
 description: 'CAD clinical gap detection dashboard'
 },
 ...coronaryCareTeamConfig.tabs.filter(t => t.id !== 'clinical-gaps').slice(2),
 {
 id: 'planning',
 label: 'Case Planning',
 icon: Calculator,
 description: 'SYNTAX score analysis, CABG conduit selection, and hemodynamics planning'
 },
 {
 id: 'checklist',
 label: 'Protected PCI',
 icon: ClipboardCheck,
 description: 'Real-time procedure checklist and monitoring for high-risk PCI cases'
 },
 {
 id: 'worklist',
 label: 'Patient Worklist',
 icon: ListTodo,
 description: 'Comprehensive patient management with DAPT tracking and cardiac rehab'
 },
 {
 id: 'clinicaltools',
 label: 'Clinical Intelligence',
 icon: Stethoscope,
 description: 'Phenotype classification, risk calculators, contraindication checking, and intervention tracking'
 }
 ],
 tabContent: {
 ...coronaryCareTeamConfig.tabContent,
 planning: CasePlanningTool,
 checklist: ProtectedPCIChecklist,
 worklist: CoronaryWorklist,
 clinicaltools: ClinicalToolsPanel,
 'clinical-gaps': CADClinicalGapDetectionDashboard
 }
  };

  const renderActiveTabContent = () => {
 const TabComponent = config.tabContent[activeTab as keyof typeof config.tabContent];
 return TabComponent ? <TabComponent /> : null;
  };

  const getColorClasses = () => {
 switch (config.primaryColor) {
 case 'porsche':
 return {
 text: 'text-porsche-600',
 bg: 'bg-porsche-50',
 border: 'border-porsche-200',
 accent: 'porsche'
 };
 case 'chrome-blue':
 return {
 text: 'text-[#2C4A60]',
 bg: 'bg-[#f0f5fa]',
 border: 'border-[#C8D4DC]',
 accent: 'chrome-blue'
 };
 case 'medical-red':
 return {
 text: 'text-medical-red-600',
 bg: 'bg-medical-red-50',
 border: 'border-medical-red-200',
 accent: 'medical-red'
 };
 case 'crimson':
 return {
 text: 'text-crimson-600',
 bg: 'bg-crimson-50',
 border: 'border-crimson-200',
 accent: 'crimson'
 };
 case 'arterial':
 return {
 text: 'text-arterial-600',
 bg: 'bg-arterial-50',
 border: 'border-arterial-200',
 accent: 'arterial'
 };
 default:
 return {
 text: 'text-porsche-600',
 bg: 'bg-porsche-50',
 border: 'border-porsche-200',
 accent: 'porsche'
 };
 }
  };

  const colors = getColorClasses();

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation - Grid layout that adapts to more tabs */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
 {config.tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => handleTabChange(tab.id as CoronaryCareTeamTab)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg scale-105`
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? colors.text : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? colors.text : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className={`absolute inset-0 bg-gradient-to-r from-${colors.accent}-400/20 to-${colors.accent}-500/20 rounded-xl opacity-50`} />
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* Tab Content */}
 <div className="space-y-6">
 {renderActiveTabContent()}
 </div>
 </div>
 </div>
  );
};

export default CoronaryCareTeamView;
