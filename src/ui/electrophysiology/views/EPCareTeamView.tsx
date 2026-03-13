import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT } from '../../../types/shared';
import { Heart, Users, Workflow, Shield, FileText, Zap, Clock, Calendar, AlertTriangle, CheckSquare, TrendingDown, Activity, Stethoscope } from 'lucide-react';

// Import new EP Care Team components
import EPPriorityWorklist from '../components/care-team/EPPriorityWorklist';
import EPPatientDetailPanel from '../components/care-team/EPPatientDetailPanel';
import EPPatientTimeline from '../components/care-team/EPPatientTimeline';
import EPActionQueue from '../components/care-team/EPActionQueue';
import EPAlertDashboard from '../components/care-team/EPAlertDashboard';
import EPTreatmentGapQueue from '../components/care-team/EPTreatmentGapQueue';
import EPFollowUpQueue from '../components/care-team/EPFollowUpQueue';

// Import clinical intelligence components
import EPPhenotypeClassification from '../components/clinical/EPPhenotypeClassification';
import EPAnticoagulationContraindicationChecker from '../components/clinical/EPAnticoagulationContraindicationChecker';
import EPCHADSVAScCalculator from '../components/clinical/EPCHADSVAScCalculator';
import EPAdvancedDeviceTracker from '../components/clinical/EPAdvancedDeviceTracker';

type EPViewMode = 'dashboard' | 'clinicaltools';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: EPPhenotypeClassification },
 { id: 'risk-calc', label: 'CHA₂DS₂-VASc Calculator', component: EPCHADSVAScCalculator },
 { id: 'contraindication', label: 'Anticoagulation Checker', component: EPAnticoagulationContraindicationChecker },
 { id: 'devices', label: 'Device Tracker', component: EPAdvancedDeviceTracker },
  ];

  const ActiveTool = tools.find(t => t.id === activeToolTab)?.component;

  return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4 flex items-center gap-2">
 <Stethoscope className="w-6 h-6 text-porsche-600" />
 Clinical Intelligence Tools
 </h3>
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
 {ActiveTool && <ActiveTool patientData={DEMO_PATIENT_CONTEXT} />}
 </div>
  );
};

