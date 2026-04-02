import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';
import CRTICDEligibilityCalculator from '../../../components/riskCalculators/CRTICDEligibilityCalculator';
import { featureFlags } from '../../../config/featureFlags';
import ClinicalGapDetectionDashboard from '../components/clinical/ClinicalGapDetectionDashboard';

// Import Heart Failure specific components
import PatientWorklistEnhanced from '../components/care-team/PatientWorklistEnhanced';
import ReferralTrackerEnhanced from '../components/care-team/ReferralTrackerEnhanced';
import TeamCollaborationPanel from '../components/care-team/TeamCollaborationPanel';
import CareGapAnalyzer from '../components/care-team/CareGapAnalyzer';
import RealTimeHospitalAlerts from '../components/care-team/RealTimeHospitalAlerts';

// Heart Failure Dashboard Component
const HFDashboard: React.FC = () => (
  <div className="space-y-6">
 <RealTimeHospitalAlerts />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <CareGapAnalyzer />
 <TeamCollaborationPanel />
 </div>
  </div>
);

// Heart Failure Patients Component
const HFPatients: React.FC = () => (
  <div className="space-y-6">
 <PatientWorklistEnhanced />
  </div>
);

// Heart Failure Workflow Component  
const HFWorkflow: React.FC = () => (
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
 item.status === 'amber' ? 'bg-chrome-50 border-titanium-300' :
 'bg-green-50 border-green-100'
 }`}>
 <div className="flex justify-between items-center">
 <div className={`font-medium ${
 item.status === 'red' ? 'text-red-900' :
 item.status === 'amber' ? 'text-gray-500' :
 'text-teal-700'
 }`}>
 {item.pillar}
 </div>
 <div className={`text-sm ${
 item.status === 'red' ? 'text-red-700' :
 item.status === 'amber' ? 'text-gray-500' :
 'text-teal-700'
 }`}>
 {item.current} (Target: {item.target})
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Clinical Workflow Actions</h4>
 <div className="space-y-2">
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-100 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example population filters - in real app this would come from user selection
 const populationFilters = {
 facility: 'Main Campus',
 riskLevel: 'medium-high',
 ageRange: '50-75'
 };
 
 const response = await apiService.getGDMTGapAnalysis(populationFilters);
 
 if (response.success) {
 const analysis = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-chrome-900">GDMT Titration Protocol</div>
 <div className="text-xs text-chrome-600">Step-wise medication optimization</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-titanium-300 hover:bg-titanium-300 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const patientData = {
 id: 'HF001',
 age: 67,
 ef: 28,
 nyhaClass: 3,
 qrsWidth: 155,
 creatinine: 1.2,
 diabetes: true,
 chronicKidneyDisease: false,
 previousHospitalizations: 2
 };
 
 const response = await apiService.assessDeviceEligibility(patientData);
 
 if (response.success) {
 const assessment = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-teal-700">Device Therapy Evaluation</div>
 <div className="text-xs text-teal-700">CRT/ICD candidacy assessment</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const patientData = {
 id: 'HF003',
 age: 58,
 ef: 22,
 wallThickness: 9,
 familyHistory: true,
 symptoms: ['dyspnea', 'fatigue', 'edema'],
 biomarkers: {
 ntProBNP: 3500,
 troponin: 0.15
 },
 comorbidities: ['diabetes', 'hypertension']
 };
 
 const response = await apiService.analyzePhenotype(patientData);
 
 if (response.success) {
 const analysis = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-arterial-900">Advanced Therapy Referral</div>
 <div className="text-xs text-arterial-600">LVAD/transplant evaluation</div>
 </button>
 </div>
 </div>
 </div>
 </div>
  </div>
);

// Heart Failure Safety Component
const HFSafety: React.FC = () => (
  <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Shield className="w-5 h-5 text-porsche-600" />
 Quality & Safety Metrics
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Quality Indicators</h4>
 <div className="space-y-3">
 {[
 { metric: '30-Day Readmission', value: '8.7%', target: '<10%', status: 'green' },
 { metric: 'Mortality Index', value: '2.1%', target: '<2.5%', status: 'green' },
 { metric: 'Length of Stay', value: '4.2 days', target: '<5 days', status: 'green' },
 { metric: 'Patient Satisfaction', value: '92%', target: '>90%', status: 'green' }
 ].map((item, index) => (
 <div key={item.metric} className="flex justify-between items-center p-3 bg-titanium-300 rounded-lg border border-teal-700">
 <div className="font-medium text-teal-700">{item.metric}</div>
 <div className="text-sm text-teal-700">{item.value}</div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Safety Alerts</h4>
 <div className="space-y-3">
 {[
 { alert: 'Drug Interaction Check', count: 12, severity: 'amber' },
 { alert: 'Renal Function Monitoring', count: 8, severity: 'red' },
 { alert: 'Electrolyte Imbalance', count: 5, severity: 'amber' },
 { alert: 'Volume Overload Risk', count: 15, severity: 'red' }
 ].map((item, index) => (
 <div key={item.alert} className={`p-3 rounded-lg border ${
 item.severity === 'red' ? 'bg-red-50 border-red-200' :
 'bg-chrome-50 border-titanium-300'
 }`}>
 <div className={`font-medium ${
 item.severity === 'red' ? 'text-red-900' : 'text-gray-500'
 }`}>
 {item.alert}
 </div>
 <div className={`text-sm ${
 item.severity === 'red' ? 'text-red-700' : 'text-gray-500'
 }`}>
 {item.count} patients require attention
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Compliance Tracking</h4>
 <div className="space-y-3">
 {[
 { compliance: 'Guideline Adherence', percentage: '94%' },
 { compliance: 'Documentation Rate', percentage: '97%' },
 { compliance: 'Follow-up Completion', percentage: '89%' },
 { compliance: 'Medication Reconciliation', percentage: '95%' }
 ].map((item, index) => (
 <div key={item.compliance} className="p-3 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="font-medium text-chrome-900">{item.compliance}</div>
 <div className="text-sm text-chrome-700">{item.percentage}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
  </div>
);

// Heart Failure Clinical Collaboration Component
const HFClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
 {/* Clinical Collaboration Framework */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-porsche-600" />
 Heart Failure Clinical Collaboration & Consultation
 </h3>
 
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Clinical Team Collaboration */}
 <div className="lg:col-span-2 space-y-4">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Multidisciplinary Heart Failure Team</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {[
 { name: 'Dr. Sarah Johnson', role: 'Heart Failure Cardiologist', specialty: 'GDMT Optimization', expertise: 'Clinical Guideline Implementation', consultations: 234 },
 { name: 'Dr. Michael Chen', role: 'Advanced Heart Failure', specialty: 'Device Therapy', expertise: 'CRT/ICD Assessment', consultations: 189 },
 { name: 'Dr. Jennifer Williams', role: 'Interventional Cardiology', specialty: 'Structural Heart', expertise: 'TAVR/TEER Evaluation', consultations: 156 },
 { name: 'Dr. Robert Martinez', role: 'Cardiac Surgery', specialty: 'LVAD/Transplant', expertise: 'Advanced Therapies', consultations: 98 },
 { name: 'Dr. Lisa Rodriguez', role: 'Cardiac Anesthesia', specialty: 'Perioperative Care', expertise: 'Risk Assessment', consultations: 134 },
 { name: 'Maria Santos, RN', role: 'HF Clinical Coordinator', specialty: 'Care Transitions', expertise: 'Patient Navigation', consultations: 312 },
 { name: 'David Park, PharmD', role: 'Clinical Pharmacist', specialty: 'GDMT Optimization', expertise: 'Medication Management', consultations: 278 },
 { name: 'Amanda Wilson, NP', role: 'HF Nurse Practitioner', specialty: 'Clinic Management', expertise: 'Clinical Monitoring', consultations: 245 }
 ].map((member, index) => (
 <div key={member.name} className="p-4 bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="mb-2">
 <div className="font-medium text-titanium-900">{member.name}</div>
 </div>
 <div className="text-sm text-titanium-700">{member.role}</div>
 <div className="text-xs text-titanium-600">{member.specialty}</div>
 <div className="text-xs text-chrome-600 mt-1 font-medium">{member.expertise}</div>
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
 <Heart className="w-5 h-5 text-chrome-600" />
 Evidence-Based Clinical Pathways
 </h4>
 <div className="space-y-3">
 {[
 { pathway: 'GDMT Optimization Protocol', indication: 'Heart Failure with Reduced EF', evidence: 'AHA/ACC Guidelines', consultation: 'GDMT Team Review' },
 { pathway: 'Device Therapy Evaluation', indication: 'CRT/ICD Candidacy', evidence: 'HRS Guidelines', consultation: 'Device Selection Committee' },
 { pathway: 'Advanced Therapy Assessment', indication: 'Stage D Heart Failure', evidence: 'ISHLT Guidelines', consultation: 'Heart Team Required' },
 { pathway: 'Structural Intervention Review', indication: 'Secondary MR/TR', evidence: 'Expert Consensus', consultation: 'Multidisciplinary Assessment' }
 ].map((pathway, index) => (
 <div key={pathway.pathway} className={`flex items-center justify-between p-4 rounded-lg border ${
 pathway.indication === 'Heart Failure with Reduced EF' ? 'bg-chrome-50 border-chrome-200' :
 pathway.indication === 'CRT/ICD Candidacy' ? 'bg-green-50 border-green-100' :
 pathway.indication === 'Stage D Heart Failure' ? 'bg-red-50 border-red-200' :
 'bg-arterial-50 border-arterial-200'
 }`}>
 <div>
 <div className={`font-medium ${
 pathway.indication === 'Heart Failure with Reduced EF' ? 'text-chrome-900' :
 pathway.indication === 'CRT/ICD Candidacy' ? 'text-teal-700' :
 pathway.indication === 'Stage D Heart Failure' ? 'text-red-900' :
 'text-arterial-900'
 }`}>
 {pathway.pathway}
 </div>
 <div className="text-sm text-titanium-600">
 {pathway.indication} • {pathway.evidence}
 </div>
 </div>
 <div className={`text-xs px-2 py-1 rounded-full ${
 pathway.indication === 'Heart Failure with Reduced EF' ? 'bg-chrome-100 text-chrome-700' :
 pathway.indication === 'CRT/ICD Candidacy' ? 'bg-green-50 text-green-600' :
 pathway.indication === 'Stage D Heart Failure' ? 'bg-red-100 text-red-700' :
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
 <div className="text-center p-4 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-chrome-600">87%</div>
 <div className="text-xs text-chrome-700">GDMT Target Achievement</div>
 </div>
 <div className="text-center p-4 bg-titanium-300 rounded-lg">
 <div className="text-2xl font-bold text-teal-700">23%</div>
 <div className="text-xs text-teal-700">Readmission Reduction</div>
 </div>
 <div className="text-center p-4 bg-arterial-50 rounded-lg">
 <div className="text-2xl font-bold text-arterial-600">94%</div>
 <div className="text-xs text-arterial-700">Clinical Consensus Rate</div>
 </div>
 <div className="text-center p-4 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-teal-700">96%</div>
 <div className="text-xs text-teal-700">Guideline Adherence</div>
 </div>
 </div>
 </div>
 
 {/* Active Clinical Consultations */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Active Clinical Consultations</h4>
 <div className="space-y-3">
 {[
 { consultation: 'GDMT Optimization', patient: 'HF001', status: 'ACE-I/ARB Titration', urgency: 'routine' },
 { consultation: 'Device Evaluation', patient: 'HF003', status: 'CRT Candidacy Review', urgency: 'priority' },
 { consultation: 'Advanced Therapy Assessment', patient: 'HF005', status: 'LVAD Evaluation', urgency: 'urgent' },
 { consultation: 'Structural Intervention', patient: 'HF007', status: 'MitraClip Assessment', urgency: 'routine' }
 ].map((consult, index) => (
 <div key={consult.consultation} className={`p-3 rounded-lg border ${
 consult.urgency === 'urgent' ? 'bg-red-50 border-red-200' :
 consult.urgency === 'priority' ? 'bg-chrome-50 border-titanium-300' :
 'bg-chrome-50 border-chrome-200'
 }`}>
 <div className={`font-medium ${
 consult.urgency === 'urgent' ? 'text-red-900' :
 consult.urgency === 'priority' ? 'text-gray-500' :
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
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const samplePatientData = {
 id: 'HF001',
 ef: 35,
 creatinine: 1.2,
 contraindications: [],
 medications: {
 aceArb: { dose: 5 },
 betaBlocker: { dose: 25 },
 mra: { dose: 0 },
 sglt2i: { dose: 0 }
 }
 };
 
 const response = await apiService.calculateGDMT(samplePatientData);
 if (response.success) {
 const optimization = response.data?.overallOptimization || 0;
 {};
 }
 } catch (error) {
 if (process.env.NODE_ENV === 'development') console.error('GDMT Calculator error:', error);
 {};
 }
 }}
 >
 <div className="font-medium text-chrome-900">GDMT Calculator</div>
 <div className="text-xs text-chrome-600">Guideline-directed medical therapy</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-titanium-300 hover:bg-titanium-300 rounded-lg transition-colors"
 onClick={async () => {
 // Action handler - implementation pending
 try {
 // Example patient data - in real app this would come from selected patient
 const patientData = {
 id: 'HF002',
 age: 72,
 ef: 25,
 nyhaClass: 2,
 qrsWidth: 135,
 creatinine: 1.4,
 diabetes: false,
 chronicKidneyDisease: true,
 previousHospitalizations: 1
 };
 
 const response = await apiService.assessDeviceEligibility(patientData);
 
 if (response.success) {
 const assessment = response.data as any;
 {};
 } else {
 {};
 }
 } catch (error) {
 {};
 }
 }}
 >
 <div className="font-medium text-teal-700">Device Candidacy Tool</div>
 <div className="text-xs text-teal-700">CRT/ICD selection criteria</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement HF Guidelines reference modal
 {};
 }}
 >
 <div className="font-medium text-arterial-900">HF Guidelines</div>
 <div className="text-xs text-arterial-600">Evidence-based recommendations</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-50 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement Multidisciplinary Consultation platform
 {};
 }}
 >
 <div className="font-medium text-gray-500">Multidisciplinary Consultation</div>
 <div className="text-xs text-gray-500">Team collaboration platform</div>
 </button>
 </div>
 </div>
 
 {/* CRT/ICD Eligibility Calculator */}
 {featureFlags.riskCalculators.crtIcdEligibility && (
 <CRTICDEligibilityCalculator 
 ejectionFraction={28}
 nyhaClass="III"
 qrsDuration={155}
 qrsMorphology="LBBB"
 optimalMedicalTherapy={true}
 lifeExpectancy=">1 year"
 priorSCD={false}
 ischemicCardiomyopathy={true}
 atriallFibrillation={false}
 kidneyFunction="Mild"
 />
 )}
 </div>
 </div>
 </div>
 
 {/* Enhanced Team Collaboration Panel */}
 <TeamCollaborationPanel />
 
 {/* Referral Coordination */}
 <ReferralTrackerEnhanced />
  </div>
);

// Heart Failure Documentation Component
const HFDocumentation: React.FC = () => (
  <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-porsche-600" />
 CDI Documentation Alerts
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Active Documentation Alerts</h4>
 <div className="space-y-3">
 {[
 { alert: 'HF Severity Documentation', patient: 'HF001', urgency: 'high', dueIn: '2 hours' },
 { alert: 'EF Documentation Required', patient: 'HF003', urgency: 'medium', dueIn: '4 hours' },
 { alert: 'NYHA Class Clarification', patient: 'HF005', urgency: 'high', dueIn: '1 hour' },
 { alert: 'Comorbidity Documentation', patient: 'HF007', urgency: 'low', dueIn: '8 hours' }
 ].map((item, index) => (
 <div key={`${item.alert}-${item.patient}`} className={`p-3 rounded-lg border ${
 item.urgency === 'high' ? 'bg-red-50 border-red-200' :
 item.urgency === 'medium' ? 'bg-chrome-50 border-titanium-300' :
 'bg-chrome-50 border-chrome-200'
 }`}>
 <div className={`font-medium ${
 item.urgency === 'high' ? 'text-red-900' :
 item.urgency === 'medium' ? 'text-gray-500' :
 'text-chrome-900'
 }`}>
 {item.alert}
 </div>
 <div className={`text-sm ${
 item.urgency === 'high' ? 'text-red-700' :
 item.urgency === 'medium' ? 'text-gray-500' :
 'text-chrome-700'
 }`}>
 {item.patient} • Due in {item.dueIn}
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Documentation Templates</h4>
 <div className="space-y-2">
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement HF Assessment Template
 {};
 }}
 >
 <div className="font-medium text-chrome-900">HF Assessment Template</div>
 <div className="text-xs text-chrome-600">Comprehensive heart failure evaluation</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-titanium-300 hover:bg-titanium-300 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement GDMT Documentation template
 {};
 }}
 >
 <div className="font-medium text-teal-700">GDMT Documentation</div>
 <div className="text-xs text-teal-700">Guideline-directed therapy notes</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-arterial-50 hover:bg-arterial-100 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement Device Evaluation Note template
 {};
 }}
 >
 <div className="font-medium text-arterial-900">Device Evaluation Note</div>
 <div className="text-xs text-arterial-600">CRT/ICD assessment documentation</div>
 </button>
 <button 
 className="w-full p-3 text-left bg-chrome-50 hover:bg-chrome-50 rounded-lg transition-colors"
 onClick={() => {
 // Action handler - implementation pending
 // TODO: Implement Discharge Planning template
 {};
 }}
 >
 <div className="font-medium text-gray-500">Discharge Planning</div>
 <div className="text-xs text-gray-500">Transition of care documentation</div>
 </button>
 </div>
 
 <div className="mt-6">
 <h5 className="font-medium text-titanium-900 mb-3">Documentation Metrics</h5>
 <div className="space-y-2">
 <div className="flex justify-between items-center p-2 bg-titanium-50 rounded">
 <span className="text-sm text-titanium-700">Completion Rate</span>
 <span className="text-sm font-medium text-teal-700">97%</span>
 </div>
 <div className="flex justify-between items-center p-2 bg-titanium-50 rounded">
 <span className="text-sm text-titanium-700">Avg Time to Complete</span>
 <span className="text-sm font-medium text-chrome-600">12 min</span>
 </div>
 <div className="flex justify-between items-center p-2 bg-titanium-50 rounded">
 <span className="text-sm text-titanium-700">Quality Score</span>
 <span className="text-sm font-medium text-arterial-600">94%</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
  </div>
);


// HF Clinical Gaps wrapper
const HFClinicalGaps: React.FC = () => (
  <ClinicalGapDetectionDashboard />
);

// Heart Failure Care Team Tab Configuration
const heartFailureTabs: StandardTabConfig[] = [
  {
 id: 'dashboard',
 label: 'Dashboard',
 icon: Users,
 description: 'Real-time alerts and care gaps'
  },
  {
 id: 'patients',
 label: 'Patients',
 icon: Users,
 description: 'Patient census and worklist'
  },
  {
 id: 'workflow',
 label: 'GDMT Optimization',
 icon: Heart,
 description: 'Guideline-directed medical therapy'
  },
  {
 id: 'safety',
 label: 'Quality & Safety',
 icon: Shield,
 description: 'Safety metrics and alerts'
  },
  {
 id: 'team',
 label: 'Clinical Collaboration',
 icon: Users,
 description: 'Clinical consultation and care coordination'
  },
  {
 id: 'documentation',
 label: 'Documentation',
 icon: AlertTriangle,
 description: 'CDI and clinical documentation'
  },
  {
 id: 'clinical-gaps',
 label: 'Clinical Gaps',
 icon: AlertTriangle,
 description: '23-gap detection: ATTR-CM, iron deficiency, finerenone, GLP-1/HFpEF, HCM myosin inhibitor, CardioMEMS, CASTLE-AF, ivabradine, vericiguat, H-ISDN, cardiac rehab, undiagnosed HFpEF, DANISH ICD, OSA-HF, RPM, ARNi underdosing, loop-without-MRA, hyponatremia, NT-proBNP monitoring, cardiac MRI, palliative care, diuretic resistance, predischarge NT-proBNP'
  }
];

// Heart Failure Care Team Configuration
export const heartFailureCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Heart Failure',
  moduleDescription: 'Comprehensive heart failure care coordination, GDMT optimization, and population health management',
  moduleIcon: Heart,
  primaryColor: 'porsche',
  tabs: heartFailureTabs,
  tabContent: {
 dashboard: HFDashboard,
 patients: HFPatients,
 workflow: HFWorkflow,
 safety: HFSafety,
 team: HFClinicalCollaboration,
 documentation: HFDocumentation,
 'clinical-gaps': HFClinicalGaps
  }
};