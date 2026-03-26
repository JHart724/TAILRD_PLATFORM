import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Target, Shield, Activity, MapPin, TrendingUp, FileText } from 'lucide-react';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';
import WIfIClassification from '../components/WIfIClassification';
import LimbSalvageScreening from '../components/LimbSalvageScreening';
import PADReportingSystem from '../components/PADReportingSystem';
import PVWoundCareNetworkVisualization from '../components/PVWoundCareNetworkVisualization';
import WIFIClassificationCalculator from '../../../components/riskCalculators/WIFIClassificationCalculator';
import { featureFlags } from '../../../config/featureFlags';
import PVClinicalGapDetectionDashboard from '../components/clinical/PVClinicalGapDetectionDashboard';
import InterventionContraindicationChecker from '../components/clinical/InterventionContraindicationChecker';
import PADRiskScoreCalculator from '../components/clinical/PADRiskScoreCalculator';

// Sample PAD patient data
const padPatients = [
  {
 id: 'PV001',
 name: 'Johnson, Robert',
 age: 68,
 mrn: 'MRN-78234',
 diagnosis: 'Critical Limb Ischemia',
 riskLevel: 'High',
 lastVisit: '2024-01-10',
 nextAppt: '2024-01-25',
 abi: 0.52,
 woundStage: 'Stage 3',
 status: 'Active'
  },
  {
 id: 'PV002', 
 name: 'Martinez, Elena',
 age: 72,
 mrn: 'MRN-78235',
 diagnosis: 'Peripheral Artery Disease',
 riskLevel: 'Moderate',
 lastVisit: '2024-01-08',
 nextAppt: '2024-01-30',
 abi: 0.68,
 woundStage: 'None',
 status: 'Active'
  },
  {
 id: 'PV003',
 name: 'Chen, David',
 age: 74,
 mrn: 'MRN-78236', 
 diagnosis: 'Diabetic Foot Ulcer',
 riskLevel: 'High',
 lastVisit: '2024-01-12',
 nextAppt: '2024-01-18',
 abi: 0.71,
 woundStage: 'Stage 2',
 status: 'Active'
  }
];

