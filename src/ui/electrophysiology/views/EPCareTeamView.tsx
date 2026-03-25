import React, { useState } from 'react';
import { DEMO_PATIENT_CONTEXT, DEMO_PATIENT_ROSTER } from '../../../types/shared';
import { Heart, Users, Target, Shield, FileText, Zap, Clock, Calendar, AlertTriangle, CheckSquare, TrendingDown, Activity, Stethoscope, Brain, UserCheck } from 'lucide-react';

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
import EPClinicalGapDetectionDashboard from '../components/clinical/EPClinicalGapDetectionDashboard';
import EPRealTimeHospitalAlerts from '../components/care-team/EPRealTimeHospitalAlerts';
import ORBITBleedingCalculator from '../../../components/riskCalculators/ORBITBleedingCalculator';

type EPViewMode = 'dashboard' | 'patients' | 'workflow' | 'safety' | 'hospital-alerts' | 'clinicaltools' | 'clinical-gaps' | 'team' | 'documentation';

// Clinical Intelligence sub-tab panel
const ClinicalToolsPanel: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState('phenotype');
  const [selectedPatientIdx, setSelectedPatientIdx] = useState(2); // Default to Martinez (EP patient)

  const selectedPatient = DEMO_PATIENT_ROSTER[selectedPatientIdx]?.context || DEMO_PATIENT_CONTEXT;

  const tools = [
 { id: 'phenotype', label: 'Phenotype Classification', component: EPPhenotypeClassification },
 { id: 'risk-calc', label: 'CHA₂DS₂-VASc Calculator', component: EPCHADSVAScCalculator },
 { id: 'contraindication', label: 'Anticoagulation Checker', component: EPAnticoagulationContraindicationChecker },
 { id: 'devices', label: 'Device Tracker', component: EPAdvancedDeviceTracker },
 { id: 'orbit-bleeding', label: 'ORBIT Bleeding Score', component: ORBITBleedingCalculator },
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

const EPCareTeamView: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('P001');
  const [activeTab, _setActiveTab] = useState<EPViewMode>('dashboard');
  const setActiveTab = (tab: EPViewMode) => {
    _setActiveTab(tab);
    const scrollContainer = document.querySelector('.overflow-y-auto.h-screen');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);

  const tabs = [
 { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'EP care team overview' },
 { id: 'patients', label: 'Patients', icon: Users, description: 'EP patient management' },
 { id: 'workflow', label: 'Workflow', icon: Target, description: 'EP workflow optimization' },
 { id: 'safety', label: 'Safety', icon: Shield, description: 'EP safety screening' },
 { id: 'hospital-alerts', label: 'Hospital Alerts', icon: Heart, description: 'Real-time EP hospital alerts' },
 { id: 'clinicaltools', label: 'Clinical Intelligence', icon: Stethoscope, description: 'Phenotype classification, risk calculators, and clinical decision support' },
 { id: 'clinical-gaps', label: 'Clinical Gaps', icon: AlertTriangle, description: 'EP clinical gap detection dashboard' },
 { id: 'team', label: 'Team', icon: UserCheck, description: 'EP team coordination' },
 { id: 'documentation', label: 'Documentation', icon: FileText, description: 'EP documentation' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'dashboard':
 return (
 <>
 {/* Key Metrics Dashboard */}
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

 {/* Priority Worklist and Action Queue */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <EPPriorityWorklist />
 <EPActionQueue />
 </div>

 {/* Treatment Gaps and Follow-up Queue */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <EPTreatmentGapQueue />
 <EPFollowUpQueue />
 </div>

 {/* Real-time Alerts Dashboard */}
 <div className="grid grid-cols-1 gap-6">
 <EPAlertDashboard />
 </div>

 {/* Patient Timeline for Care Coordination */}
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
 <button onClick={() => { setActiveTab('clinicaltools'); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium">
 <Activity className="w-4 h-4" />
 Device Interrogation
 </button>
 <button onClick={() => { setQuickActionFeedback('report'); setTimeout(() => setQuickActionFeedback(null), 2000); }} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-arterial-600 to-arterial-700 text-white rounded-lg hover:from-arterial-700 hover:to-arterial-800 transition-all duration-300 font-medium">
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
 );
 case 'patients':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-porsche-600" />
 EP Patient Panel
 </h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead><tr className="border-b border-titanium-200 text-left">
 <th className="pb-3 font-semibold text-titanium-700">Patient</th>
 <th className="pb-3 font-semibold text-titanium-700">MRN</th>
 <th className="pb-3 font-semibold text-titanium-700">Age</th>
 <th className="pb-3 font-semibold text-titanium-700">Primary Dx</th>
 <th className="pb-3 font-semibold text-titanium-700">Device</th>
 <th className="pb-3 font-semibold text-titanium-700">Risk</th>
 <th className="pb-3 font-semibold text-titanium-700">Next Visit</th>
 </tr></thead>
 <tbody className="divide-y divide-titanium-100">
 {[
 { name: 'Smith, John', mrn: 'MRN001', age: 67, dx: 'Persistent AF', device: 'None', risk: 'HIGH', next: 'Mar 28' },
 { name: 'Williams, Dorothy', mrn: 'MRN002', age: 74, dx: 'Paroxysmal AF', device: 'PPM', risk: 'MODERATE', next: 'Mar 29' },
 { name: 'Martinez, Carlos', mrn: 'MRN003', age: 58, dx: 'VT — NICM', device: 'ICD', risk: 'HIGH', next: 'Mar 27' },
 { name: 'Chen, Robert', mrn: 'MRN004', age: 71, dx: 'AFL + RBBB', device: 'None', risk: 'LOW', next: 'Apr 2' },
 { name: 'Johnson, Patricia', mrn: 'MRN005', age: 82, dx: 'SSS + AF', device: 'CRT-D', risk: 'HIGH', next: 'Mar 26' },
 { name: 'Thompson, James', mrn: 'MRN006', age: 45, dx: 'WPW', device: 'None', risk: 'MODERATE', next: 'Apr 5' },
 ].map((p) => (
 <tr key={p.mrn} className="hover:bg-chrome-50 cursor-pointer">
 <td className="py-3 font-medium text-titanium-900">{p.name}</td>
 <td className="py-3 text-titanium-600">{p.mrn}</td>
 <td className="py-3 text-titanium-600">{p.age}</td>
 <td className="py-3 text-titanium-800">{p.dx}</td>
 <td className="py-3 text-titanium-600">{p.device}</td>
 <td className="py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.risk === 'HIGH' ? 'bg-red-100 text-red-800' : p.risk === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{p.risk}</span></td>
 <td className="py-3 text-titanium-600">{p.next}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 case 'workflow':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-porsche-600" />
 EP Workflow Queue
 </h3>
 <div className="space-y-4">
 {[
 { patient: 'Smith, John', action: 'Schedule PVI ablation', priority: 'HIGH', due: 'Today', status: 'Pending auth' },
 { patient: 'Williams, Dorothy', action: 'Device interrogation overdue', priority: 'MODERATE', due: 'This week', status: 'Needs scheduling' },
 { patient: 'Martinez, Carlos', action: 'VT ablation follow-up echo', priority: 'HIGH', due: 'Today', status: 'Echo ordered' },
 { patient: 'Johnson, Patricia', action: 'CRT optimization — echo review', priority: 'MODERATE', due: 'Tomorrow', status: 'Awaiting results' },
 { patient: 'Thompson, James', action: 'WPW risk stratification EP study', priority: 'HIGH', due: 'This week', status: 'Pre-auth submitted' },
 { patient: 'Chen, Robert', action: 'Flutter ablation scheduling', priority: 'LOW', due: 'Next week', status: 'Patient contacted' },
 ].map((w) => (
 <div key={`${w.patient}-${w.action}`} className="flex items-center justify-between p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-1">
 <span className="font-semibold text-titanium-900 text-sm">{w.patient}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.priority === 'HIGH' ? 'bg-red-100 text-red-800' : w.priority === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{w.priority}</span>
 </div>
 <div className="text-sm text-titanium-700">{w.action}</div>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-500">{w.due}</div>
 <div className="text-xs text-titanium-400 mt-1">{w.status}</div>
 </div>
 </div>
 ))}
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
 EP Safety Screening
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="p-4 bg-red-50 rounded-xl border border-red-200">
 <div className="text-2xl font-bold text-red-800">3</div>
 <div className="text-sm text-red-600">Critical Alerts</div>
 </div>
 <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
 <div className="text-2xl font-bold text-amber-800">7</div>
 <div className="text-sm text-amber-600">Drug Interactions</div>
 </div>
 <div className="p-4 bg-green-50 rounded-xl border border-green-200">
 <div className="text-2xl font-bold text-green-800">89%</div>
 <div className="text-sm text-green-600">Monitoring Compliant</div>
 </div>
 </div>
 <div className="space-y-3">
 {[
 { patient: 'Williams, Dorothy', alert: 'QTc 512ms — 3 QT-prolonging medications', severity: 'CRITICAL', color: 'red' },
 { patient: 'Johnson, Patricia', alert: 'Device battery ERI — generator replacement needed', severity: 'CRITICAL', color: 'red' },
 { patient: 'Martinez, Carlos', alert: 'Amiodarone — thyroid function overdue (last: 8 months)', severity: 'HIGH', color: 'amber' },
 { patient: 'Chen, Robert', alert: 'Dofetilide — ECG monitoring overdue per REMS', severity: 'HIGH', color: 'amber' },
 { patient: 'Smith, John', alert: 'INR subtherapeutic — 1.4 (target 2.0-3.0)', severity: 'MODERATE', color: 'amber' },
 ].map((a) => (
 <div key={`${a.patient}-${a.alert}`} className={`p-4 rounded-xl border ${a.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
 <div className="flex items-center justify-between mb-1">
 <span className="font-semibold text-titanium-900 text-sm">{a.patient}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${a.color === 'red' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}>{a.severity}</span>
 </div>
 <div className={`text-sm ${a.color === 'red' ? 'text-red-800' : 'text-amber-800'}`}>{a.alert}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 case 'hospital-alerts':
 return <EPRealTimeHospitalAlerts />;
 case 'clinicaltools':
 return <ClinicalToolsPanel />;
 case 'clinical-gaps':
 return <EPClinicalGapDetectionDashboard />;
 case 'team':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <UserCheck className="w-5 h-5 text-porsche-600" />
 EP Care Team
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
 {[
 { name: 'Dr. Michael Chen', role: 'Attending EP', caseload: 34, status: 'On Service', sc: 'green' },
 { name: 'Dr. Sarah Park', role: 'Attending EP', caseload: 28, status: 'On Service', sc: 'green' },
 { name: 'Dr. James Rivera', role: 'EP Fellow (PGY-7)', caseload: 12, status: 'Procedure Lab', sc: 'amber' },
 { name: 'Rachel Torres, PA-C', role: 'APP — Device Clinic', caseload: 45, status: 'Clinic', sc: 'blue' },
 ].map((m) => (
 <div key={m.name} className="p-4 rounded-xl border border-titanium-200 bg-chrome-50">
 <div className="flex items-center justify-between mb-2">
 <span className="font-semibold text-titanium-900 text-sm">{m.name}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.sc === 'green' ? 'bg-green-100 text-green-800' : m.sc === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{m.status}</span>
 </div>
 <div className="text-xs text-titanium-500 mb-2">{m.role}</div>
 <div className="text-sm text-titanium-700">Active caseload: <span className="font-semibold">{m.caseload}</span></div>
 </div>
 ))}
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h4 className="font-semibold text-titanium-900 mb-4">On-Call Schedule</h4>
 <div className="space-y-3">
 {[
 { shift: 'Today (Day)', provider: 'Dr. Chen', time: '7:00 AM – 7:00 PM' },
 { shift: 'Today (Night)', provider: 'Dr. Park', time: '7:00 PM – 7:00 AM' },
 { shift: 'Tomorrow', provider: 'Dr. Rivera', time: '7:00 AM – 7:00 PM' },
 { shift: 'Weekend', provider: 'Dr. Chen', time: 'Sat 7 AM – Mon 7 AM' },
 ].map((s) => (
 <div key={s.shift} className="flex items-center justify-between p-3 bg-chrome-50 rounded-lg border border-chrome-200">
 <div><div className="font-medium text-titanium-900 text-sm">{s.shift}</div><div className="text-xs text-titanium-500">{s.time}</div></div>
 <span className="text-sm font-semibold text-titanium-800">{s.provider}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h4 className="font-semibold text-titanium-900 mb-4">Team Metrics This Month</h4>
 <div className="space-y-4">
 {[
 { metric: 'Ablations Performed', value: '47', trend: '+12%', up: true },
 { metric: 'Device Implants', value: '23', trend: '+8%', up: true },
 { metric: 'LAAC Procedures', value: '14', trend: '+22%', up: true },
 { metric: 'Avg Procedure Time', value: '142 min', trend: '-6%', up: false },
 { metric: 'Same-Day Discharge', value: '78%', trend: '+5%', up: true },
 ].map((m) => (
 <div key={m.metric} className="flex items-center justify-between">
 <span className="text-sm text-titanium-600">{m.metric}</span>
 <div className="flex items-center gap-2">
 <span className="font-semibold text-titanium-900">{m.value}</span>
 <span className={`text-xs font-medium ${m.up ? 'text-green-600' : 'text-blue-600'}`}>{m.trend}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
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
 { patient: 'Smith, John', type: 'AF Ablation — Post-Procedure', time: '1 hour ago' },
 { patient: 'Williams, Dorothy', type: 'Device Interrogation', time: '3 hours ago' },
 { patient: 'Martinez, Carlos', type: 'LAAC Pre-Procedure Eval', time: '5 hours ago' },
 { patient: 'Chen, Robert', type: 'EP Study Report', time: 'Yesterday' },
 ].map((note) => (
 <div key={`${note.patient}-${note.type}`} className="p-3 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="font-medium text-titanium-900 text-sm">{note.patient}</div>
 <div className="text-sm text-chrome-600">{note.type}</div>
 <div className="text-xs text-titanium-500">{note.time}</div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Documentation Templates</h4>
 <div className="space-y-2">
 {[
 { name: 'AF Ablation Report', desc: 'PVI, linear lesions, mapping data', bg: 'bg-green-50 border-green-200 hover:bg-green-100', text: 'text-green-900', sub: 'text-green-600' },
 { name: 'Device Implant Note', desc: 'ICD/PM/CRT implant procedure note', bg: 'bg-chrome-50 border-chrome-200 hover:bg-chrome-100', text: 'text-chrome-900', sub: 'text-chrome-600' },
 { name: 'EP Study Report', desc: 'Diagnostic EP study with findings', bg: 'bg-chrome-50 border-chrome-200 hover:bg-chrome-100', text: 'text-chrome-900', sub: 'text-chrome-600' },
 { name: 'LAAC Procedure Note', desc: 'Watchman implant documentation', bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100', text: 'text-amber-900', sub: 'text-amber-600' },
 { name: 'Device Check Summary', desc: 'Interrogation parameters and thresholds', bg: 'bg-chrome-50 border-chrome-200 hover:bg-chrome-100', text: 'text-chrome-900', sub: 'text-chrome-600' },
 ].map((t) => (
 <button key={t.name} className={`w-full text-left p-3 rounded-lg border transition-colors ${t.bg}`}>
 <div className={`font-medium text-sm ${t.text}`}>{t.name}</div>
 <div className={`text-xs ${t.sub}`}>{t.desc}</div>
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 default:
 return null;
 }
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation - Grid layout */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as EPViewMode)}
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
 <div className="absolute inset-0 bg-gradient-to-r from-porsche-400/20 to-porsche-500/20 rounded-xl opacity-50" />
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

export default EPCareTeamView;
