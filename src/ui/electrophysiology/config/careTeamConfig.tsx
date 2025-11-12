import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Zap, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp, Timer, Heart } from 'lucide-react';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';
import { apiService } from '../../../services/apiService';
import CRTICDEligibilityCalculator from '../../../components/riskCalculators/CRTICDEligibilityCalculator';
import { featureFlags } from '../../../config/featureFlags';

// Import Electrophysiology specific components
import PatientDetailPanel from '../components/PatientDetailPanel';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import EPClinicalDecisionSupport from '../components/EPClinicalDecisionSupport';
import EPROICalculator from '../components/EPROICalculator';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';

// EP Dashboard Component
const EPDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* EP Metrics Overview */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-medical-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">142</div>
            <div className="text-sm text-steel-600">EP Procedures MTD</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">89</div>
            <div className="text-sm text-steel-600">LAAC Procedures</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">96.4%</div>
            <div className="text-sm text-steel-600">Ablation Success Rate</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-purple-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">92.8%</div>
            <div className="text-sm text-steel-600">Anticoag Compliance</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* LAAC Risk Dashboard */}
    <LAACRiskDashboard />
    
    {/* EP Device Network */}
    <EPDeviceNetworkVisualization />
  </div>
);

// EP Patients Component - Updated
const EPPatients: React.FC = () => (
  <div className="space-y-6">
    {/* Patient Registry Table */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-green-600" />
          Electrophysiology Patient Registry
        </h3>
        <div className="flex items-center gap-3">
          <button 
            className="px-4 py-2 bg-medical-green-100 text-medical-green-700 rounded-lg hover:bg-medical-green-200 transition-colors text-sm"
            onClick={() => {
              console.log('EP: Exporting Electrophysiology Patient Registry');
              alert('Exporting EP Patient Registry\n\nThis will generate a comprehensive report containing:\n• Patient demographics and identifiers\n• Arrhythmia types and classifications\n• Procedure history (ablations, LAAC, device implants)\n• CHA₂DS₂-VASc and HAS-BLED scores\n• Anticoagulation status and medication compliance\n• Provider assignments and care team data\n• Quality metrics and outcomes data\n\nExport format: Excel/CSV with HIPAA-compliant data governance');
              // TODO: Implement EP registry export functionality with secure data handling
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
            <tr className="border-b border-steel-200">
              <th className="text-left py-3 px-4 font-medium text-steel-700">Patient ID</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Name</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Rhythm</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Procedure</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">CHA₂DS₂-VASc</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Anticoagulation</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Provider</th>
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
              <tr key={index} className="border-b border-steel-100 hover:bg-steel-50">
                <td className="py-3 px-4 font-mono text-steel-900">{patient.id}</td>
                <td className="py-3 px-4 text-steel-900">{patient.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.rhythm === 'AFib' ? 'bg-red-100 text-red-700' :
                    patient.rhythm === 'VTach' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {patient.rhythm}
                  </span>
                </td>
                <td className="py-3 px-4 text-steel-700">{patient.procedure}</td>
                <td className="py-3 px-4 font-mono text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    parseInt(patient.chads) >= 4 ? 'bg-red-100 text-red-700' :
                    parseInt(patient.chads) >= 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {patient.chads}
                  </span>
                </td>
                <td className="py-3 px-4 text-steel-700">{patient.anticoag}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === 'Complete' ? 'bg-green-100 text-green-700' :
                    patient.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'Planning' ? 'bg-purple-100 text-purple-700' :
                    patient.status === 'Recovery' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {patient.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-steel-700">{patient.provider}</td>
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
  </div>
);

// EP Clinical Collaboration Component
const EPClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Collaboration & Consultation */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-green-600" />
        Clinical Collaboration & Multidisciplinary Consultation
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Team Collaboration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Multidisciplinary Clinical Team</h4>
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
                <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                  <div className="mb-2">
                    <div className="font-medium text-steel-900">{member.name}</div>
                  </div>
                  <div className="text-sm text-steel-700">{member.role}</div>
                  <div className="text-xs text-steel-600">{member.specialty}</div>
                  <div className="text-xs text-green-600 mt-1 font-medium">{member.expertise}</div>
                  <div className="mt-2">
                    <span className="text-xs text-steel-500">{member.consultations} clinical consultations YTD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Clinical Decision Support Pathways */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Evidence-Based Clinical Pathways
            </h4>
            <div className="space-y-3">
              {[
                { pathway: 'AFib Management Protocol', indication: 'Atrial Fibrillation', evidence: 'AHA/ACC Guidelines', consultation: 'Stroke Risk Assessment' },
                { pathway: 'LAAC Evaluation Pathway', indication: 'Anticoagulation Contraindication', evidence: 'Expert Consensus', consultation: 'Heart Team Required' },
                { pathway: 'VT Ablation Assessment', indication: 'Ventricular Tachycardia', evidence: 'HRS Guidelines', consultation: 'Multidisciplinary Review' },
                { pathway: 'Device Therapy Protocol', indication: 'Heart Failure with Arrhythmia', evidence: 'Clinical Evidence', consultation: 'Device Selection Committee' }
              ].map((pathway, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                  pathway.indication === 'Atrial Fibrillation' ? 'bg-red-50 border-red-200' :
                  pathway.indication === 'Anticoagulation Contraindication' ? 'bg-orange-50 border-orange-200' :
                  pathway.indication === 'Ventricular Tachycardia' ? 'bg-purple-50 border-purple-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div>
                    <div className={`font-medium ${
                      pathway.indication === 'Atrial Fibrillation' ? 'text-red-900' :
                      pathway.indication === 'Anticoagulation Contraindication' ? 'text-orange-900' :
                      pathway.indication === 'Ventricular Tachycardia' ? 'text-purple-900' :
                      'text-blue-900'
                    }`}>
                      {pathway.pathway}
                    </div>
                    <div className="text-sm text-steel-600">
                      {pathway.indication} • {pathway.evidence}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    pathway.indication === 'Atrial Fibrillation' ? 'bg-red-100 text-red-700' :
                    pathway.indication === 'Anticoagulation Contraindication' ? 'bg-orange-100 text-orange-700' :
                    pathway.indication === 'Ventricular Tachycardia' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
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
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Clinical Quality Outcomes</h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">96.4%</div>
                <div className="text-xs text-green-700">Clinical Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">94%</div>
                <div className="text-xs text-blue-700">Guideline Adherence</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">92.8%</div>
                <div className="text-xs text-purple-700">Stroke Prevention Rate</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">98%</div>
                <div className="text-xs text-emerald-700">Multidisciplinary Consensus</div>
              </div>
            </div>
          </div>
          
          {/* Active Clinical Consultations */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Active Clinical Consultations</h4>
            <div className="space-y-3">
              {[
                { consultation: 'AFib Risk Assessment', patient: 'EP001', status: 'CHA₂DS₂-VASc Evaluation', urgency: 'routine' },
                { consultation: 'LAAC Candidacy Review', patient: 'EP003', status: 'Bleeding Risk Analysis', urgency: 'priority' },
                { consultation: 'VT Ablation Planning', patient: 'EP004', status: 'Heart Team Consultation', urgency: 'urgent' },
                { consultation: 'Device Optimization', patient: 'EP005', status: 'Clinical Parameter Review', urgency: 'routine' }
              ].map((consult, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  consult.urgency === 'urgent' ? 'bg-red-50 border-red-200' :
                  consult.urgency === 'priority' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`font-medium ${
                    consult.urgency === 'urgent' ? 'text-red-900' :
                    consult.urgency === 'priority' ? 'text-orange-900' :
                    'text-blue-900'
                  }`}>
                    {consult.consultation}
                  </div>
                  <div className="text-sm text-steel-700">{consult.patient}: {consult.status}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Clinical Decision Support Tools */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Clinical Decision Support</h4>
            <div className="space-y-2">
              <button 
                className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                onClick={async () => {
                  console.log('EP: Opening CHA₂DS₂-VASc Calculator - calling automated API');
                  try {
                    const response = await apiService.getAutomatedCHA2DS2VASc('HF001');
                    if (response.success && response.data) {
                      const { score, riskLevel, annualStrokeRisk, recommendation, components } = response.data as any;
                      window.alert(
                        `CHA₂DS₂-VASc Automated Calculator Results\n\n` +
                        `Patient: HF001\n` +
                        `Score: ${score} points\n` +
                        `Risk Level: ${riskLevel}\n` +
                        `Annual Stroke Risk: ${annualStrokeRisk}\n\n` +
                        `Clinical Recommendation:\n${recommendation}\n\n` +
                        `Score Components (auto-calculated from EHR):\n` +
                        `• Congestive HF: ${components.congestiveHF} point\n` +
                        `• Hypertension: ${components.hypertension} point\n` +
                        `• Age: ${components.age} points\n` +
                        `• Diabetes: ${components.diabetes} point\n` +
                        `• Stroke History: ${components.stroke} points\n` +
                        `• Vascular Disease: ${components.vascular} point\n` +
                        `• Female Sex: ${components.sex} point\n\n` +
                        `✅ Data automatically retrieved from EHR`
                      );
                    }
                  } catch (error) {
                    console.error('CHA₂DS₂-VASc Calculator error:', error);
                    window.alert('CHA₂DS₂-VASc Calculator - Error connecting to backend. Please try again.');
                  }
                }}
              >
                <div className="font-medium text-red-900">CHA₂DS₂-VASc Calculator</div>
                <div className="text-xs text-red-600">Stroke risk assessment tool</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                onClick={async () => {
                  console.log('EP: Opening HAS-BLED Score Calculator - calling automated API');
                  try {
                    const response = await apiService.getAutomatedHASBLED('HF001');
                    if (response.success && response.data) {
                      const { score, riskLevel, annualBleedingRisk, recommendation, components } = response.data as any;
                      window.alert(
                        `HAS-BLED Automated Calculator Results\n\n` +
                        `Patient: HF001\n` +
                        `Score: ${score} points\n` +
                        `Risk Level: ${riskLevel}\n` +
                        `Annual Bleeding Risk: ${annualBleedingRisk}\n\n` +
                        `Clinical Recommendation:\n${recommendation}\n\n` +
                        `Score Components (auto-calculated from EHR):\n` +
                        `• Hypertension: ${components.hypertension} point\n` +
                        `• Abnormal Renal/Liver: ${components.abnormalRenalLiver} point\n` +
                        `• Stroke History: ${components.stroke} point\n` +
                        `• Bleeding History: ${components.bleeding} point\n` +
                        `• Labile INR: ${components.labilINR} point\n` +
                        `• Elderly (>65): ${components.elderly} point\n` +
                        `• Drugs (NSAIDs/Antiplatelets): ${components.drugs} point\n` +
                        `• Alcohol Use: ${components.alcohol} point\n\n` +
                        `✅ Data automatically retrieved from EHR`
                      );
                    }
                  } catch (error) {
                    console.error('HAS-BLED Calculator error:', error);
                    window.alert('HAS-BLED Calculator - Error connecting to backend. Please try again.');
                  }
                }}
              >
                <div className="font-medium text-blue-900">HAS-BLED Score</div>
                <div className="text-xs text-blue-600">Bleeding risk evaluation</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                onClick={async () => {
                  console.log('EP: Opening Advanced Anticoagulation Decision Support - calling real API');
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
                      alert(`Advanced Anticoagulation Decision Support:\n\n` +
                        `CHA₂DS₂-VASc Score: ${decision.cha2ds2vascScore}\n` +
                        `HAS-BLED Score: ${decision.hasbledScore}\n\n` +
                        `Recommendation: ${decision.primaryRecommendation.anticoagulation}\n` +
                        `Strength: ${decision.primaryRecommendation.strength}\n` +
                        `Evidence Level: ${decision.primaryRecommendation.evidenceLevel}\n\n` +
                        `DOAC Options:\n` +
                        decision.doacOptions.map((doac: any) => `• ${doac.medication} ${doac.dose}\n  Advantages: ${doac.advantages.join(', ')}`).join('\n') +
                        `\n\nBleeding Risk Mitigation:\n` +
                        decision.bleedingRiskMitigation.map((strategy: any) => `• ${strategy}`).join('\n') +
                        `\n\nGuidelines: ${decision.guidelines}`);
                    } else {
                      alert('Error accessing anticoagulation decision support: ' + response.error);
                    }
                  } catch (error) {
                    alert('Error connecting to anticoagulation decision service: ' + (error as any).message);
                  }
                }}
              >
                <div className="font-medium text-green-900">Clinical Guidelines</div>
                <div className="text-xs text-green-600">Evidence-based recommendations</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={async () => {
                  console.log('EP: Opening Ablation Success Predictor - calling real API');
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
                      alert(`EP Ablation Success Prediction:\n\n` +
                        `Success Probability: ${prediction.successProbability}%\n` +
                        `Recommendation: ${prediction.recommendation}\n\n` +
                        `Risk Factors:\n` +
                        prediction.riskFactors.map((factor: any) => `• ${factor}`).join('\n') +
                        `\n\nProcedure Specifics:\n` +
                        `• Expected Fluoro Time: ${prediction.procedureSpecific.expectedFluoroTime}\n` +
                        `• Expected Procedure Time: ${prediction.procedureSpecific.expectedProcedureTime}\n` +
                        `• Recommended Mapping: ${prediction.procedureSpecific.recommendedMapping}\n\n` +
                        `Optimization Strategies:\n` +
                        prediction.optimizationStrategies.map((strategy: any) => `• ${strategy}`).join('\n') +
                        `\n\nEvidence Level: ${prediction.evidenceLevel}`);
                    } else {
                      alert('Error accessing ablation success predictor: ' + response.error);
                    }
                  } catch (error) {
                    alert('Error connecting to ablation prediction service: ' + (error as any).message);
                  }
                }}
              >
                <div className="font-medium text-purple-900">Multidisciplinary Consultation</div>
                <div className="text-xs text-purple-600">Team collaboration platform</div>
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
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-medical-green-600" />
        EP Documentation & Quality Registry
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentation Alerts */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100">
            <h4 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Documentation Alerts & Registry
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-amber-900">LAAC Registry Due</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">DUE TODAY</span>
                </div>
                <div className="text-sm text-amber-700">2 LAAC procedures require registry data entry</div>
                <div className="text-xs text-amber-600 mt-1">Required within 24h of procedure</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">Ablation Reports Pending</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">PENDING</span>
                </div>
                <div className="text-sm text-orange-700">3 ablation procedures missing operative notes</div>
                <div className="text-xs text-orange-600 mt-1">Complete within 48h</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900">Device Follow-up Notes</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">COMPLETE</span>
                </div>
                <div className="text-sm text-green-700">All device clinic notes up to date</div>
                <div className="text-xs text-green-600 mt-1">Next batch due tomorrow</div>
              </div>
            </div>
          </div>
          
          {/* Documentation Compliance */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Documentation Compliance</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-900">EP Registry Completeness</div>
                  <div className="text-sm text-green-700">LAAC, Ablation data quality</div>
                </div>
                <div className="text-2xl font-bold text-green-600">94.6%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-900">Timely Documentation</div>
                  <div className="text-sm text-blue-700">Within 48h completion</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">91.2%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-900">Device Documentation</div>
                  <div className="text-sm text-purple-700">ICD/PM follow-up notes</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">97.8%</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Documentation Templates & Tools */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">EP Documentation Templates</h4>
            <div className="grid grid-cols-1 gap-3">
              {[
                { template: 'AFib Ablation Report', time: '~7 min', color: 'green', priority: 'high' },
                { template: 'LAAC Procedure Note', time: '~5 min', color: 'blue', priority: 'high' },
                { template: 'VT Ablation Report', time: '~8 min', color: 'purple', priority: 'high' },
                { template: 'Device Implant Note', time: '~6 min', color: 'indigo', priority: 'medium' },
                { template: 'EP Study Report', time: '~4 min', color: 'emerald', priority: 'medium' },
                { template: 'Device Clinic Note', time: '~3 min', color: 'orange', priority: 'low' }
              ].map((template, index) => (
                <button 
                  key={index} 
                  className={`p-3 text-left bg-${template.color}-50 hover:bg-${template.color}-100 rounded-lg transition-colors border border-${template.color}-200`}
                  onClick={async () => {
                    console.log(`EP: Opening ${template.template} documentation template`);
                    
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
                          alert(`LAAC Device Selection Recommendation:\\n\\n` +
                            `Primary Device: ${recommendation.primaryRecommendation.device}\\n` +
                            `Recommended Size: ${recommendation.primaryRecommendation.recommendedSize}\\n` +
                            `Suitability Score: ${recommendation.primaryRecommendation.suitability}%\\n\\n` +
                            `Advantages:\\n` +
                            recommendation.primaryRecommendation.advantages.map((adv: any) => `• ${adv}`).join('\\n') +
                            `\\n\\nPeriprocedural Protocol:\\n` +
                            `• Anesthesia: ${recommendation.periprocedural.anesthesia}\\n` +
                            `• Access: ${recommendation.periprocedural.access}\\n` +
                            `• Imaging: ${recommendation.periprocedural.imaging}\\n` +
                            `• Anticoagulation: ${recommendation.periprocedural.anticoagulation}\\n\\n` +
                            `Post-Procedure Management:\\n` +
                            `• ${recommendation.postProcedure.anticoagulation}\\n` +
                            `• Follow-up:\\n` +
                            recommendation.postProcedure.followUp.map((follow: any) => `  - ${follow}`).join('\\n'));
                        } else {
                          alert('Error accessing LAAC device selection: ' + response.error);
                        }
                      } catch (error) {
                        alert('Error connecting to LAAC device selection service: ' + (error as any).message);
                      }
                    } else {
                      // Default template behavior for other templates
                      alert(`${template.template} Documentation Template\\n\\nThis template will guide you through completing:\\n\\n• ${template.template.includes('Ablation') ? 'Procedural details and technique\\n• Electrophysiology findings\\n• Mapping and ablation parameters\\n• Complications and outcomes\\n• Post-procedure monitoring plan' : 
                      template.template.includes('Device') ? 'Device specifications and settings\\n• Lead positioning and thresholds\\n• Programming parameters\\n• Patient education provided\\n• Follow-up scheduling' :
                      'Clinical findings and assessments\\n• Diagnostic procedures performed\\n• Treatment recommendations\\n• Patient education and counseling\\n• Follow-up care plan'}\\n\\nEstimated completion time: ${template.time}\\nPriority level: ${template.priority.toUpperCase()}\\n\\nTemplate includes structured fields for comprehensive documentation and quality assurance.`);
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
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Recent Documentation Activity</h4>
            <div className="space-y-3">
              {[
                { action: 'AFib Ablation Report', patient: 'EP001', provider: 'Dr. Johnson', time: '18 min ago', status: 'Complete' },
                { action: 'LAAC Registry Entry', patient: 'EP003', provider: 'Dr. Rodriguez', time: '42 min ago', status: 'Complete' },
                { action: 'Device Clinic Note', patient: 'EP005', provider: 'A. Miller, NP', time: '1.1 hr ago', status: 'In Progress' },
                { action: 'VT Ablation Report', patient: 'EP002', provider: 'Dr. Williams', time: '2.3 hr ago', status: 'Pending' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-steel-900">{activity.action}</div>
                    <div className="text-sm text-steel-600">{activity.patient} • {activity.provider}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-steel-500">{activity.time}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'Complete' ? 'bg-green-100 text-green-700' :
                      activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {activity.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Registry & Quality Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Registry & Quality Actions</h4>
            <div className="space-y-2">
              <button 
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('EP: Opening LAAC Registry completion');
                  alert('Complete LAAC Registry Data Entry\n\nPending LAAC cases requiring registry submission:\n\n• Patient EP003 - Watchman FLX 27mm\n• Patient EP007 - Amulet 20/28mm\n\nRegistry data required:\n• Device specifications and positioning\n• Procedural success metrics\n• Complications (if any)\n• TEE imaging documentation\n• Antiplatelet therapy plan\n• Follow-up imaging schedule\n\nDeadline: Within 24 hours of procedure\nCompliance requirement: Joint Commission/CMS quality reporting\n\nAll data will be submitted to national LAAC quality registry.');
                  // TODO: Implement LAAC registry data entry system with automated field population and validation
                }}
              >
                <div className="font-medium text-green-900">Complete LAAC Registry</div>
                <div className="text-xs text-green-600">2 cases due today</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('EP: Generating Quality Report');
                  alert('EP Monthly Quality Outcomes Report\n\nThis comprehensive report will include:\n\n• Procedural volumes and success rates\n• Ablation efficacy metrics (freedom from arrhythmia)\n• LAAC procedure outcomes and complications\n• Device implantation success rates\n• Anticoagulation compliance tracking\n• Patient satisfaction scores\n• Length of stay and readmission rates\n• Quality improvement initiatives\n• Benchmarking against national standards\n\nReport format: Executive dashboard with detailed analytics\nDistribution: Medical Director, Quality Committee, Administration');
                  // TODO: Implement automated quality report generation with real-time data analytics and benchmarking
                }}
              >
                <div className="font-medium text-blue-900">Generate Quality Report</div>
                <div className="text-xs text-blue-600">Monthly EP outcomes summary</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('EP: Opening Ablation Success Analysis');
                  alert('Ablation Success Rate Analysis\n\nComprehensive analysis of EP ablation outcomes:\n\n• AFib ablation freedom from arrhythmia rates\n• VT ablation success and recurrence tracking\n• SVT ablation cure rates\n• Procedure time and fluoroscopy analysis\n• Complication rates by procedure type\n• Learning curve and volume-outcome relationships\n• Provider-specific performance metrics\n• Technology adoption impact analysis\n\nAnalytics include:\n• 30-day, 90-day, and 1-year success rates\n• Kaplan-Meier survival curves\n• Risk-adjusted outcomes\n• Predictive modeling for success probability');
                  // TODO: Implement advanced ablation analytics with machine learning predictive models
                }}
              >
                <div className="font-medium text-purple-900">Ablation Success Analysis</div>
                <div className="text-xs text-purple-600">Success rate trending</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('EP: Opening Template Management');
                  alert('EP Documentation Template Management\n\nManage and update EP clinical documentation templates:\n\n• Procedure note templates (ablation, LAAC, device)\n• Pre-procedure assessment forms\n• Post-procedure care plans\n• Device clinic visit notes\n• Anticoagulation management protocols\n• Patient education materials\n• Discharge instructions\n• Quality registry forms\n\nTemplate features:\n• Evidence-based clinical content\n• Structured data fields\n• Auto-calculated scores (CHA₂DS₂-VASc, HAS-BLED)\n• Decision support integration\n• Quality metric tracking\n• Compliance checking');
                  // TODO: Implement template management system with version control and clinical decision support integration
                }}
              >
                <div className="font-medium text-emerald-900">Update Templates</div>
                <div className="text-xs text-emerald-600">Review documentation forms</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
  }
];

// Electrophysiology Care Team Configuration
export const electrophysiologyCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Electrophysiology',
  moduleDescription: 'Advanced electrophysiology care coordination, LAAC optimization, and arrhythmia management',
  moduleIcon: Zap,
  primaryColor: 'medical-green',
  tabs: electrophysiologyTabs,
  tabContent: {
    dashboard: EPDashboard,
    patients: EPPatients,
    workflow: EPWorkflow,
    safety: EPSafety,
    team: EPClinicalCollaboration,
    documentation: EPDocumentation
  }
};