// Peripheral Vascular Dashboard Component
const PeripheralDashboard: React.FC = () => (
  <div className="space-y-6">
 {/* PAD Metrics Overview */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Activity className="w-8 h-8 text-medical-amber-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">247</div>
 <div className="text-sm text-titanium-600">Active PAD Patients</div>
 </div>
 </div>
 </div>
 
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Shield className="w-8 h-8 text-medical-red-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">38</div>
 <div className="text-sm text-titanium-600">CLI High Risk</div>
 </div>
 </div>
 </div>
 
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <TrendingUp className="w-8 h-8 text-medical-green-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">85%</div>
 <div className="text-sm text-titanium-600">Limb Salvage Rate</div>
 </div>
 </div>
 </div>
 
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Target className="w-8 h-8 text-porsche-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">92%</div>
 <div className="text-sm text-titanium-600">Intervention Success</div>
 </div>
 </div>
 </div>
 </div>

 {/* WIfI Classification Dashboard */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-medical-amber-600" />
 WIfI Classification & Risk Assessment
 </h3>
 <WIfIClassification />
 </div>

 {/* Network Visualization */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <MapPin className="w-5 h-5 text-medical-amber-600" />
 Wound Care Network
 </h3>
 <PVWoundCareNetworkVisualization />
 </div>
  </div>
);

// Peripheral Patients Component
const PeripheralPatients: React.FC = () => (
  <div className="space-y-6">
 {/* Patient Census */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-medical-amber-600" />
 PAD Patient Registry
 </h3>
 
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-titanium-200">
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Patient</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Diagnosis</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Risk Level</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">ABI</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Wound Stage</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Next Appointment</th>
 <th className="text-left py-3 px-4 font-semibold text-titanium-700">Status</th>
 </tr>
 </thead>
 <tbody>
 {padPatients.map((patient) => (
 <tr key={patient.id} className="border-b border-titanium-100 hover:bg-titanium-50">
 <td className="py-3 px-4">
 <div>
 <div className="font-medium text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">{patient.mrn}</div>
 </div>
 </td>
 <td className="py-3 px-4 text-titanium-700">{patient.diagnosis}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.riskLevel === 'High' ? 'bg-medical-red-100 text-medical-red-700' :
 patient.riskLevel === 'Moderate' ? 'bg-medical-amber-100 text-medical-amber-700' :
 'bg-medical-green-100 text-medical-green-700'
 }`}>
 {patient.riskLevel}
 </span>
 </td>
 <td className="py-3 px-4 text-titanium-700">{patient.abi}</td>
 <td className="py-3 px-4 text-titanium-700">{patient.woundStage}</td>
 <td className="py-3 px-4 text-titanium-700">{patient.nextAppt}</td>
 <td className="py-3 px-4">
 <span className="px-2 py-1 bg-medical-green-100 text-medical-green-700 rounded-full text-xs font-medium">
 {patient.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
  </div>
);

// Peripheral Workflow Component  
const PeripheralWorkflow: React.FC = () => (
  <div className="space-y-6">
 {/* PAD Reporting System */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-medical-amber-600" />
 PAD Optimization & Reporting
 </h3>
 <PADReportingSystem />
 </div>
  </div>
);

// Peripheral Safety Component
const PeripheralSafety: React.FC = () => (
  <div className="space-y-6">
 {/* Limb Salvage Screening */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Shield className="w-5 h-5 text-medical-amber-600" />
 Limb Salvage Screening & Protocols
 </h3>
 <LimbSalvageScreening />
 </div>

 {/* PAD Risk Score Calculator */}
 <PADRiskScoreCalculator />

 {/* Intervention Contraindication Checker */}
 <InterventionContraindicationChecker />
  </div>
);

// Peripheral Clinical Collaboration Component
const PeripheralClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
 {/* Clinical Collaboration Dashboard */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-medical-amber-600" />
 Peripheral Vascular Clinical Collaboration & Consultation
 </h3>
 
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Clinical Consultation Teams */}
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Multidisciplinary Vascular Team</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {[
 { name: 'Dr. Sarah Chen', role: 'Vascular Surgery', specialty: 'PAD Specialist', expertise: 'Surgical Assessment', consultations: 234 },
 { name: 'Dr. Michael Rodriguez', role: 'Interventional Radiology', specialty: 'Endovascular Therapy', expertise: 'Minimally Invasive Procedures', consultations: 189 },
 { name: 'Dr. Lisa Wang', role: 'Vascular Surgery', specialty: 'Limb Salvage', expertise: 'Complex Revascularization', consultations: 156 },
 { name: 'Dr. James Park', role: 'Interventional Cardiology', specialty: 'Peripheral Intervention', expertise: 'Critical Limb Ischemia', consultations: 198 },
 { name: 'Dr. Maria Garcia', role: 'Vascular Medicine', specialty: 'Medical Management', expertise: 'Risk Factor Modification', consultations: 145 },
 { name: 'Jennifer Lee, RN', role: 'Wound Care Specialist', specialty: 'Diabetic Foot Care', expertise: 'Wound Assessment', consultations: 312 },
 { name: 'David Kim, RN', role: 'Vascular Coordinator', specialty: 'Care Pathways', expertise: 'Patient Navigation', consultations: 278 },
 { name: 'Sarah Johnson, NP', role: 'Vascular NP', specialty: 'Clinic Management', expertise: 'Clinical Follow-up', consultations: 203 }
 ].map((member, index) => (
 <div key={member.name} className="p-4 bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="mb-2">
 <div className="font-medium text-titanium-900">{member.name}</div>
 </div>
 <div className="text-sm text-titanium-700">{member.role}</div>
 <div className="text-xs text-titanium-600">{member.specialty}</div>
 <div className="text-xs text-amber-600 mt-1 font-medium">{member.expertise}</div>
 <div className="mt-2">
 <span className="text-xs text-titanium-500">{member.consultations} clinical consultations YTD</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 
 {/* Clinical Decision Pathways */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-amber-600" />
 Evidence-Based Clinical Pathways
 </h4>
 <div className="space-y-3">
 {[
 { pathway: 'PAD Risk Assessment Protocol', indication: 'Peripheral Artery Disease', evidence: 'AHA/ACC Guidelines', consultation: 'Vascular Team Review' },
 { pathway: 'Critical Limb Ischemia Pathway', indication: 'CLI/CLTI', evidence: 'SVS Guidelines', consultation: 'Urgent Multidisciplinary Review' },
 { pathway: 'Diabetic Foot Care Protocol', indication: 'Diabetic Foot Ulcer', evidence: 'IWGDF Guidelines', consultation: 'Wound Care Consultation' },
 { pathway: 'Revascularization Decision Tree', indication: 'Complex PAD', evidence: 'Expert Consensus', consultation: 'Heart Team Assessment' }
 ].map((pathway, index) => (
 <div key={pathway.pathway} className={`flex items-center justify-between p-4 rounded-lg border ${
 pathway.indication === 'Peripheral Artery Disease' ? 'bg-chrome-50 border-chrome-200' :
 pathway.indication === 'CLI/CLTI' ? 'bg-red-50 border-red-200' :
 pathway.indication === 'Diabetic Foot Ulcer' ? 'bg-amber-50 border-amber-200' :
 'bg-arterial-50 border-arterial-200'
 }`}>
 <div>
 <div className={`font-medium ${
 pathway.indication === 'Peripheral Artery Disease' ? 'text-chrome-900' :
 pathway.indication === 'CLI/CLTI' ? 'text-red-900' :
 pathway.indication === 'Diabetic Foot Ulcer' ? 'text-amber-900' :
 'text-arterial-900'
 }`}>
 {pathway.pathway}
 </div>
 <div className="text-sm text-titanium-600">
 {pathway.indication} • {pathway.evidence}
 </div>
 </div>
 <div className={`text-xs px-2 py-1 rounded-full ${
 pathway.indication === 'Peripheral Artery Disease' ? 'bg-chrome-100 text-chrome-700' :
 pathway.indication === 'CLI/CLTI' ? 'bg-red-100 text-red-700' :
 pathway.indication === 'Diabetic Foot Ulcer' ? 'bg-amber-100 text-amber-700' :
 'bg-arterial-100 text-arterial-700'
 }`}>
 {pathway.consultation}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 
 {/* Clinical Quality Outcomes */}
 <div className="space-y-4">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Clinical Quality Outcomes</h4>
 <div className="space-y-4">
 <div className="text-center p-4 bg-green-50 rounded-lg">
 <div className="text-2xl font-bold text-green-600">85%</div>
 <div className="text-xs text-green-700">Limb Salvage Rate</div>
 </div>
 <div className="text-center p-4 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-chrome-600">92%</div>
 <div className="text-xs text-chrome-700">Intervention Success</div>
 </div>
 <div className="text-center p-4 bg-arterial-50 rounded-lg">
 <div className="text-2xl font-bold text-arterial-600">94%</div>
 <div className="text-xs text-arterial-700">Clinical Consensus Rate</div>
 </div>
 <div className="text-center p-4 bg-amber-50 rounded-lg">
 <div className="text-2xl font-bold text-amber-600">96%</div>
 <div className="text-xs text-amber-700">Guideline Adherence</div>
 </div>
 </div>
 </div>
 
 {/* Active Clinical Consultations */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Active Clinical Consultations</h4>
 <div className="space-y-3">
 {[
 { consultation: 'PAD Risk Stratification', patient: 'PV001', status: 'ABI Assessment', urgency: 'routine' },
 { consultation: 'CLI Limb Salvage', patient: 'PV003', status: 'Revascularization Planning', urgency: 'urgent' },
 { consultation: 'Wound Care Management', patient: 'PV002', status: 'Multidisciplinary Assessment', urgency: 'priority' },
 { consultation: 'Intervention Planning', patient: 'PV004', status: 'WIfI Classification', urgency: 'routine' }
 ].map((consult, index) => (
 <div key={consult.consultation} className={`p-3 rounded-lg border ${
 consult.urgency === 'urgent' ? 'bg-red-50 border-red-200' :
 consult.urgency === 'priority' ? 'bg-amber-50 border-amber-200' :
 'bg-chrome-50 border-chrome-200'
 }`}>
 <div className={`font-medium ${
 consult.urgency === 'urgent' ? 'text-red-900' :
 consult.urgency === 'priority' ? 'text-amber-900' :
 'text-chrome-900'
 }`}>
 {consult.consultation}
 </div>
 <div className="text-sm text-titanium-700">{consult.patient}: {consult.status}</div>
 </div>
 ))}
 </div>
 </div>
 
 {/* Clinical Decision Support Tools */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Clinical Decision Support</h4>
 <div className="space-y-2">
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 {};
 }}
 >
 <div className="font-medium text-chrome-900">WIfI Classification</div>
 <div className="text-xs text-chrome-600">Wound, Ischemia, foot Infection</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 {};
 }}
 >
 <div className="font-medium text-red-900">CLI Assessment Tool</div>
 <div className="text-xs text-red-600">Critical limb ischemia evaluation</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 {};
 }}
 >
 <div className="font-medium text-amber-900">PAD Guidelines</div>
 <div className="text-xs text-amber-600">Evidence-based recommendations</div>
 </button>
 <button className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors">
 <div className="font-medium text-arterial-900">Multidisciplinary Consultation</div>
 <div className="text-xs text-arterial-600">Team collaboration platform</div>
 </button>
 </div>
 </div>
 
 {/* WIfI Classification Calculator */}
 {featureFlags.riskCalculators.wifiClassification && (
 <WIFIClassificationCalculator 
 woundGrade={2}
 ischemiaGrade={3}
 footInfectionGrade={1}
 />
 )}
 </div>
 </div>
 </div>
  </div>
);

// Peripheral Documentation Component
const PeripheralDocumentation: React.FC = () => (
  <div className="space-y-6">
 {/* Documentation Alerts & Templates */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5 text-medical-amber-600" />
 PAD Documentation Support
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Documentation Alerts */}
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Documentation Alerts</h4>
 <div className="space-y-3">
 <div className="bg-medical-red-50 border border-medical-red-200 rounded-lg p-3">
 <div className="flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-medical-red-600" />
 <span className="font-medium text-medical-red-700">Missing ABI Documentation</span>
 </div>
 <p className="text-sm text-medical-red-600 mt-1">Patient Johnson, R. - ABI results not documented</p>
 </div>
 
 <div className="bg-medical-amber-50 border border-medical-amber-200 rounded-lg p-3">
 <div className="flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
 <span className="font-medium text-medical-amber-700">Wound Assessment Due</span>
 </div>
 <p className="text-sm text-medical-amber-600 mt-1">Patient Chen, D. - Weekly wound assessment required</p>
 </div>

 <div className="bg-porsche-50 border border-porsche-200 rounded-lg p-3">
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-porsche-600" />
 <span className="font-medium text-porsche-700">Follow-up Required</span>
 </div>
 <p className="text-sm text-porsche-600 mt-1">Patient Martinez, E. - 30-day post-procedure follow-up</p>
 </div>
 </div>
 </div>

 {/* Documentation Templates */}
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Quick Documentation Templates</h4>
 <div className="space-y-2">
 <button className="w-full text-left bg-white border border-titanium-200 rounded-lg p-3 hover:bg-white transition-colors">
 <div className="font-medium text-titanium-900">PAD Initial Assessment</div>
 <div className="text-sm text-titanium-600">Complete peripheral vascular evaluation template</div>
 </button>
 
 <button className="w-full text-left bg-white border border-titanium-200 rounded-lg p-3 hover:bg-white transition-colors">
 <div className="font-medium text-titanium-900">ABI Documentation</div>
 <div className="text-sm text-titanium-600">Ankle-brachial index measurement template</div>
 </button>
 
 <button className="w-full text-left bg-white border border-titanium-200 rounded-lg p-3 hover:bg-white transition-colors">
 <div className="font-medium text-titanium-900">Wound Care Assessment</div>
 <div className="text-sm text-titanium-600">Comprehensive wound evaluation template</div>
 </button>
 
 <button className="w-full text-left bg-white border border-titanium-200 rounded-lg p-3 hover:bg-white transition-colors">
 <div className="font-medium text-titanium-900">Limb Salvage Protocol</div>
 <div className="text-sm text-titanium-600">Critical limb ischemia management template</div>
 </button>
 </div>
 </div>
 </div>
 </div>
  </div>
);

// PV Clinical Gaps wrapper
const PVClinicalGaps: React.FC = () => (
  <PVClinicalGapDetectionDashboard />
);

// Peripheral Vascular Care Team Tab Configuration
const peripheralTabs: StandardTabConfig[] = [
  {
 id: 'dashboard',
 label: 'Dashboard',
 icon: Users,
 description: 'PAD and CLI overview'
  },
  {
 id: 'patients',
 label: 'Patients',
 icon: Users,
 description: 'Peripheral vascular patients'
  },
  {
 id: 'clinical-gaps',
 label: 'Clinical Gaps',
 icon: AlertTriangle,
 description: 'Polyvascular dual pathway therapy gap'
  },
  {
 id: 'workflow',
 label: 'Workflow',
 icon: Target,
 description: 'PAD workflow optimization'
  },
  {
 id: 'safety',
 label: 'Safety',
 icon: Shield,
 description: 'Safety screening and alerts'
  },
  {
 id: 'team',
 label: 'Team',
 icon: Users,
 description: 'Clinical consultation and multidisciplinary care'
  },
  {
 id: 'documentation',
 label: 'Documentation',
 icon: AlertTriangle,
 description: 'Peripheral documentation'
  }
];

// Peripheral Vascular Care Team Configuration
export const peripheralCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Peripheral Vascular',
  moduleDescription: 'Comprehensive peripheral vascular care, PAD optimization, and critical limb ischemia management',
  moduleIcon: Target,
  primaryColor: 'medical-amber',
  tabs: peripheralTabs,
  tabContent: {
 dashboard: PeripheralDashboard,
 patients: PeripheralPatients,
 workflow: PeripheralWorkflow,
 safety: PeripheralSafety,
 team: PeripheralClinicalCollaboration,
 documentation: PeripheralDocumentation,
 'clinical-gaps': PVClinicalGaps
  }
};