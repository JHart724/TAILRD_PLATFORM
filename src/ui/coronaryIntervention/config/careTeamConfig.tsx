import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp, Timer } from 'lucide-react';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';

// Import Coronary Intervention specific components
import PCINetworkVisualization from '../components/PCINetworkVisualization';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';

// Coronary Intervention Dashboard Component
const CoronaryDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* PCI Metrics Overview */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-medical-red-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">247</div>
            <div className="text-sm text-steel-600">PCI Procedures MTD</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Timer className="w-8 h-8 text-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">78min</div>
            <div className="text-sm text-steel-600">Door-to-Balloon Time</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">94.2%</div>
            <div className="text-sm text-steel-600">PCI Success Rate</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">87%</div>
            <div className="text-sm text-steel-600">Cath Lab Utilization</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* PCI Network Visualization */}
    <PCINetworkVisualization />
  </div>
);

// Coronary Patients Component
const CoronaryPatients: React.FC = () => (
  <div className="space-y-6">
    {/* Patient Registry Table */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-red-600" />
          Coronary Intervention Patient Registry
        </h3>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-medical-red-100 text-medical-red-700 rounded-lg hover:bg-medical-red-200 transition-colors text-sm">
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
              <th className="text-left py-3 px-4 font-medium text-steel-700">Procedure</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Urgency</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">SYNTAX Score</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">D2B Time</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Provider</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'CI001', name: 'Robert Johnson', procedure: 'Primary PCI', urgency: 'STAT', syntax: '18', d2b: '72min', status: 'Complete', provider: 'Dr. Chen' },
              { id: 'CI002', name: 'Maria Rodriguez', procedure: 'Elective PCI', urgency: 'Elective', syntax: '12', d2b: 'N/A', status: 'Scheduled', provider: 'Dr. Martinez' },
              { id: 'CI003', name: 'David Wilson', procedure: 'Complex PCI', urgency: 'Urgent', syntax: '28', d2b: '85min', status: 'In Progress', provider: 'Dr. Thompson' },
              { id: 'CI004', name: 'Jennifer Lee', procedure: 'CTO PCI', urgency: 'Elective', syntax: '24', d2b: 'N/A', status: 'Planning', provider: 'Dr. Park' },
              { id: 'CI005', name: 'Michael Brown', procedure: 'NSTEMI PCI', urgency: 'Urgent', syntax: '15', d2b: '124min', status: 'Recovery', provider: 'Dr. Kim' }
            ].map((patient, index) => (
              <tr key={index} className="border-b border-steel-100 hover:bg-steel-50">
                <td className="py-3 px-4 font-mono text-steel-900">{patient.id}</td>
                <td className="py-3 px-4 text-steel-900">{patient.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.procedure.includes('Primary') ? 'bg-red-100 text-red-700' :
                    patient.procedure.includes('Complex') ? 'bg-orange-100 text-orange-700' :
                    patient.procedure.includes('CTO') ? 'bg-purple-100 text-purple-700' :
                    patient.procedure.includes('NSTEMI') ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {patient.procedure}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.urgency === 'STAT' ? 'bg-red-100 text-red-700' :
                    patient.urgency === 'Urgent' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {patient.urgency}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-steel-700">{patient.syntax}</td>
                <td className="py-3 px-4 font-mono text-steel-700">{patient.d2b}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === 'Complete' ? 'bg-green-100 text-green-700' :
                    patient.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'Scheduled' ? 'bg-purple-100 text-purple-700' :
                    patient.status === 'Planning' ? 'bg-orange-100 text-orange-700' :
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
    
    {/* Risk Assessment Tools */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <GRACEScoreCalculator />
      <TIMIScoreCalculator />
      <SYNTAXScoreCalculator />
    </div>
  </div>
);

// Coronary Workflow Component  
const CoronaryWorkflow: React.FC = () => (
  <div className="space-y-6">
    {/* PCI vs CABG Decision Support */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-red-600" />
        PCI vs CABG Decision Support & Workflow Optimization
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STEMI Pathway */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
            <h4 className="font-semibold text-steel-900 mb-4">STEMI Primary PCI Pathway</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-red-200">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <div className="font-medium text-steel-900">EMS/ED Activation</div>
                  <div className="text-sm text-steel-600">STEMI alert, 12-lead ECG, cath lab activation</div>
                </div>
                <div className="ml-auto text-sm text-red-600 font-medium">&lt;10 min</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div>
                  <div className="font-medium text-steel-900">Patient Preparation</div>
                  <div className="text-sm text-steel-600">IV access, antiplatelet loading, transfer to cath lab</div>
                </div>
                <div className="ml-auto text-sm text-orange-600 font-medium">&lt;20 min</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-red-200">
                <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div>
                  <div className="font-medium text-steel-900">Primary PCI</div>
                  <div className="text-sm text-steel-600">Coronary angiography and percutaneous intervention</div>
                </div>
                <div className="ml-auto text-sm text-red-600 font-medium">&lt;90 min</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <div>
                  <div className="font-medium text-steel-900">Post-PCI Care</div>
                  <div className="text-sm text-steel-600">ICU monitoring, DAPT, cardiac rehabilitation</div>
                </div>
                <div className="ml-auto text-sm text-green-600 font-medium">24-48h</div>
              </div>
            </div>
          </div>
          
          {/* Complex PCI Decision Tree */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Complex PCI vs CABG Decision Matrix</h4>
            <div className="space-y-3">
              {[
                { criteria: 'SYNTAX Score ≤22', pci: 'Preferred', cabg: 'Acceptable', color: 'green' },
                { criteria: 'SYNTAX Score 23-32', pci: 'Acceptable', cabg: 'Preferred', color: 'orange' },
                { criteria: 'SYNTAX Score ≥33', pci: 'Consider', cabg: 'Preferred', color: 'red' },
                { criteria: 'Left Main Disease', pci: 'Acceptable*', cabg: 'Preferred', color: 'orange' },
                { criteria: 'CTO Present', pci: 'Specialist Required', cabg: 'Consider', color: 'purple' }
              ].map((decision, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 p-3 bg-steel-50 rounded-lg">
                  <span className="text-steel-700 font-medium">{decision.criteria}</span>
                  <span className={`text-center px-2 py-1 rounded text-xs font-medium ${
                    decision.pci === 'Preferred' ? 'bg-green-100 text-green-700' :
                    decision.pci === 'Acceptable' ? 'bg-blue-100 text-blue-700' :
                    decision.pci === 'Acceptable*' ? 'bg-orange-100 text-orange-700' :
                    decision.pci === 'Specialist Required' ? 'bg-purple-100 text-purple-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    PCI: {decision.pci}
                  </span>
                  <span className={`text-center px-2 py-1 rounded text-xs font-medium ${
                    decision.cabg === 'Preferred' ? 'bg-green-100 text-green-700' :
                    decision.cabg === 'Acceptable' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    CABG: {decision.cabg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Workflow Metrics */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-red-600" />
              Performance Metrics
            </h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">78min</div>
                <div className="text-xs text-red-700">Door-to-Balloon</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">94.2%</div>
                <div className="text-xs text-green-700">PCI Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">87%</div>
                <div className="text-xs text-blue-700">Cath Lab Utilization</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">21.4</div>
                <div className="text-xs text-purple-700">Avg SYNTAX Score</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
);

// Coronary Safety Component
const CoronarySafety: React.FC = () => (
  <div className="space-y-6">
    {/* Coronary Safety Screening */}
    <CoronarySafetyScreening />
  </div>
);

// Coronary Clinical Collaboration Component
const CoronaryClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Consultation Workflows */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-red-600" />
        Clinical Consultation & Decision Support Workflows
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Consultation Teams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Multidisciplinary Clinical Team</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Dr. Sarah Chen', role: 'Interventional Cardiology', specialty: 'Complex PCI Lead', expertise: 'Clinical Decision Making', collaborations: 340 },
                { name: 'Dr. Michael Rodriguez', role: 'Interventional Cardiology', specialty: 'STEMI Program', expertise: 'Emergency Protocols', collaborations: 298 },
                { name: 'Dr. Jennifer Kim', role: 'Interventional Cardiology', specialty: 'CTO Specialist', expertise: 'Technical Assessment', collaborations: 186 },
                { name: 'Dr. Robert Thompson', role: 'Cardiac Anesthesia', specialty: 'High-Risk PCI', expertise: 'Risk Stratification', collaborations: 245 },
                { name: 'Dr. Lisa Park', role: 'Cardiac Surgery', specialty: 'Heart Team', expertise: 'Surgical Consultation', collaborations: 124 },
                { name: 'Dr. David Wilson', role: 'Heart Failure', specialty: 'Cardiogenic Shock', expertise: 'Medical Optimization', collaborations: 89 },
                { name: 'Maria Gonzalez, RN', role: 'Clinical Coordinator', specialty: 'Care Pathways', expertise: 'Patient Navigation', collaborations: 425 },
                { name: 'James Miller, CVT', role: 'Clinical Specialist', specialty: 'Procedure Planning', expertise: 'Technical Support', collaborations: 387 }
              ].map((member, index) => (
                <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                  <div className="mb-2">
                    <div className="font-medium text-steel-900">{member.name}</div>
                  </div>
                  <div className="text-sm text-steel-700">{member.role}</div>
                  <div className="text-xs text-steel-600">{member.specialty}</div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">{member.expertise}</div>
                  <div className="mt-2">
                    <span className="text-xs text-steel-500">{member.collaborations} clinical consultations YTD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Clinical Decision Pathways */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Evidence-Based Clinical Pathways
            </h4>
            <div className="space-y-3">
              {[
                { pathway: 'STEMI Clinical Protocol', indication: 'ST-Elevation MI', evidence: 'Class I Recommendation', consultation: 'Heart Team Required' },
                { pathway: 'Complex PCI Evaluation', indication: 'High SYNTAX Score', evidence: 'Guideline Directed', consultation: 'Multidisciplinary Review' },
                { pathway: 'CTO Assessment Protocol', indication: 'Chronic Total Occlusion', evidence: 'Expert Consensus', consultation: 'Specialist Consultation' },
                { pathway: 'Cardiogenic Shock Pathway', indication: 'Hemodynamic Compromise', evidence: 'Emergency Protocol', consultation: 'Immediate Consultation' }
              ].map((pathway, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                  pathway.indication === 'ST-Elevation MI' ? 'bg-red-50 border-red-200' :
                  pathway.indication === 'High SYNTAX Score' ? 'bg-orange-50 border-orange-200' :
                  pathway.indication === 'Chronic Total Occlusion' ? 'bg-purple-50 border-purple-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div>
                    <div className={`font-medium ${
                      pathway.indication === 'ST-Elevation MI' ? 'text-red-900' :
                      pathway.indication === 'High SYNTAX Score' ? 'text-orange-900' :
                      pathway.indication === 'Chronic Total Occlusion' ? 'text-purple-900' :
                      'text-blue-900'
                    }`}>
                      {pathway.pathway}
                    </div>
                    <div className="text-sm text-steel-600">
                      {pathway.indication} • {pathway.evidence}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    pathway.indication === 'ST-Elevation MI' ? 'bg-red-100 text-red-700' :
                    pathway.indication === 'High SYNTAX Score' ? 'bg-orange-100 text-orange-700' :
                    pathway.indication === 'Chronic Total Occlusion' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {pathway.consultation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Clinical Quality Metrics */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Clinical Quality Outcomes</h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">94.2%</div>
                <div className="text-xs text-green-700">Clinical Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-xs text-blue-700">Guideline Adherence</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">96%</div>
                <div className="text-xs text-purple-700">Heart Team Consensus</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">2.1%</div>
                <div className="text-xs text-orange-700">Clinical Complications</div>
              </div>
            </div>
          </div>
          
          {/* Active Clinical Consultations */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Active Clinical Consultations
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="font-medium text-red-900">STEMI Consultation</div>
                <div className="text-sm text-red-700">Complex case requiring heart team input</div>
                <div className="text-xs text-red-600">Multidisciplinary review scheduled</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="font-medium text-orange-900">CTO Assessment</div>
                <div className="text-sm text-orange-700">Patient evaluation for chronic total occlusion</div>
                <div className="text-xs text-orange-600">Specialist consultation pending</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-900">Treatment Planning</div>
                <div className="text-sm text-blue-700">Evidence-based protocol review</div>
                <div className="text-xs text-blue-600">Clinical guidelines assessment</div>
              </div>
            </div>
          </div>
          
          {/* Clinical Decision Support Tools */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Clinical Decision Support</h4>
            <div className="space-y-2">
              <button 
                className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PCI: Opening STEMI Protocol Guidance');
                  window.alert(
                    'STEMI Protocol Guidelines (AHA/ACC 2023)\n\n' +
                    'DOOR-TO-BALLOON TARGETS:\n' +
                    '• Goal: <90 minutes\n' +
                    '• Quality benchmark: <75 minutes\n\n' +
                    'TREATMENT ALGORITHM:\n' +
                    '1. ECG within 10 minutes of arrival\n' +
                    '2. Cath lab activation immediately\n' +
                    '3. Dual antiplatelet loading\n' +
                    '4. Anticoagulation per protocol\n' +
                    '5. Primary PCI preferred if D2B <120 min\n\n' +
                    'ANTIPLATELET THERAPY:\n' +
                    '• ASA 325mg loading dose\n' +
                    '• P2Y12 inhibitor (Ticagrelor preferred)\n\n' +
                    'ANTICOAGULATION:\n' +
                    '• Bivalirudin or Heparin + GPI\n' +
                    '• Radial access preferred\n\n' +
                    '⚠️ URGENT: Time-sensitive intervention required\n' +
                    '🏥 Activate STEMI team immediately'
                  );
                }}
              >
                <div className="font-medium text-red-900">STEMI Protocol Guidance</div>
                <div className="text-xs text-red-600">Evidence-based treatment pathway</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PCI: Opening Risk Assessment Tools');
                  window.alert(
                    'PCI Risk Assessment Tools\n\n' +
                    'SYNTAX SCORE:\n' +
                    '• Low: ≤22 (PCI preferred)\n' +
                    '• Intermediate: 23-32 (PCI or CABG)\n' +
                    '• High: ≥33 (CABG preferred)\n\n' +
                    'CHA₂DS₂-VASc (if AFib):\n' +
                    '• Stroke risk assessment\n' +
                    '• Anticoagulation decisions\n\n' +
                    'GRACE SCORE:\n' +
                    '• In-hospital mortality risk\n' +
                    '• 6-month mortality prediction\n\n' +
                    'TIMI RISK SCORE:\n' +
                    '• 14-day composite endpoint\n' +
                    '• Guides early invasive strategy\n\n' +
                    'BLEEDING RISK:\n' +
                    '• HAS-BLED score\n' +
                    '• CRUSADE bleeding score\n\n' +
                    '🔬 Clinical Decision Support Tools'
                  );
                }}
              >
                <div className="font-medium text-orange-900">Risk Assessment Tools</div>
                <div className="text-xs text-orange-600">Clinical risk stratification</div>
              </button>
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Guideline Recommendations</div>
                <div className="text-xs text-blue-600">Current clinical guidelines</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Multidisciplinary Consultation</div>
                <div className="text-xs text-purple-600">Heart team collaboration</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Coronary Documentation Component
const CoronaryDocumentation: React.FC = () => (
  <div className="space-y-6">
    {/* PCI Documentation & Quality Registry */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-medical-red-600" />
        PCI Documentation & Quality Registry
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
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">NCDR CathPCI Registry</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">OVERDUE</span>
                </div>
                <div className="text-sm text-red-700">CI001 STEMI case - registry data incomplete after 72h</div>
                <div className="text-xs text-red-600 mt-1">Door-to-balloon time and complications missing</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-amber-900">Procedure Notes Due</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">DUE TODAY</span>
                </div>
                <div className="text-sm text-amber-700">3 elective PCI cases require operative reports</div>
                <div className="text-xs text-amber-600 mt-1">Due within 24h of procedure completion</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">Quality Metrics Review</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">PENDING</span>
                </div>
                <div className="text-sm text-orange-700">Door-to-balloon times require monthly review and analysis</div>
                <div className="text-xs text-orange-600 mt-1">Quality committee meeting: Friday 2 PM</div>
              </div>
            </div>
          </div>
          
          {/* Documentation Compliance */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Documentation Compliance</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-900">NCDR Registry Completeness</div>
                  <div className="text-sm text-green-700">Data quality score</div>
                </div>
                <div className="text-2xl font-bold text-green-600">92.8%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-900">Timely Documentation</div>
                  <div className="text-sm text-blue-700">Within 24h completion</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">89.4%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-900">Template Utilization</div>
                  <div className="text-sm text-purple-700">Standardized notes</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">95.2%</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Documentation Templates & Tools */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">PCI Documentation Templates</h4>
            <div className="grid grid-cols-1 gap-3">
              {[
                { template: 'STEMI Primary PCI Report', time: '~6 min', color: 'red', priority: 'urgent' },
                { template: 'Elective PCI Procedure Note', time: '~5 min', color: 'blue', priority: 'high' },
                { template: 'Complex PCI Report', time: '~8 min', color: 'purple', priority: 'high' },
                { template: 'CTO Intervention Note', time: '~10 min', color: 'indigo', priority: 'medium' },
                { template: 'Pre-procedure Assessment', time: '~4 min', color: 'orange', priority: 'high' },
                { template: 'Post-procedure Orders', time: '~3 min', color: 'emerald', priority: 'medium' }
              ].map((template, index) => (
                <button key={index} className={`p-3 text-left bg-${template.color}-50 hover:bg-${template.color}-100 rounded-lg transition-colors border border-${template.color}-200`}>
                  <div className="flex items-center justify-between">
                    <div className={`font-medium text-${template.color}-900`}>{template.template}</div>
                    {template.priority === 'urgent' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">URGENT</span>
                    )}
                    {template.priority === 'high' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">HIGH</span>
                    )}
                  </div>
                  <div className={`text-xs text-${template.color}-600`}>Estimated completion: {template.time}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Recent Documentation Activity</h4>
            <div className="space-y-3">
              {[
                { action: 'STEMI Registry Entry', patient: 'CI001', provider: 'Dr. Chen', time: '8 min ago', status: 'Complete' },
                { action: 'Complex PCI Report', patient: 'CI003', provider: 'Dr. Rodriguez', time: '22 min ago', status: 'Complete' },
                { action: 'Pre-procedure Note', patient: 'CI004', provider: 'Dr. Kim', time: '35 min ago', status: 'In Progress' },
                { action: 'Quality Review', patient: 'Monthly', provider: 'M. Gonzalez', time: '1.1 hr ago', status: 'Pending' }
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
          
          {/* Quality & Registry Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Registry & Quality Actions</h4>
            <div className="space-y-2">
              <button 
                className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PCI: Opening NCDR Registry System');
                  window.alert(
                    'NCDR CathPCI Registry\n\n' +
                    'CURRENT STATUS:\n' +
                    '⚠️ 1 case overdue (due: 2 days ago)\n' +
                    '🟡 3 cases due today\n' +
                    '✅ 12 cases completed this week\n\n' +
                    'REQUIRED DATA ELEMENTS:\n' +
                    '• Patient demographics & comorbidities\n' +
                    '• Procedure details & devices used\n' +
                    '• Medications at discharge\n' +
                    '• Procedural outcomes & complications\n\n' +
                    'SUBMISSION DEADLINES:\n' +
                    '• Elective PCI: 30 days\n' +
                    '• STEMI PCI: 60 days\n' +
                    '• Quality measure cases: 90 days\n\n' +
                    'NEXT ACTIONS:\n' +
                    '1. Complete overdue case #PCI-2024-1247\n' +
                    '2. Update today\'s cases (#1248-1250)\n' +
                    '3. Verify discharge medications\n\n' +
                    '📋 NCDR Registry Compliance Required'
                  );
                }}
              >
                <div className="font-medium text-red-900">Complete NCDR Entries</div>
                <div className="text-xs text-red-600">1 case overdue, 3 cases due today</div>
              </button>
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Generate Quality Report</div>
                <div className="text-xs text-blue-600">Monthly PCI outcomes summary</div>
              </button>
              <button 
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={() => {
                  console.log('PCI: Opening Door-to-Balloon Analysis');
                  window.alert(
                    'Door-to-Balloon Time Analysis\n\n' +
                    'CURRENT PERFORMANCE (YTD):\n' +
                    '✅ Average D2B: 73 minutes\n' +
                    '✅ Goal <90 min: 94.2% compliance\n' +
                    '✅ Benchmark <75 min: 87.3% compliance\n\n' +
                    'MONTHLY BREAKDOWN:\n' +
                    '• Oct 2024: 71 min (n=23)\n' +
                    '• Sep 2024: 76 min (n=31)\n' +
                    '• Aug 2024: 74 min (n=28)\n\n' +
                    'PROCESS METRICS:\n' +
                    '• ECG to decision: 12 min\n' +
                    '• Decision to cath lab: 18 min\n' +
                    '• Cath lab to first device: 43 min\n\n' +
                    'QUALITY INITIATIVES:\n' +
                    '• Pre-hospital ECG program\n' +
                    '• Single-call activation system\n' +
                    '• 24/7 interventional team\n\n' +
                    'OUTLIERS TO REVIEW:\n' +
                    '⚠️ 2 cases >120 minutes (investigate)\n\n' +
                    '📊 Quality Improvement Dashboard'
                  );
                }}
              >
                <div className="font-medium text-purple-900">Door-to-Balloon Analysis</div>
                <div className="text-xs text-purple-600">STEMI performance review</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
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

// Coronary Intervention Care Team Tab Configuration
const coronaryTabs: StandardTabConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Users,
    description: 'PCI and CABG overview'
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: Users,
    description: 'Coronary patient census'
  },
  {
    id: 'workflow',
    label: 'CABG Optimization',
    icon: Heart,
    description: 'Coronary bypass optimization'
  },
  {
    id: 'safety',
    label: 'Clinical Screening',
    icon: Shield,
    description: 'Coronary clinical screening'
  },
  {
    id: 'team',
    label: 'Clinical Collaboration',
    icon: Users,
    description: 'Clinical consultation and decision support'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: AlertTriangle,
    description: 'Coronary documentation'
  }
];

// Coronary Intervention Care Team Configuration
export const coronaryCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Coronary Intervention',
  moduleDescription: 'Comprehensive coronary intervention care coordination, PCI optimization, and CABG workflows',
  moduleIcon: Heart,
  primaryColor: 'medical-red',
  tabs: coronaryTabs,
  tabContent: {
    dashboard: CoronaryDashboard,
    patients: CoronaryPatients,
    workflow: CoronaryWorkflow,
    safety: CoronarySafety,
    team: CoronaryClinicalCollaboration,
    documentation: CoronaryDocumentation
  }
};