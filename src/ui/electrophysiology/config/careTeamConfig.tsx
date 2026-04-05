import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Zap, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp, Timer, Heart } from 'lucide-react';
import { toast } from '../../../components/shared/Toast';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';
import { apiService } from '../../../services/apiService';
import CRTICDEligibilityCalculator from '../../../components/riskCalculators/CRTICDEligibilityCalculator';
import { featureFlags } from '../../../config/featureFlags';
import EPClinicalGapDetectionDashboard from '../components/clinical/EPClinicalGapDetectionDashboard';

// Import Electrophysiology specific components
import PatientDetailPanel from '../components/PatientDetailPanel';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import EPClinicalDecisionSupport from '../components/EPClinicalDecisionSupport';
import EPROICalculator from '../components/EPROICalculator';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';
import EPAlertDashboard from '../components/care-team/EPAlertDashboard';
import EPRealTimeHospitalAlerts from '../components/care-team/EPRealTimeHospitalAlerts';
import EPAnticoagulationContraindicationChecker from '../components/clinical/EPAnticoagulationContraindicationChecker';
import EPRiskStratification from '../components/executive/EPRiskStratification';

// EP Dashboard Component
const EPDashboard: React.FC = () => (
  <div className="space-y-6">
 {/* EP Metrics Overview */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Zap className="w-8 h-8 text-[#2C4A60]" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">142</div>
 <div className="text-sm text-titanium-600">EP Procedures MTD</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Heart className="w-8 h-8 text-[#2C4A60]" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">89</div>
 <div className="text-sm text-titanium-600">LAAC Procedures</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Activity className="w-8 h-8 text-chrome-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">96.4%</div>
 <div className="text-sm text-titanium-600">Ablation Success Rate</div>
 </div>
 </div>
 </div>
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center gap-3">
 <Target className="w-8 h-8 text-arterial-600" />
 <div>
 <div className="text-2xl font-bold text-titanium-900">92.8%</div>
 <div className="text-sm text-titanium-600">Anticoag Compliance</div>
 </div>
 </div>
 </div>
 </div>
 
 {/* LAAC Risk Dashboard */}
 <LAACRiskDashboard />

 {/* EP Device Network */}
 <EPDeviceNetworkVisualization />

 {/* EP Alert Dashboard */}
 <EPAlertDashboard />

 {/* EP Real-Time Hospital Alerts */}
 <EPRealTimeHospitalAlerts />
  </div>
);

// EP Patients Component - Updated
const EPPatients: React.FC = () => (
  <div className="space-y-6">
 {/* Patient Registry Table */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Users className="w-5 h-5 text-[#2C4A60]" />
 Electrophysiology Patient Registry
 </h3>
 <div className="flex items-center gap-3">
 <button 
 className="px-4 py-2 bg-[#F0F7F4] text-[#2D6147] rounded-lg hover:bg-[#C8D4DC] transition-colors text-sm"
 onClick={() => {
 toast.info('Export Registry', 'Secure EP registry export with HIPAA-compliant data handling will be available in the next release.');
 }}
 >
 <Download className="w-4 h-4 mr-2 inline" />
 Export Registry
 </button>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-titanium-200">
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Patient ID</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Name</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Rhythm</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Procedure</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">CHA₂DS₂-VASc</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Anticoagulation</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Status</th>
 <th className="text-left py-3 px-4 font-medium text-titanium-700">Provider</th>
 </tr>
 </thead>
 <tbody>
 {[
 { id: 'EP001', name: 'Robert Martinez', rhythm: 'AFib', procedure: 'Ablation', chads: '3', anticoag: 'Apixaban', status: 'Scheduled', provider: 'Dr. Johnson' },
 { id: 'EP002', name: 'Linda Chen', rhythm: 'VTach', procedure: 'VT Ablation', chads: '2', anticoag: 'Warfarin', status: 'Complete', provider: 'Dr. Williams' },
 { id: 'EP003', name: 'Michael Davis', rhythm: 'AFib', procedure: 'LAAC', chads: '5', anticoag: 'Contraindicated', status: 'Planning', provider: 'Dr. Rodriguez' },
 { id: 'EP004', name: 'Sarah Thompson', rhythm: 'SVT', procedure: 'AVNRT Ablation', chads: '1', anticoag: 'None', status: 'Recovery', provider: 'Dr. Kim' },
 { id: 'EP005', name: 'James Wilson', rhythm: 'AFib', procedure: 'PVI', chads: '4', anticoag: 'Rivaroxaban', status: 'Follow-up', provider: 'Dr. Park' }
 ].map((patient, index) => (
 <tr key={patient.id} className="border-b border-titanium-100 hover:bg-titanium-50">
 <td className="py-3 px-4 font-mono text-titanium-900">{patient.id}</td>
 <td className="py-3 px-4 text-titanium-900">{patient.name}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.rhythm === 'AFib' ? 'bg-red-100 text-red-700' :
 patient.rhythm === 'VTach' ? 'bg-[#FAF6E8] text-[#8B6914]' :
 'bg-chrome-100 text-chrome-700'
 }`}>
 {patient.rhythm}
 </span>
 </td>
 <td className="py-3 px-4 text-titanium-700">{patient.procedure}</td>
 <td className="py-3 px-4 font-mono text-center">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 parseInt(patient.chads) >= 4 ? 'bg-red-100 text-red-700' :
 parseInt(patient.chads) >= 2 ? 'bg-[#FAF6E8] text-[#8B6914]' :
 'bg-[#F0F7F4] text-[#2D6147]'
 }`}>
 {patient.chads}
 </span>
 </td>
 <td className="py-3 px-4 text-titanium-700">{patient.anticoag}</td>
 <td className="py-3 px-4">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.status === 'Complete' ? 'bg-[#F0F7F4] text-[#2D6147]' :
 patient.status === 'Scheduled' ? 'bg-chrome-100 text-chrome-700' :
 patient.status === 'Planning' ? 'bg-arterial-100 text-arterial-700' :
 patient.status === 'Recovery' ? 'bg-[#FAF6E8] text-[#8B6914]' :
 'bg-gray-100 text-gray-700'
 }`}>
 {patient.status}
 </span>
 </td>
 <td className="py-3 px-4 text-titanium-700">{patient.provider}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 
 {/* Sample Patient Detail */}
 <PatientDetailPanel 
 patient={{
 id: 'ep-001',
 name: 'Sample EP Patient',
 mrn: 'EP123456',
 age: 65,
 gender: 'M' as const,
 provider: 'Dr. Smith',
 riskLevel: 'medium' as const,
 alerts: ['AFib monitoring needed'],
 priority: 'high' as const,
 rhythm: 'AFib',
 lastEP: '2024-09-15',
 nextAppt: '2024-12-15',
 actionItems: [
 { category: 'Follow-up' as const, description: 'Monitor rhythm', dueDate: '2024-11-10', urgent: false },
 { category: 'Anticoagulation' as const, description: 'Anticoagulation review', dueDate: '2024-11-15', urgent: true }
 ]
 }}
 onClose={() => {}}
 />
  </div>
);

// EP Workflow Component  
const EPWorkflow: React.FC = () => (
  <div className="space-y-6">
 {/* EP Clinical Decision Support */}
 <EPClinicalDecisionSupport />
 
 {/* EP ROI Calculator */}
 <EPROICalculator />
 
 {/* EP Automated Clinical Support */}
 <EPAutomatedClinicalSupport />
  </div>
);

// EP Safety Component
const EPSafety: React.FC = () => (
  <div className="space-y-6">
 {/* Anticoagulation Safety Checker */}
 <AnticoagulationSafetyChecker />

 {/* EP Anticoagulation Contraindication Checker */}
 <EPAnticoagulationContraindicationChecker />
  </div>
);

// EP Clinical Collaboration Component
const EPClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
 {/* EP Risk Stratification */}
 <EPRiskStratification />

 {/* Clinical Collaboration & Consultation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-[#2C4A60]" />
 Clinical Collaboration & Multidisciplinary Consultation
 </h3>
 
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Clinical Team Collaboration */}
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Multidisciplinary Clinical Team</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {[
 { name: 'Dr. Sarah Johnson', role: 'Electrophysiologist', specialty: 'AFib Clinical Lead', expertise: 'Arrhythmia Assessment', consultations: 156 },
 { name: 'Dr. Michael Williams', role: 'Electrophysiologist', specialty: 'VT/VF Specialist', expertise: 'Risk Stratification', consultations: 134 },
 { name: 'Dr. Jennifer Rodriguez', role: 'Electrophysiologist', specialty: 'LAAC Clinical Lead', expertise: 'Stroke Prevention', consultations: 89 },
 { name: 'Dr. Robert Kim', role: 'Cardiac Anesthesia', specialty: 'Perioperative Care', expertise: 'Risk Assessment', consultations: 198 },
 { name: 'Dr. Lisa Park', role: 'Cardiothoracic Surgery', specialty: 'Surgical Consultation', expertise: 'Complex Cases', consultations: 45 },
 { name: 'Maria Santos, RN', role: 'Clinical Coordinator', specialty: 'Patient Pathways', expertise: 'Care Coordination', consultations: 267 },
 { name: 'David Chen, CVT', role: 'Clinical Specialist', specialty: 'Device Management', expertise: 'Technical Assessment', consultations: 198 },
 { name: 'Amanda Miller, NP', role: 'EP Nurse Practitioner', specialty: 'Device Follow-up', expertise: 'Clinical Monitoring', consultations: 145 }
 ].map((member, index) => (
 <div key={member.name} className="p-4 bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="mb-2">
 <div className="font-medium text-titanium-900">{member.name}</div>
 </div>
 <div className="text-sm text-titanium-700">{member.role}</div>
 <div className="text-xs text-titanium-600">{member.specialty}</div>
 <div className="text-xs text-[#2C4A60] mt-1 font-medium">{member.expertise}</div>
 <div className="mt-2">
 <span className="text-xs text-titanium-500">{member.consultations} clinical consultations YTD</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 
 {/* Clinical Decision Support Pathways */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Zap className="w-5 h-5 text-[#2C4A60]" />
 Evidence-Based Clinical Pathways
 </h4>
 <div className="space-y-3">
 {[
 { pathway: 'AFib Management Protocol', indication: 'Atrial Fibrillation', evidence: 'AHA/ACC Guidelines', consultation: 'Stroke Risk Assessment' },
 { pathway: 'LAAC Evaluation Pathway', indication: 'Anticoagulation Contraindication', evidence: 'Expert Consensus', consultation: 'Heart Team Required' },
 { pathway: 'VT Ablation Assessment', indication: 'Ventricular Tachycardia', evidence: 'HRS Guidelines', consultation: 'Multidisciplinary Review' },
 { pathway: 'Device Therapy Protocol', indication: 'Heart Failure with Arrhythmia', evidence: 'Clinical Evidence', consultation: 'Device Selection Committee' }
 ].map((pathway, index) => (
 <div key={pathway.pathway} className={`flex items-center justify-between p-4 rounded-lg border ${
 pathway.indication === 'Atrial Fibrillation' ? 'bg-red-50 border-red-200' :
 pathway.indication === 'Anticoagulation Contraindication' ? 'bg-[#F0F5FA] border-[#C8D4DC]' :
 pathway.indication === 'Ventricular Tachycardia' ? 'bg-arterial-50 border-arterial-200' :
 'bg-chrome-50 border-chrome-200'
 }`}>
 <div>
 <div className={`font-medium ${
 pathway.indication === 'Atrial Fibrillation' ? 'text-red-900' :
 pathway.indication === 'Anticoagulation Contraindication' ? 'text-[#6B7280]' :
 pathway.indication === 'Ventricular Tachycardia' ? 'text-arterial-900' :
 'text-chrome-900'
 }`}>
 {pathway.pathway}
 </div>
 <div className="text-sm text-titanium-600">
 {pathway.indication} • {pathway.evidence}
 </div>
 </div>
 <div className={`text-xs px-2 py-1 rounded-full ${
 pathway.indication === 'Atrial Fibrillation' ? 'bg-red-100 text-red-700' :
 pathway.indication === 'Anticoagulation Contraindication' ? 'bg-[#FAF6E8] text-[#8B6914]' :
 pathway.indication === 'Ventricular Tachycardia' ? 'bg-arterial-100 text-arterial-700' :
 'bg-chrome-100 text-chrome-700'
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
 <div className="text-center p-4 bg-[#C8D4DC] rounded-lg">
 <div className="text-2xl font-bold text-[#2C4A60]">96.4%</div>
 <div className="text-xs text-[#2C4A60]">Clinical Success Rate</div>
 </div>
 <div className="text-center p-4 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-chrome-600">94%</div>
 <div className="text-xs text-chrome-700">Guideline Adherence</div>
 </div>
 <div className="text-center p-4 bg-arterial-50 rounded-lg">
 <div className="text-2xl font-bold text-arterial-600">92.8%</div>
 <div className="text-xs text-arterial-700">Stroke Prevention Rate</div>
 </div>
 <div className="text-center p-4 bg-[#F0F5FA] rounded-lg">
 <div className="text-2xl font-bold text-[#2C4A60]">98%</div>
 <div className="text-xs text-[#2C4A60]">Multidisciplinary Consensus</div>
 </div>
 </div>
 </div>
 
 {/* Active Clinical Consultations */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Active Clinical Consultations</h4>
 <div className="space-y-3">
 {[
 { consultation: 'AFib Risk Assessment', patient: 'EP001', status: 'CHA₂DS₂-VASc Evaluation', urgency: 'routine' },
 { consultation: 'LAAC Candidacy Review', patient: 'EP003', status: 'Bleeding Risk Analysis', urgency: 'priority' },
 { consultation: 'VT Ablation Planning', patient: 'EP004', status: 'Heart Team Consultation', urgency: 'urgent' },
 { consultation: 'Device Optimization', patient: 'EP005', status: 'Clinical Parameter Review', urgency: 'routine' }
 ].map((consult, index) => (
 <div key={consult.consultation} className={`p-3 rounded-lg border ${
 consult.urgency === 'urgent' ? 'bg-red-50 border-red-200' :
 consult.urgency === 'priority' ? 'bg-[#F0F5FA] border-[#C8D4DC]' :
 'bg-chrome-50 border-chrome-200'
 }`}>
 <div className={`font-medium ${
 consult.urgency === 'urgent' ? 'text-red-900' :
 consult.urgency === 'priority' ? 'text-[#6B7280]' :
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
 className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 const response = await apiService.getAutomatedCHA2DS2VASc('HF001');
 if (response.success && response.data) {
 const { score, riskLevel, annualStrokeRisk, recommendation, components } = response.data as any;
 {};
 }
 } catch (error) {
 if (process.env.NODE_ENV === 'development') { console.error('CHA₂DS₂-VASc Calculator error:', error); }
 {};
 }
 }}
 >
 <div className="font-medium text-red-900">CHA₂DS₂-VASc Calculator</div>
 <div className="text-xs text-red-600">Stroke risk assessment tool</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-100 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 const response = await apiService.getAutomatedHASBLED('HF001');
 if (response.success && response.data) {
 const { score, riskLevel, annualBleedingRisk, recommendation, components } = response.data as any;
 {};
 }
 } catch (error) {
 if (process.env.NODE_ENV === 'development') { console.error('HAS-BLED Calculator error:', error); }
 {};
 }
 }}
 >
 <div className="font-medium text-chrome-900">HAS-BLED Score</div>
 <div className="text-xs text-chrome-600">Bleeding risk evaluation</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-[#C8D4DC] hover:bg-[#C8D4DC] rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const patientData = {
 id: 'EP001',
 age: 74,
 sex: 'F',
 hasCongestiveHF: true,
 hasHypertension: true,
 hasDiabetes: false,
 hasStrokeHistory: false,
 hasVascularDisease: true,
 hasRenalDisease: false,
 hasLiverDisease: false,
 hasBleeding: false,
 hasLabilINR: false,
 takingDrugs: true,
 hasAlcohol: false,
 creatinine: 1.2,
 weight: 68
 };
 
 const response = await apiService.getAnticoagulationDecision(patientData);
 
 if (response.success) {
 const decision = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-[#2C4A60]">Clinical Guidelines</div>
 <div className="text-xs text-[#2C4A60]">Evidence-based recommendations</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const patientData = {
 id: 'EP002',
 age: 65,
 arrhythmiaType: 'persistent_afib',
 hasStructuralHeart: true,
 leftAtrialSize: 48,
 ef: 55,
 previousAblations: 0,
 hasObesity: false,
 hasSleepApnea: true,
 hasHypertension: true
 };
 
 const response = await apiService.predictAblationSuccess(patientData);
 
 if (response.success) {
 const prediction = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-arterial-900">Multidisciplinary Consultation</div>
 <div className="text-xs text-arterial-600">Team collaboration platform</div>
 </button>
 </div>
 </div>
 
 {/* CRT/ICD Eligibility Calculator */}
 {featureFlags.riskCalculators.crtIcdEligibility && (
 <CRTICDEligibilityCalculator 
 ejectionFraction={32}
 nyhaClass="II"
 qrsDuration={145}
 qrsMorphology="LBBB"
 optimalMedicalTherapy={true}
 lifeExpectancy=">1 year"
 priorSCD={true}
 ischemicCardiomyopathy={false}
 atriallFibrillation={true}
 kidneyFunction="Normal"
 />
 )}
 </div>
 </div>
 </div>
  </div>
);

// EP Documentation Component
const EPDocumentation: React.FC = () => (
  <div className="space-y-6">
 {/* EP Documentation & Registry */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5 text-[#2C4A60]" />
 EP Documentation & Quality Registry
 </h3>
 
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Documentation Alerts */}
 <div className="space-y-4">
 <div className="bg-gradient-to-r from-slate-50 to-slate-50 p-6 rounded-xl border border-[#C8D4DC]">
 <h4 className="font-semibold text-[#6B7280] mb-4 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
 Documentation Alerts & Registry
 </h4>
 <div className="space-y-3">
 <div className="bg-white p-4 rounded-lg border border-[#C8D4DC]">
 <div className="flex items-center justify-between mb-2">
 <span className="font-medium text-[#6B7280]">LAAC Registry Due</span>
 <span className="text-xs bg-[#FAF6E8] text-[#8B6914] px-2 py-1 rounded-full">DUE TODAY</span>
 </div>
 <div className="text-sm text-[#6B7280]">2 LAAC procedures require registry data entry</div>
 <div className="text-xs text-[#6B7280] mt-1">Required within 24h of procedure</div>
 </div>
 
 <div className="bg-white p-4 rounded-lg border border-[#C8D4DC]">
 <div className="flex items-center justify-between mb-2">
 <span className="font-medium text-[#6B7280]">Ablation Reports Pending</span>
 <span className="text-xs bg-[#FAF6E8] text-[#8B6914] px-2 py-1 rounded-full">PENDING</span>
 </div>
 <div className="text-sm text-[#6B7280]">3 ablation procedures missing operative notes</div>
 <div className="text-xs text-[#6B7280] mt-1">Complete within 48h</div>
 </div>
 
 <div className="bg-white p-4 rounded-lg border border-[#2C4A60]">
 <div className="flex items-center justify-between mb-2">
 <span className="font-medium text-[#2C4A60]">Device Follow-up Notes</span>
 <span className="text-xs bg-[#F0F7F4] text-[#2D6147] px-2 py-1 rounded-full">COMPLETE</span>
 </div>
 <div className="text-sm text-[#2C4A60]">All device clinic notes up to date</div>
 <div className="text-xs text-[#2C4A60] mt-1">Next batch due tomorrow</div>
 </div>
 </div>
 </div>
 
 {/* Documentation Compliance */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Documentation Compliance</h4>
 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-[#C8D4DC] rounded-lg">
 <div>
 <div className="font-medium text-[#2C4A60]">EP Registry Completeness</div>
 <div className="text-sm text-[#2C4A60]">LAAC, Ablation data quality</div>
 </div>
 <div className="text-2xl font-bold text-[#2C4A60]">94.6%</div>
 </div>
 
 <div className="flex items-center justify-between p-4 bg-chrome-50 rounded-lg">
 <div>
 <div className="font-medium text-chrome-900">Timely Documentation</div>
 <div className="text-sm text-chrome-700">Within 48h completion</div>
 </div>
 <div className="text-2xl font-bold text-chrome-600">91.2%</div>
 </div>
 
 <div className="flex items-center justify-between p-4 bg-arterial-50 rounded-lg">
 <div>
 <div className="font-medium text-arterial-900">Device Documentation</div>
 <div className="text-sm text-arterial-700">ICD/PM follow-up notes</div>
 </div>
 <div className="text-2xl font-bold text-arterial-600">97.8%</div>
 </div>
 </div>
 </div>
 </div>
 
 {/* Documentation Templates & Tools */}
 <div className="space-y-4">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">EP Documentation Templates</h4>
 <div className="grid grid-cols-1 gap-3">
 {[
 { template: 'AFib Ablation Report', time: '~7 min', color: 'green', priority: 'high' },
 { template: 'LAAC Procedure Note', time: '~5 min', color: 'blue', priority: 'high' },
 { template: 'VT Ablation Report', time: '~8 min', color: 'arterial', priority: 'high' },
 { template: 'Device Implant Note', time: '~6 min', color: 'chrome', priority: 'medium' },
 { template: 'EP Study Report', time: '~4 min', color: 'emerald', priority: 'medium' },
 { template: 'Device Clinic Note', time: '~3 min', color: 'orange', priority: 'low' }
 ].map((template, index) => (
 <button 
 key={template.template}
 className={`p-3 text-left bg-${template.color}-50 hover:bg-${template.color}-100 rounded-lg transition-colors border border-${template.color}-200`}
 onClick={async () => {
 // Action handler - implementation pending
 
 if (template.template.includes('LAAC')) {
 // Use real LAAC device selection API for LAAC procedures
 try {
 const patientData = {
 id: 'EP004',
 laaOstiumDiameter: 22,
 laaDepth: 28,
 laaMorphology: 'windsock',
 hasActiveEndocarditis: false,
 hasLAAThrombus: false,
 hasComplexCongenitalHeart: false
 };
 
 const response = await apiService.recommendLAACDevice(patientData);
 
 if (response.success) {
 const recommendation = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 } else {
 // Default template behavior for other templates
 {};
 }
 }}
 >
 <div className="flex items-center justify-between">
 <div className={`font-medium text-${template.color}-900`}>{template.template}</div>
 {template.priority === 'high' && (
 <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">HIGH</span>
 )}
 </div>
 <div className={`text-xs text-${template.color}-600`}>Estimated completion: {template.time}</div>
 </button>
 ))}
 </div>
 </div>
 
 {/* Recent Documentation Activity */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Recent Documentation Activity</h4>
 <div className="space-y-3">
 {[
 { action: 'AFib Ablation Report', patient: 'EP001', provider: 'Dr. Johnson', time: '18 min ago', status: 'Complete' },
 { action: 'LAAC Registry Entry', patient: 'EP003', provider: 'Dr. Rodriguez', time: '42 min ago', status: 'Complete' },
 { action: 'Device Clinic Note', patient: 'EP005', provider: 'A. Miller, NP', time: '1.1 hr ago', status: 'In Progress' },
 { action: 'VT Ablation Report', patient: 'EP002', provider: 'Dr. Williams', time: '2.3 hr ago', status: 'Pending' }
 ].map((activity, index) => (
 <div key={`${activity.action}-${activity.patient}`} className="flex items-center justify-between p-3 bg-titanium-50 rounded-lg">
 <div className="flex-1">
 <div className="font-medium text-titanium-900">{activity.action}</div>
 <div className="text-sm text-titanium-600">{activity.patient} • {activity.provider}</div>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-500">{activity.time}</div>
 <div className={`text-xs px-2 py-1 rounded-full ${
 activity.status === 'Complete' ? 'bg-[#F0F7F4] text-[#2D6147]' :
 activity.status === 'In Progress' ? 'bg-chrome-100 text-chrome-700' :
 'bg-[#FAF6E8] text-[#8B6914]'
 }`}>
 {activity.status}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 
 {/* Registry & Quality Actions */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Registry & Quality Actions</h4>
 <div className="space-y-2">
 <button 
 className="w-full p-3 text-left bg-[#C8D4DC] hover:bg-[#C8D4DC] rounded-lg transition-colors"
 onClick={() => {
 toast.info('LAAC Registry', 'LAAC registry data entry with automated field population and validation will be available in the next release.');
 }}
 >
 <div className="font-medium text-[#2C4A60]">Complete LAAC Registry</div>
 <div className="text-xs text-[#2C4A60]">2 cases due today</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-100 rounded-lg transition-colors"
 onClick={() => {
 toast.info('Quality Report', 'Automated monthly EP outcomes report with real-time analytics and benchmarking will be available in the next release.');
 }}
 >
 <div className="font-medium text-chrome-900">Generate Quality Report</div>
 <div className="text-xs text-chrome-600">Monthly EP outcomes summary</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors"
 onClick={() => {
 toast.info('Ablation Success Analysis', 'Advanced ablation analytics with ML-driven predictive modeling will be available in the next release.');
 }}
 >
 <div className="font-medium text-arterial-900">Ablation Success Analysis</div>
 <div className="text-xs text-arterial-600">Success rate trending</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-[#F0F5FA] hover:bg-[#F0F5FA] rounded-lg transition-colors"
 onClick={() => {
 toast.info('Update Templates', 'Template management with version control and clinical decision support integration will be available in the next release.');
 }}
 >
 <div className="font-medium text-[#2C4A60]">Update Templates</div>
 <div className="text-xs text-[#2C4A60]">Review documentation forms</div>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
  </div>
);

// EP Clinical Gaps wrapper
const EPClinicalGaps: React.FC = () => (
  <EPClinicalGapDetectionDashboard />
);

// Electrophysiology Care Team Tab Configuration
const electrophysiologyTabs: StandardTabConfig[] = [
  {
 id: 'dashboard',
 label: 'Dashboard',
 icon: Users,
 description: 'EP overview and LAAC insights'
  },
  {
 id: 'patients',
 label: 'Patients',
 icon: Users,
 description: 'EP patient census and details'
  },
  {
 id: 'workflow',
 label: 'LAAC Optimization',
 icon: Zap,
 description: 'Left Atrial Appendage Closure workflows'
  },
  {
 id: 'safety',
 label: 'Safety Screening',
 icon: Shield,
 description: 'EP safety protocols and screening'
  },
  {
 id: 'team',
 label: 'Clinical Collaboration',
 icon: Users,
 description: 'Clinical consultation and multidisciplinary care'
  },
  {
 id: 'documentation',
 label: 'Documentation',
 icon: AlertTriangle,
 description: 'EP clinical documentation'
  },
  {
 id: 'clinical-gaps',
 label: 'Clinical Gaps',
 icon: AlertTriangle,
 description: 'LAAC candidates, CSP evaluation, PFA re-ablation'
  }
];

// Electrophysiology Care Team Configuration
export const electrophysiologyCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Electrophysiology',
  moduleDescription: 'Advanced electrophysiology care coordination, LAAC optimization, and arrhythmia management',
  moduleIcon: Zap,
  primaryColor: 'chrome-blue',
  tabs: electrophysiologyTabs,
  tabContent: {
 dashboard: EPDashboard,
 patients: EPPatients,
 workflow: EPWorkflow,
 safety: EPSafety,
 team: EPClinicalCollaboration,
 documentation: EPDocumentation,
 'clinical-gaps': EPClinicalGaps
  }
};