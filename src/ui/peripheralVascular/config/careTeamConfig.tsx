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
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-medical-amber-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">247</div>
            <div className="text-sm text-steel-600">Active PAD Patients</div>
          </div>
        </div>
      </div>
      
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-medical-red-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">38</div>
            <div className="text-sm text-steel-600">CLI High Risk</div>
          </div>
        </div>
      </div>
      
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-medical-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">85%</div>
            <div className="text-sm text-steel-600">Limb Salvage Rate</div>
          </div>
        </div>
      </div>
      
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-medical-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">92%</div>
            <div className="text-sm text-steel-600">Intervention Success</div>
          </div>
        </div>
      </div>
    </div>

    {/* WIfI Classification Dashboard */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-amber-600" />
        WIfI Classification & Risk Assessment
      </h3>
      <WIfIClassification />
    </div>

    {/* Network Visualization */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
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
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-amber-600" />
        PAD Patient Registry
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-steel-200">
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Patient</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Diagnosis</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Risk Level</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">ABI</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Wound Stage</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Next Appointment</th>
              <th className="text-left py-3 px-4 font-semibold text-steel-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {padPatients.map((patient) => (
              <tr key={patient.id} className="border-b border-steel-100 hover:bg-steel-50/50">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-steel-900">{patient.name}</div>
                    <div className="text-sm text-steel-600">{patient.mrn}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-steel-700">{patient.diagnosis}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.riskLevel === 'High' ? 'bg-medical-red-100 text-medical-red-700' :
                    patient.riskLevel === 'Moderate' ? 'bg-medical-amber-100 text-medical-amber-700' :
                    'bg-medical-green-100 text-medical-green-700'
                  }`}>
                    {patient.riskLevel}
                  </span>
                </td>
                <td className="py-3 px-4 text-steel-700">{patient.abi}</td>
                <td className="py-3 px-4 text-steel-700">{patient.woundStage}</td>
                <td className="py-3 px-4 text-steel-700">{patient.nextAppt}</td>
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
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
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
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-amber-600" />
        Limb Salvage Screening & Protocols
      </h3>
      <LimbSalvageScreening />
    </div>
  </div>
);

// Peripheral Clinical Collaboration Component
const PeripheralClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Collaboration Dashboard */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-amber-600" />
        Peripheral Vascular Clinical Collaboration & Consultation
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Consultation Teams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Multidisciplinary Vascular Team</h4>
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
                <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                  <div className="mb-2">
                    <div className="font-medium text-steel-900">{member.name}</div>
                  </div>
                  <div className="text-sm text-steel-700">{member.role}</div>
                  <div className="text-xs text-steel-600">{member.specialty}</div>
                  <div className="text-xs text-amber-600 mt-1 font-medium">{member.expertise}</div>
                  <div className="mt-2">
                    <span className="text-xs text-steel-500">{member.consultations} clinical consultations YTD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Clinical Decision Pathways */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
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
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                  pathway.indication === 'Peripheral Artery Disease' ? 'bg-blue-50 border-blue-200' :
                  pathway.indication === 'CLI/CLTI' ? 'bg-red-50 border-red-200' :
                  pathway.indication === 'Diabetic Foot Ulcer' ? 'bg-orange-50 border-orange-200' :
                  'bg-purple-50 border-purple-200'
                }`}>
                  <div>
                    <div className={`font-medium ${
                      pathway.indication === 'Peripheral Artery Disease' ? 'text-blue-900' :
                      pathway.indication === 'CLI/CLTI' ? 'text-red-900' :
                      pathway.indication === 'Diabetic Foot Ulcer' ? 'text-orange-900' :
                      'text-purple-900'
                    }`}>
                      {pathway.pathway}
                    </div>
                    <div className="text-sm text-steel-600">
                      {pathway.indication} • {pathway.evidence}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    pathway.indication === 'Peripheral Artery Disease' ? 'bg-blue-100 text-blue-700' :
                    pathway.indication === 'CLI/CLTI' ? 'bg-red-100 text-red-700' :
                    pathway.indication === 'Diabetic Foot Ulcer' ? 'bg-orange-100 text-orange-700' :
                    'bg-purple-100 text-purple-700'
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
                <div className="text-2xl font-bold text-green-600">85%</div>
                <div className="text-xs text-green-700">Limb Salvage Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">92%</div>
                <div className="text-xs text-blue-700">Intervention Success</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">94%</div>
                <div className="text-xs text-purple-700">Clinical Consensus Rate</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">96%</div>
                <div className="text-xs text-amber-700">Guideline Adherence</div>
              </div>
            </div>
          </div>
          
          {/* Active Clinical Consultations */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Active Clinical Consultations</h4>
            <div className="space-y-3">
              {[
                { consultation: 'PAD Risk Stratification', patient: 'PV001', status: 'ABI Assessment', urgency: 'routine' },
                { consultation: 'CLI Limb Salvage', patient: 'PV003', status: 'Revascularization Planning', urgency: 'urgent' },
                { consultation: 'Wound Care Management', patient: 'PV002', status: 'Multidisciplinary Assessment', urgency: 'priority' },
                { consultation: 'Intervention Planning', patient: 'PV004', status: 'WIfI Classification', urgency: 'routine' }
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
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PV: Opening WIfI Classification Tool');
                  window.alert(
                    'WIfI Classification System\n\n' +
                    'WOUND (W) Grade:\n' +
                    '0: No ulcer\n' +
                    '1: Small, shallow ulcer(s)\n' +
                    '2: Deeper ulcer with exposed bone, joint\n' +
                    '3: Extensive, deep ulcer(s)\n\n' +
                    'ISCHEMIA (I) Grade:\n' +
                    '0: ABI ≥0.80\n' +
                    '1: ABI 0.60-0.79\n' +
                    '2: ABI 0.40-0.59\n' +
                    '3: ABI <0.40\n\n' +
                    'FOOT INFECTION (fI) Grade:\n' +
                    '0: No infection\n' +
                    '1: Mild infection\n' +
                    '2: Moderate infection\n' +
                    '3: Severe infection\n\n' +
                    '🔬 Clinical Decision Support Tool'
                  );
                }}
              >
                <div className="font-medium text-blue-900">WIfI Classification</div>
                <div className="text-xs text-blue-600">Wound, Ischemia, foot Infection</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PV: Opening CLI Assessment Tool');
                  window.alert(
                    'Critical Limb Ischemia (CLI) Assessment\n\n' +
                    'RUTHERFORD CLASSIFICATION:\n' +
                    'Category 4: Ischemic rest pain\n' +
                    'Category 5: Minor tissue loss\n' +
                    'Category 6: Major tissue loss\n\n' +
                    'HEMODYNAMIC CRITERIA:\n' +
                    '• Ankle pressure <50 mmHg\n' +
                    '• Toe pressure <30 mmHg\n' +
                    '• TcPO2 <30 mmHg\n\n' +
                    'CLINICAL FEATURES:\n' +
                    '• Rest pain (Category 4)\n' +
                    '• Tissue loss (Categories 5-6)\n' +
                    '• Gangrene\n\n' +
                    'TREATMENT URGENCY:\n' +
                    '⚠️ Requires urgent revascularization evaluation\n' +
                    '🏥 Multidisciplinary team approach recommended'
                  );
                }}
              >
                <div className="font-medium text-red-900">CLI Assessment Tool</div>
                <div className="text-xs text-red-600">Critical limb ischemia evaluation</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PV: Opening PAD Guidelines');
                  window.alert(
                    'PAD Evidence-Based Guidelines (AHA/ACC 2023)\n\n' +
                    'SCREENING RECOMMENDATIONS:\n' +
                    '• Age >65 years\n' +
                    '• Age 50-64 with risk factors\n' +
                    '• Age <50 with diabetes + 1 risk factor\n\n' +
                    'DIAGNOSTIC TESTING:\n' +
                    '• Resting ABI (first-line)\n' +
                    '• Exercise ABI if resting normal\n' +
                    '• Duplex ultrasound for anatomic assessment\n\n' +
                    'MEDICAL THERAPY:\n' +
                    '• Antiplatelet therapy (aspirin or clopidogrel)\n' +
                    '• Statin therapy (high-intensity)\n' +
                    '• ACE inhibitor/ARB\n' +
                    '• Diabetes management (A1C <7%)\n\n' +
                    'SUPERVISED EXERCISE:\n' +
                    '• First-line for claudication\n' +
                    '• 12-week structured program\n\n' +
                    '📋 Class I Recommendations (Strong Evidence)'
                  );
                }}
              >
                <div className="font-medium text-amber-900">PAD Guidelines</div>
                <div className="text-xs text-amber-600">Evidence-based recommendations</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Multidisciplinary Consultation</div>
                <div className="text-xs text-purple-600">Team collaboration platform</div>
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
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-medical-amber-600" />
        PAD Documentation Support
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Documentation Alerts */}
        <div>
          <h4 className="font-semibold text-steel-900 mb-3">Documentation Alerts</h4>
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

            <div className="bg-medical-blue-50 border border-medical-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-medical-blue-600" />
                <span className="font-medium text-medical-blue-700">Follow-up Required</span>
              </div>
              <p className="text-sm text-medical-blue-600 mt-1">Patient Martinez, E. - 30-day post-procedure follow-up</p>
            </div>
          </div>
        </div>

        {/* Documentation Templates */}
        <div>
          <h4 className="font-semibold text-steel-900 mb-3">Quick Documentation Templates</h4>
          <div className="space-y-2">
            <button className="w-full text-left bg-white/60 border border-steel-200 rounded-lg p-3 hover:bg-white/80 transition-colors">
              <div className="font-medium text-steel-900">PAD Initial Assessment</div>
              <div className="text-sm text-steel-600">Complete peripheral vascular evaluation template</div>
            </button>
            
            <button className="w-full text-left bg-white/60 border border-steel-200 rounded-lg p-3 hover:bg-white/80 transition-colors">
              <div className="font-medium text-steel-900">ABI Documentation</div>
              <div className="text-sm text-steel-600">Ankle-brachial index measurement template</div>
            </button>
            
            <button className="w-full text-left bg-white/60 border border-steel-200 rounded-lg p-3 hover:bg-white/80 transition-colors">
              <div className="font-medium text-steel-900">Wound Care Assessment</div>
              <div className="text-sm text-steel-600">Comprehensive wound evaluation template</div>
            </button>
            
            <button className="w-full text-left bg-white/60 border border-steel-200 rounded-lg p-3 hover:bg-white/80 transition-colors">
              <div className="font-medium text-steel-900">Limb Salvage Protocol</div>
              <div className="text-sm text-steel-600">Critical limb ischemia management template</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
    id: 'workflow',
    label: 'PAD Optimization',
    icon: Target,
    description: 'PAD workflow optimization'
  },
  {
    id: 'safety',
    label: 'Limb Salvage',
    icon: Shield,
    description: 'Limb salvage protocols'
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
    documentation: PeripheralDocumentation
  }
};