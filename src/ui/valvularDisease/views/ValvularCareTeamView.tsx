import React, { useState, useEffect, useRef } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Users, Calendar, Shield, Activity, FileText, Heart, Scissors, ListTodo, Eye, Stethoscope, Search, AlertTriangle } from 'lucide-react';

// Import Valvular Disease components
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';

// Import clinical intelligence components
import ValvePhenotypeClassification from '../components/clinical/ValvePhenotypeClassification';
import ValveTherapyContraindicationChecker from '../components/clinical/ValveTherapyContraindicationChecker';
import ValveRiskScoreCalculator from '../components/clinical/ValveRiskScoreCalculator';
import ValveSpecialtyPhenotypesDashboard from '../components/clinical/ValveSpecialtyPhenotypesDashboard';
import AdvancedValveProcedureTracker from '../components/clinical/AdvancedValveProcedureTracker';
import VDClinicalGapDetectionDashboard from '../components/clinical/VDClinicalGapDetectionDashboard';

type TabId = 'dashboard' | 'patients' | 'clinical-gaps' | 'surgical-planning' | 'surveillance' | 'worklist' | 'safety' | 'team' | 'documentation' | 'clinicaltools';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(4);
  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: ValvePhenotypeClassification },
 { id: 'risk-calc', label: 'Risk Calculator', component: ValveRiskScoreCalculator },
 { id: 'contraindication', label: 'Contraindication Checker', component: ValveTherapyContraindicationChecker },
 { id: 'interventions', label: 'Procedure Tracker', component: AdvancedValveProcedureTracker },
 { id: 'specialty', label: 'Specialty Phenotypes', component: ValveSpecialtyPhenotypesDashboard },
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

const ValvularCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
 'Echo completed': true,
 'Cardiac catheterization': true,
 'CT planning (if TAVR)': false,
 'Anesthesia clearance': true,
 'Blood type & screen': false
  });

  const tabs = [
 { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Valve care team overview' },
 { id: 'patients', label: 'Patients', icon: Users, description: 'Valve patient management' },
 { id: 'clinical-gaps', label: 'Clinical Gaps', icon: AlertTriangle, description: 'AI-driven clinical gap detection' },
 { id: 'surgical-planning', label: 'Surgical Planning', icon: Scissors, description: 'Surgical planning checklist' },
 { id: 'surveillance', label: 'Valve Surveillance', icon: Eye, description: 'Repaired valve surveillance' },
 { id: 'worklist', label: 'Valve Worklist', icon: ListTodo, description: 'Comprehensive valve worklist' },
 { id: 'clinicaltools', label: 'Clinical Intelligence', icon: Stethoscope, description: 'Phenotype classification, risk calculators, and clinical decision support' },
 { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
 { id: 'team', label: 'Team', icon: Users, description: 'Team collaboration' },
 { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'dashboard':
 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Heart className="w-8 h-8 text-porsche-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">187</div>
 <div className="text-sm text-titanium-600">Active Valve Patients</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Scissors className="w-8 h-8 text-green-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">23</div>
 <div className="text-sm text-titanium-600">Surgeries This Month</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Eye className="w-8 h-8 text-amber-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">89</div>
 <div className="text-sm text-titanium-600">Due for Echo</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Shield className="w-8 h-8 text-red-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">7</div>
 <div className="text-sm text-titanium-600">High Risk Cases</div>
 </div>
 </div>
 </div>
 </div>
 <ValvePatientHeatmap />
 </div>
 );
 case 'patients':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-2xl font-bold text-titanium-900">Valve Patient Management</h3>
 <div className="relative">
   <Search className="w-4 h-4 text-titanium-400 absolute left-3 top-1/2 -translate-y-1/2" />
   <input
     type="text"
     value={searchTerm}
     onChange={(e) => setSearchTerm(e.target.value)}
     placeholder="Search patients..."
     className="pl-9 pr-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-porsche-500 w-48"
   />
 </div>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-titanium-200">
 <th className="text-left p-3 font-semibold text-titanium-700">Patient</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Valve Type</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Severity</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Last Echo</th>
 <th className="text-left p-3 font-semibold text-titanium-700">Next Action</th>
 </tr>
 </thead>
 <tbody>
 {[
 { name: 'Anderson, Michael', valve: 'Aortic', severity: 'Severe AS', echo: '2 weeks ago', action: 'Surgical evaluation' },
 { name: 'Brown, Sarah', valve: 'Mitral', severity: 'Moderate MR', echo: '1 month ago', action: 'Repeat echo 6mo' },
 { name: 'Davis, Robert', valve: 'Aortic', severity: 'Mild AI', echo: '6 months ago', action: 'Annual echo' },
 { name: 'Wilson, Linda', valve: 'Tricuspid', severity: 'Severe TR', echo: '1 week ago', action: 'Heart team review' }
 ].filter(patient => {
 if (!debouncedSearch) return true;
 const q = debouncedSearch.toLowerCase();
 const searchable = [patient.name, patient.valve, patient.severity, patient.action].join(' ').toLowerCase();
 return searchable.includes(q);
 }).map((patient, index) => (
 <tr key={patient.name} className="border-b border-titanium-100 hover:bg-porsche-50/50">
 <td className="p-3 font-medium text-titanium-900">{patient.name}</td>
 <td className="p-3 text-titanium-700">{patient.valve}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.severity.includes('Severe') ? 'bg-red-100 text-red-700' :
 patient.severity.includes('Moderate') ? 'bg-amber-100 text-amber-700' :
 'bg-green-100 text-green-700'
 }`}>
 {patient.severity}
 </span>
 </td>
 <td className="p-3 text-titanium-700">{patient.echo}</td>
 <td className="p-3 text-porsche-600 font-medium">{patient.action}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
 case 'clinical-gaps':
 return (
 <VDClinicalGapDetectionDashboard />
 );
 case 'surgical-planning':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6">Surgical Planning Checklist</h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Pre-operative Assessment</h4>
 <div className="space-y-3">
 {[
 'Echo completed',
 'Cardiac catheterization',
 'CT planning (if TAVR)',
 'Anesthesia clearance',
 'Blood type & screen'
 ].map((item, index) => (
 <label key={item} className="flex items-center space-x-3 cursor-pointer hover:bg-chrome-50 rounded-lg p-1 -m-1 transition-colors">
 <input
 type="checkbox"
 checked={checklistState[item] ?? false}
 onChange={() => setChecklistState(prev => ({ ...prev, [item]: !prev[item] }))}
 className="w-5 h-5 text-chrome-600 border-titanium-300 rounded cursor-pointer"
 />
 <span className={`text-sm ${checklistState[item] ? 'text-titanium-700 line-through' : 'text-titanium-500'}`}>
 {item}
 </span>
 </label>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Risk Assessment</h4>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span className="text-titanium-600">STS Score</span>
 <span className="font-bold text-amber-600">4.2%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">EuroSCORE II</span>
 <span className="font-bold text-amber-600">3.8%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Frailty Assessment</span>
 <span className="font-bold text-green-600">Not frail</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Recommendation</span>
 <span className="font-bold text-chrome-600">Surgical AVR</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'surveillance':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6">Repaired Valve Surveillance</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { status: 'Excellent Function', count: 45, bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' },
 { status: 'Mild Dysfunction', count: 12, bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
 { status: 'Needs Follow-up', count: 8, bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-600' }
 ].map((item, index) => (
 <div key={item.status} className={`text-center p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
 <div className={`text-3xl font-bold ${item.textColor} mb-2`}>{item.count}</div>
 <div className="font-semibold text-titanium-900">{item.status}</div>
 </div>
 ))}
 </div>
 </div>
 );
 case 'worklist':
 return <ValvularSurgicalNetworkVisualization />;
 case 'clinicaltools':
 return <ClinicalToolsPanel />;
 default:
 return (
 <div className="space-y-6">
 <ValvePatientHeatmap />
 </div>
 );
 }
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as TabId)}
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

export default ValvularCareTeamView;