const EPCareTeamView: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('P001');
  const [viewMode, setViewMode] = useState<EPViewMode>('dashboard');
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);

  return (
 <div className="min-h-screen bg-gradient-to-br from-chrome-50 via-indigo-50/30 to-purple-50 p-6 relative overflow-hidden">
 {/* Web 3.0 Background Elements */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-chrome-100 via-transparent to-transparent" />
 <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-chrome-400 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Page Header */}
 <header className="metal-card bg-white border border-titanium-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chrome-400 to-purple-400 rounded-full blur-2xl" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold bg-gradient-to-r from-titanium-900 via-titanium-800 to-titanium-900 bg-clip-text text-transparent mb-2 font-sf">
 Care Team Command Center
 </h1>
 <p className="text-lg text-titanium-600 font-medium">
 Comprehensive EP patient management, rhythm monitoring, and care coordination
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="p-4 rounded-2xl bg-porsche-50 border-porsche-200 border shadow-lg">
 <Zap className="w-8 h-8 text-porsche-600" />
 </div>
 </div>
 </div>
 </header>

 {/* View Mode Toggle */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-4 shadow-xl">
 <div className="flex gap-3">
 <button
 onClick={() => setViewMode('dashboard')}
 className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
 viewMode === 'dashboard'
 ? 'bg-porsche-600 text-white shadow-lg'
 : 'bg-white text-titanium-600 hover:bg-white border border-titanium-200'
 }`}
 >
 <Activity className="w-5 h-5" />
 Care Team Dashboard
 </button>
 <button
 onClick={() => setViewMode('clinicaltools')}
 className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
 viewMode === 'clinicaltools'
 ? 'bg-porsche-600 text-white shadow-lg'
 : 'bg-white text-titanium-600 hover:bg-white border border-titanium-200'
 }`}
 >
 <Stethoscope className="w-5 h-5" />
 Clinical Intelligence
 </button>
 </div>
 </div>

 {viewMode === 'clinicaltools' ? (
 <ClinicalToolsPanel />
 ) : (
 <>
 {/* SLOT 1: Key Metrics Dashboard */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center gap-3 mb-4">
 <Users className="w-6 h-6 text-porsche-600" />
 <h3 className="text-lg font-semibold text-titanium-900">Active Patients</h3>
 </div>
 <div className="text-3xl font-bold text-titanium-900 mb-2">127</div>
 <div className="text-sm text-titanium-600">EP Care Team caseload</div>
 </div>

 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center gap-3 mb-4">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <h3 className="text-lg font-semibold text-titanium-900">Critical Alerts</h3>
 </div>
 <div className="text-3xl font-bold text-red-800 mb-2">8</div>
 <div className="text-sm text-titanium-600">Requiring immediate attention</div>
 </div>

 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center gap-3 mb-4">
 <Calendar className="w-6 h-6 text-green-600" />
 <h3 className="text-lg font-semibold text-titanium-900">Today's Follow-ups</h3>
 </div>
 <div className="text-3xl font-bold text-green-800 mb-2">15</div>
 <div className="text-sm text-titanium-600">Scheduled appointments</div>
 </div>

 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center gap-3 mb-4">
 <CheckSquare className="w-6 h-6 text-amber-600" />
 <h3 className="text-lg font-semibold text-titanium-900">Pending Actions</h3>
 </div>
 <div className="text-3xl font-bold text-amber-800 mb-2">23</div>
 <div className="text-sm text-titanium-600">Care team tasks</div>
 </div>
 </div>

 {/* SLOT 2: Priority Worklist and Action Queue */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <EPPriorityWorklist />
 <EPActionQueue />
 </div>

 {/* SLOT 3: Treatment Gaps and Follow-up Queue */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <EPTreatmentGapQueue />
 <EPFollowUpQueue />
 </div>

 {/* SLOT 4: Real-time Alerts Dashboard */}
 <div className="grid grid-cols-1 gap-6">
 <EPAlertDashboard />
 </div>

 {/* SLOT 5: Patient Timeline for Care Coordination */}
 <div className="grid grid-cols-1 gap-6">
 <EPPatientTimeline
 patientId={selectedPatientId}
 patientName="Smith, John"
 />
 </div>

 {/* Care Team Quick Actions */}
 <div className="metal-card p-6 bg-white border border-titanium-200">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Shield className="w-5 h-5 text-porsche-600" />
 Care Team Quick Actions
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <button onClick={() => { setQuickActionFeedback('consult'); setTimeout(() => setQuickActionFeedback(null), 2000); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-porsche-600 to-porsche-700 text-white rounded-lg hover:from-porsche-700 hover:to-porsche-800 transition-all duration-300 font-medium">
 <Zap className="w-4 h-4" />
 {quickActionFeedback === 'consult' ? '✓ Consult Submitted' : 'Emergency EP Consult'}
 </button>
 <button onClick={() => { setQuickActionFeedback('ablation'); setTimeout(() => setQuickActionFeedback(null), 2000); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium">
 <Calendar className="w-4 h-4" />
 {quickActionFeedback === 'ablation' ? '✓ Scheduling Initiated' : 'Schedule Ablation'}
 </button>
 <button onClick={() => { setViewMode('clinicaltools'); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium">
 <Activity className="w-4 h-4" />
 Device Interrogation
 </button>
 <button onClick={() => { setQuickActionFeedback('report'); setTimeout(() => setQuickActionFeedback(null), 2000); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-medium">
 <FileText className="w-4 h-4" />
 {quickActionFeedback === 'report' ? '✓ Report Generated' : 'Generate Report'}
 </button>
 </div>
 </div>

 {/* Care Team Communication Panel */}
 <div className="metal-card p-6 bg-white border border-titanium-200">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-porsche-600" />
 EP Care Team Communication
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-4 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-3 h-3 rounded-full bg-green-500"></div>
 <span className="font-medium text-chrome-900">Dr. Johnson - EP Attending</span>
 </div>
 <div className="text-sm text-chrome-700">Available for consultation</div>
 </div>
 <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
 <span className="font-medium text-amber-900">EP Lab Team</span>
 </div>
 <div className="text-sm text-amber-700">2 procedures in progress</div>
 </div>
 <div className="p-4 bg-green-50 rounded-lg border border-green-200">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-3 h-3 rounded-full bg-green-500"></div>
 <span className="font-medium text-green-900">Device Clinic</span>
 </div>
 <div className="text-sm text-green-700">Available for urgent checks</div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
  );
};

export default EPCareTeamView;
