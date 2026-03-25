import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Heart, Users, Workflow, Shield, FileText, Scissors, Route, Bandage, ListTodo, Stethoscope, AlertTriangle } from 'lucide-react';

// Import our new components
import LimbSalvageChecklist from '../components/care-team/LimbSalvageChecklist';
import CasePlanningWorksheet from '../components/care-team/CasePlanningWorksheet';
import WoundCareIntegration from '../components/care-team/WoundCareIntegration';
import PeripheralWorklist from '../components/care-team/PeripheralWorklist';

// Import clinical intelligence components
import PADPhenotypeClassification from '../components/clinical/PADPhenotypeClassification';
import InterventionContraindicationChecker from '../components/clinical/InterventionContraindicationChecker';
import PADRiskScoreCalculator from '../components/clinical/PADRiskScoreCalculator';
import PADSpecialtyPhenotypesDashboard from '../components/clinical/PADSpecialtyPhenotypesDashboard';
import AdvancedInterventionTracker from '../components/clinical/AdvancedInterventionTracker';

// Import clinical gap detection dashboard
import PVClinicalGapDetectionDashboard from '../components/clinical/PVClinicalGapDetectionDashboard';
import WellsPECalculator from '../../../components/riskCalculators/WellsPECalculator';

// Import existing components from config
import { peripheralCareTeamConfig } from '../config/careTeamConfig';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(3);
  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: PADPhenotypeClassification },
 { id: 'risk-calc', label: 'Risk Calculator', component: PADRiskScoreCalculator },
 { id: 'contraindication', label: 'Contraindication Checker', component: InterventionContraindicationChecker },
 { id: 'interventions', label: 'Intervention Tracker', component: AdvancedInterventionTracker },
 { id: 'specialty', label: 'Specialty Phenotypes', component: PADSpecialtyPhenotypesDashboard },
 { id: 'wells-pe', label: 'Wells PE Score', component: WellsPECalculator },
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
interface PeripheralCareTeamViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'porsche' | 'medical-green' | 'medical-red' | 'medical-amber' | 'medical-arterial';
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
 limbsalvage: React.ComponentType<any>;
 caseplanning: React.ComponentType<any>;
 woundcare: React.ComponentType<any>;
 worklist: React.ComponentType<any>;
 clinicaltools: React.ComponentType<any>;
 'clinical-gaps': React.ComponentType<any>;
  };
}

// Extended tab type
type PeripheralCareTeamTab =
  | 'dashboard'
  | 'patients'
  | 'workflow'
  | 'safety'
  | 'team'
  | 'documentation'
  | 'limbsalvage'
  | 'caseplanning'
  | 'woundcare'
  | 'worklist'
  | 'clinicaltools'
  | 'clinical-gaps';

const PeripheralCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PeripheralCareTeamTab>('dashboard');

  // Extended configuration with our new components
  const config: PeripheralCareTeamViewConfig = {
 ...peripheralCareTeamConfig,
 tabs: [
 ...peripheralCareTeamConfig.tabs,
 {
 id: 'limbsalvage',
 label: 'Limb Salvage',
 icon: Scissors,
 description: 'WIfI assessment, amputation risk calculation, and limb salvage planning'
 },
 {
 id: 'caseplanning',
 label: 'Case Planning',
 icon: Route,
 description: 'TASC grading, treatment strategy, and comprehensive procedure planning'
 },
 {
 id: 'woundcare',
 label: 'Wound Care',
 icon: Bandage,
 description: 'CLI/CLTI wound management with multidisciplinary team coordination'
 },
 {
 id: 'worklist',
 label: 'Peripheral Worklist',
 icon: ListTodo,
 description: 'Comprehensive patient management with vascular lab scheduling'
 },
 {
 id: 'clinicaltools',
 label: 'Clinical Intelligence',
 icon: Stethoscope,
 description: 'Phenotype classification, risk calculators, contraindication checking, and intervention tracking'
 },
 {
 id: 'clinical-gaps',
 label: 'Clinical Gaps',
 icon: AlertTriangle,
 description: 'PV clinical gap detection dashboard'
 }
 ],
 tabContent: {
 ...peripheralCareTeamConfig.tabContent,
 limbsalvage: LimbSalvageChecklist,
 caseplanning: CasePlanningWorksheet,
 woundcare: WoundCareIntegration,
 worklist: PeripheralWorklist,
 clinicaltools: ClinicalToolsPanel,
 'clinical-gaps': PVClinicalGapDetectionDashboard
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
 case 'medical-green':
 return {
 text: 'text-medical-green-600',
 bg: 'bg-medical-green-50',
 border: 'border-medical-green-200',
 accent: 'medical-green'
 };
 case 'medical-red':
 return {
 text: 'text-medical-red-600',
 bg: 'bg-medical-red-50',
 border: 'border-medical-red-200',
 accent: 'medical-red'
 };
 case 'medical-amber':
 return {
 text: 'text-medical-amber-600',
 bg: 'bg-medical-amber-50',
 border: 'border-medical-amber-200',
 accent: 'medical-amber'
 };
 case 'medical-arterial':
 return {
 text: 'text-medical-arterial-600',
 bg: 'bg-medical-arterial-50',
 border: 'border-medical-arterial-200',
 accent: 'medical-arterial'
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
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-11 gap-4">
 {config.tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as PeripheralCareTeamTab)}
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

export default PeripheralCareTeamView;
