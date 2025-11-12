import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Gauge, Target } from 'lucide-react';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';

// Import Valvular Disease specific components
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';
import { apiService } from '../../../services/apiService';
import STSRiskCalculator from '../../../components/riskCalculators/STSRiskCalculator';
import { featureFlags } from '../../../config/featureFlags';

// Valvular Disease Dashboard Component
const ValvularDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* Valve Disease Metrics Overview */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-medical-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">1,784</div>
            <div className="text-sm text-steel-600">Valve Disease Patients</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">89%</div>
            <div className="text-sm text-steel-600">Heart Team Utilization</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">32d</div>
            <div className="text-sm text-steel-600">Avg Time to Surgery</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">96.4%</div>
            <div className="text-sm text-steel-600">Surgical Success Rate</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Surgical Network Visualization */}
    <ValvularSurgicalNetworkVisualization />
  </div>
);

// Valvular Patients Component
const ValvularPatients: React.FC = () => (
  <div className="space-y-6">
    {/* Patient Registry Table */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-blue-600" />
          Valvular Disease Patient Registry
        </h3>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-medical-blue-100 text-medical-blue-700 rounded-lg hover:bg-medical-blue-200 transition-colors text-sm">
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
              <th className="text-left py-3 px-4 font-medium text-steel-700">Valve Type</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Severity</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">STS Score</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Surgery Type</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Provider</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'VD001', name: 'Margaret Thompson', valve: 'Aortic', severity: 'Severe', sts: '4.2%', surgery: 'TAVR', status: 'Scheduled', provider: 'Dr. Williams' },
              { id: 'VD002', name: 'Robert Chen', valve: 'Mitral', severity: 'Moderate', sts: '6.8%', surgery: 'Repair', status: 'Planning', provider: 'Dr. Martinez' },
              { id: 'VD003', name: 'Sarah Wilson', valve: 'Aortic', severity: 'Critical', sts: '12.4%', surgery: 'SAVR', status: 'Heart Team', provider: 'Dr. Thompson' },
              { id: 'VD004', name: 'James Rodriguez', valve: 'Tricuspid', severity: 'Severe', sts: '8.9%', surgery: 'Replacement', status: 'Pre-op', provider: 'Dr. Park' },
              { id: 'VD005', name: 'Lisa Anderson', valve: 'Aortic', severity: 'Severe', sts: '3.1%', surgery: 'Ross', status: 'Consult', provider: 'Dr. Chen' }
            ].map((patient, index) => (
              <tr key={index} className="border-b border-steel-100 hover:bg-steel-50">
                <td className="py-3 px-4 font-mono text-steel-900">{patient.id}</td>
                <td className="py-3 px-4 text-steel-900">{patient.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.valve === 'Aortic' ? 'bg-red-100 text-red-700' :
                    patient.valve === 'Mitral' ? 'bg-blue-100 text-blue-700' :
                    patient.valve === 'Tricuspid' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {patient.valve}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    patient.severity === 'Severe' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {patient.severity}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-steel-700">{patient.sts}</td>
                <td className="py-3 px-4 text-steel-700">{patient.surgery}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === 'Scheduled' ? 'bg-green-100 text-green-700' :
                    patient.status === 'Planning' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'Heart Team' ? 'bg-purple-100 text-purple-700' :
                    patient.status === 'Pre-op' ? 'bg-orange-100 text-orange-700' :
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
    
    {/* Valve Patient Risk Heatmap */}
    <ValvePatientHeatmap />
  </div>
);

// Valvular Workflow Component  
const ValvularWorkflow: React.FC = () => (
  <div className="space-y-6">
    {/* Valve Decision Support Workflow */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-blue-600" />
        Valve Decision Support & Surgical Planning
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Pathway */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-steel-900 mb-4">TAVR vs SAVR Decision Pathway</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <div className="font-medium text-steel-900">Echo & Clinical Assessment</div>
                  <div className="text-sm text-steel-600">Valve morphology, severity, function</div>
                </div>
                <div className="ml-auto text-sm text-blue-600 font-medium">2-3 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div>
                  <div className="font-medium text-steel-900">STS Risk Assessment</div>
                  <div className="text-sm text-steel-600">Risk stratification for surgical planning</div>
                </div>
                <div className="ml-auto text-sm text-purple-600 font-medium">1-2 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-indigo-200">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div>
                  <div className="font-medium text-steel-900">Heart Team Conference</div>
                  <div className="text-sm text-steel-600">Multidisciplinary treatment planning</div>
                </div>
                <div className="ml-auto text-sm text-indigo-600 font-medium">7-14 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-emerald-200">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <div>
                  <div className="font-medium text-steel-900">Surgical Planning & Scheduling</div>
                  <div className="text-sm text-steel-600">CT planning for TAVR, surgical prep for SAVR</div>
                </div>
                <div className="ml-auto text-sm text-emerald-600 font-medium">14-21 days</div>
              </div>
            </div>
          </div>
          
          {/* Active Cases Tracking */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Active Cases in Pipeline</h4>
            <div className="space-y-3">
              {[
                { stage: 'Echo Review', count: 23, color: 'blue' },
                { stage: 'Heart Team Pending', count: 8, color: 'purple' },
                { stage: 'Surgical Planning', count: 12, color: 'indigo' },
                { stage: 'Scheduled for Surgery', count: 15, color: 'emerald' }
              ].map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                  <span className="text-steel-700">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-${stage.color}-600 font-bold`}>{stage.count}</span>
                    <div className={`w-3 h-3 bg-${stage.color}-500 rounded-full`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Decision Metrics */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-600" />
              Decision Metrics
            </h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.8:1</div>
                <div className="text-xs text-blue-700">SAVR:TAVR Ratio</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">89%</div>
                <div className="text-xs text-purple-700">Heart Team Utilization</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">32d</div>
                <div className="text-xs text-emerald-700">Avg Time to Surgery</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">6.8%</div>
                <div className="text-xs text-orange-700">Avg STS Score</div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Schedule Heart Team</div>
                <div className="text-xs text-blue-600">Next available: Tomorrow 2 PM</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Review STS Scores</div>
                <div className="text-xs text-purple-600">8 pending assessments</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">Update Surgery Schedule</div>
                <div className="text-xs text-emerald-600">15 cases pending</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Valvular Safety Component
const ValvularSafety: React.FC = () => (
  <div className="space-y-6">
    {/* Safety Screening & Risk Management */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-blue-600" />
        Valvular Surgery Safety Protocols & Risk Screening
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Alerts & Screening */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
            <h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Active Safety Alerts
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">High STS Risk Patient</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">URGENT</span>
                </div>
                <div className="text-sm text-red-700">Patient VD003: STS Score 12.4% - Consider TAVR evaluation</div>
                <div className="text-xs text-red-600 mt-1">Last updated: 15 mins ago</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">Pre-op Clearance Pending</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">PENDING</span>
                </div>
                <div className="text-sm text-orange-700">3 patients awaiting cardiac catheterization clearance</div>
                <div className="text-xs text-orange-600 mt-1">Next available slot: Tomorrow 9 AM</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-yellow-900">Anticoagulation Review</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">REVIEW</span>
                </div>
                <div className="text-sm text-yellow-700">5 post-op patients due for INR monitoring</div>
                <div className="text-xs text-yellow-600 mt-1">Due within 48 hours</div>
              </div>
            </div>
          </div>
          
          {/* Safety Metrics */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Safety Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">96.4%</div>
                <div className="text-xs text-green-700">Surgery Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">3.6%</div>
                <div className="text-xs text-blue-700">Complication Rate</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">98.2%</div>
                <div className="text-xs text-purple-700">Pre-op Screening</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">92.3%</div>
                <div className="text-xs text-emerald-700">INR Compliance</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Risk Stratification & Protocols */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Risk Stratification Protocol</h4>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900">Low Risk (STS &lt;4%)</span>
                  <span className="text-sm font-bold text-green-600">67 patients</span>
                </div>
                <div className="text-sm text-green-700">Standard surgical candidates • SAVR preferred • Expected LOS: 4-6 days</div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-yellow-900">Intermediate Risk (STS 4-8%)</span>
                  <span className="text-sm font-bold text-yellow-600">43 patients</span>
                </div>
                <div className="text-sm text-yellow-700">Heart team evaluation • TAVR vs SAVR decision • Enhanced monitoring</div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">High Risk (STS 8-15%)</span>
                  <span className="text-sm font-bold text-orange-600">28 patients</span>
                </div>
                <div className="text-sm text-orange-700">TAVR preferred • ICU optimization • Extended monitoring</div>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">Prohibitive Risk (STS &gt;15%)</span>
                  <span className="text-sm font-bold text-red-600">8 patients</span>
                </div>
                <div className="text-sm text-red-700">Medical therapy • Palliative care consult • Quality of life focus</div>
              </div>
            </div>
          </div>
          
          {/* Safety Checklist */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Pre-operative Safety Checklist</h4>
            <div className="space-y-2">
              {[
                { item: 'Cardiac catheterization completed', status: 'complete' },
                { item: 'Pulmonary function tests', status: 'complete' },
                { item: 'Carotid duplex screening', status: 'pending' },
                { item: 'Dental clearance obtained', status: 'complete' },
                { item: 'Blood bank type & crossmatch', status: 'pending' },
                { item: 'Anesthesia consultation', status: 'complete' },
                { item: 'Patient education completed', status: 'complete' },
                { item: 'Anticoagulation plan established', status: 'pending' }
              ].map((check, index) => (
                <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                  check.status === 'complete' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    check.status === 'complete' ? 'bg-green-500' : 'bg-orange-500'
                  }`}>
                    {check.status === 'complete' ? (
                      <UserCheck className="w-3 h-3 text-white" />
                    ) : (
                      <Clock className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    check.status === 'complete' ? 'text-green-900' : 'text-orange-900'
                  }`}>
                    {check.item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Valvular Clinical Collaboration Component
const ValvularClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Collaboration & Heart Team */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-blue-600" />
        Valvular Disease Clinical Collaboration & Heart Team
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Team Collaboration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Multidisciplinary Heart Team</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Dr. Sarah Williams', role: 'Interventional Cardiology', specialty: 'TAVR Clinical Lead', expertise: 'Transcatheter Valve Therapy', consultations: 123 },
                { name: 'Dr. Michael Chen', role: 'Cardiac Surgery', specialty: 'SAVR/Mitral Lead', expertise: 'Surgical Valve Repair', consultations: 131 },
                { name: 'Dr. Jennifer Martinez', role: 'Cardiac Imaging', specialty: 'Valve Assessment', expertise: 'Echocardiographic Evaluation', consultations: 218 },
                { name: 'Dr. Robert Thompson', role: 'Cardiac Anesthesia', specialty: 'Perioperative Care', expertise: 'Risk Assessment', consultations: 128 },
                { name: 'Dr. Lisa Park', role: 'Heart Failure', specialty: 'Medical Optimization', expertise: 'Functional Assessment', consultations: 115 },
                { name: 'Sarah Johnson, RN', role: 'Valve Coordinator', specialty: 'Patient Navigation', expertise: 'Clinical Pathways', consultations: 242 }
              ].map((member, index) => (
                <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                  <div className="mb-2">
                    <div className="font-medium text-steel-900">{member.name}</div>
                  </div>
                  <div className="text-sm text-steel-700">{member.role}</div>
                  <div className="text-xs text-steel-600">{member.specialty}</div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">{member.expertise}</div>
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
              <Heart className="w-5 h-5 text-blue-600" />
              Evidence-Based Clinical Decision Pathways
            </h4>
            <div className="space-y-3">
              {[
                { pathway: 'Aortic Valve Replacement Decision Algorithm', indication: 'Severe Aortic Stenosis', evidence: 'AHA/ACC Guidelines', consultation: 'Heart Team Required' },
                { pathway: 'Mitral Valve Intervention Protocol', indication: 'Severe Mitral Regurgitation', evidence: 'Expert Consensus', consultation: 'Multidisciplinary Review' },
                { pathway: 'Tricuspid Valve Assessment Framework', indication: 'Severe Tricuspid Regurgitation', evidence: 'Clinical Evidence', consultation: 'Specialized Consultation' },
                { pathway: 'Risk Stratification Protocol', indication: 'High-Risk Patients', evidence: 'STS Guidelines', consultation: 'Risk Assessment Team' }
              ].map((pathway, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                  pathway.indication === 'Severe Aortic Stenosis' ? 'bg-red-50 border-red-200' :
                  pathway.indication === 'Severe Mitral Regurgitation' ? 'bg-blue-50 border-blue-200' :
                  pathway.indication === 'Severe Tricuspid Regurgitation' ? 'bg-green-50 border-green-200' :
                  'bg-orange-50 border-orange-200'
                }`}>
                  <div>
                    <div className={`font-medium ${
                      pathway.indication === 'Severe Aortic Stenosis' ? 'text-red-900' :
                      pathway.indication === 'Severe Mitral Regurgitation' ? 'text-blue-900' :
                      pathway.indication === 'Severe Tricuspid Regurgitation' ? 'text-green-900' :
                      'text-orange-900'
                    }`}>
                      {pathway.pathway}
                    </div>
                    <div className="text-sm text-steel-600">
                      {pathway.indication} • {pathway.evidence}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    pathway.indication === 'Severe Aortic Stenosis' ? 'bg-red-100 text-red-700' :
                    pathway.indication === 'Severe Mitral Regurgitation' ? 'bg-blue-100 text-blue-700' :
                    pathway.indication === 'Severe Tricuspid Regurgitation' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
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
                <div className="text-xs text-blue-700">Heart Team Consensus</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">3.6%</div>
                <div className="text-xs text-purple-700">Clinical Complications</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">98%</div>
                <div className="text-xs text-emerald-700">Guideline Adherence</div>
              </div>
            </div>
          </div>
          
          {/* Active Clinical Consultations */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Active Clinical Consultations</h4>
            <div className="space-y-3">
              {[
                { consultation: 'TAVR vs SAVR Decision', patient: 'VD001', status: 'Risk Assessment', urgency: 'routine' },
                { consultation: 'Mitral Valve Repair Assessment', patient: 'VD003', status: 'Echo Evaluation', urgency: 'priority' },
                { consultation: 'Complex Valve Disease', patient: 'VD002', status: 'Heart Team Review', urgency: 'urgent' },
                { consultation: 'Tricuspid Intervention Planning', patient: 'VD004', status: 'Feasibility Assessment', urgency: 'routine' }
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
                onClick={async () => {
                  console.log('Valvular Disease: Opening STS Risk Calculator - calling automated API');
                  try {
                    const response = await apiService.getAutomatedSTSRisk('HF001');
                    if (response.success && response.data) {
                      const { predictedMortality, riskCategory, recommendation, components } = response.data as any;
                      window.alert(
                        `STS Risk Automated Calculator Results\n\n` +
                        `Patient: HF001\n` +
                        `Predicted Mortality: ${predictedMortality}%\n` +
                        `Risk Category: ${riskCategory}\n\n` +
                        `Clinical Recommendation:\n${recommendation}\n\n` +
                        `Risk Components (auto-calculated from EHR):\n` +
                        `• Age: ${components.age} years\n` +
                        `• Sex: ${components.sex}\n` +
                        `• Ejection Fraction: ${components.ef}%\n` +
                        `• Creatinine: ${components.creatinine} mg/dL\n` +
                        `• Diabetes: ${components.diabetes ? 'Yes' : 'No'}\n` +
                        `• Chronic Lung Disease: ${components.chronicLung ? 'Yes' : 'No'}\n` +
                        `• Previous CV Surgery: ${components.previousCV ? 'Yes' : 'No'}\n` +
                        `• NYHA Class: ${components.nyhaClass}\n\n` +
                        `🩺 STS PROM Model 2023\n` +
                        `✅ Data automatically retrieved from EHR`
                      );
                    }
                  } catch (error) {
                    console.error('STS Risk Calculator error:', error);
                    window.alert('STS Risk Calculator - Error connecting to backend. Please try again.');
                  }
                }}
              >
                <div className="font-medium text-blue-900">STS Risk Calculator</div>
                <div className="text-xs text-blue-600">Surgical risk assessment</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Valve Decision Framework</div>
                <div className="text-xs text-purple-600">Evidence-based selection</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">Clinical Guidelines</div>
                <div className="text-xs text-emerald-600">AHA/ACC/ESC recommendations</div>
              </button>
              <button className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <div className="font-medium text-orange-900">Heart Team Consultation</div>
                <div className="text-xs text-orange-600">Multidisciplinary case review</div>
              </button>
            </div>
          </div>
          
          {/* STS Risk Calculator */}
          {featureFlags.riskCalculators.stsRisk && (
            <STSRiskCalculator 
              age={68}
              sex="female"
              hasDiabetes={false}
              hasDialysis={false}
              hasHypertension={true}
              hasPriorCardiacSurgery={true}
              ejectionFraction={45}
              procedureType="Surgical AVR"
              hasChronicLungDisease={true}
              hasCarotidDisease={false}
              hasPVD={false}
              creatinine={1.1}
              nyhaClass="II"
            />
          )}
        </div>
      </div>
    </div>
  </div>
);

// Valvular Documentation Component
const ValvularDocumentation: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Documentation & Alerts */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-medical-blue-600" />
        Clinical Documentation & Alerts
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentation Alerts */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100">
            <h4 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Documentation Alerts & Reminders
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-amber-900">Pre-op H&P Due</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">DUE TODAY</span>
                </div>
                <div className="text-sm text-amber-700">5 patients scheduled for surgery this week missing H&P</div>
                <div className="text-xs text-amber-600 mt-1">Required within 24h of surgery</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">Post-op Notes Pending</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">OVERDUE</span>
                </div>
                <div className="text-sm text-orange-700">3 surgical cases from yesterday missing operative notes</div>
                <div className="text-xs text-orange-600 mt-1">Due within 24h post-procedure</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">Discharge Summary</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">URGENT</span>
                </div>
                <div className="text-sm text-red-700">Patient VD001 discharged 48h ago - summary incomplete</div>
                <div className="text-xs text-red-600 mt-1">Affects quality metrics</div>
              </div>
            </div>
          </div>
          
          {/* Documentation Templates */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Quick Documentation Templates</h4>
            <div className="grid grid-cols-1 gap-3">
              {[
                { template: 'TAVR Pre-procedure Note', time: '~3 min', color: 'blue' },
                { template: 'Heart Team Decision Note', time: '~5 min', color: 'purple' },
                { template: 'SAVR Operative Report', time: '~8 min', color: 'indigo' },
                { template: 'Post-op Discharge Summary', time: '~4 min', color: 'emerald' },
                { template: 'Valve Clinic Follow-up', time: '~2 min', color: 'orange' }
              ].map((template, index) => (
                <button key={index} className={`p-3 text-left bg-${template.color}-50 hover:bg-${template.color}-100 rounded-lg transition-colors border border-${template.color}-200`}>
                  <div className={`font-medium text-${template.color}-900`}>{template.template}</div>
                  <div className={`text-xs text-${template.color}-600`}>Estimated completion: {template.time}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Documentation Metrics & Compliance */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Documentation Compliance</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-900">On-time Completion</div>
                  <div className="text-sm text-green-700">Last 30 days</div>
                </div>
                <div className="text-2xl font-bold text-green-600">94.2%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-900">Template Utilization</div>
                  <div className="text-sm text-blue-700">Standardized notes</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">87.8%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-900">Quality Score</div>
                  <div className="text-sm text-purple-700">Documentation quality</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">96.1%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div>
                  <div className="font-medium text-orange-900">Avg Completion Time</div>
                  <div className="text-sm text-orange-700">Per documentation</div>
                </div>
                <div className="text-2xl font-bold text-orange-600">4.2min</div>
              </div>
            </div>
          </div>
          
          {/* Recent Documentation Activity */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Recent Documentation Activity</h4>
            <div className="space-y-3">
              {[
                { action: 'TAVR Procedure Note', patient: 'VD001', provider: 'Dr. Williams', time: '15 min ago', status: 'Complete' },
                { action: 'Heart Team Decision', patient: 'VD003', provider: 'Dr. Chen', time: '32 min ago', status: 'Complete' },
                { action: 'Pre-op Assessment', patient: 'VD004', provider: 'Dr. Martinez', time: '1 hr ago', status: 'In Progress' },
                { action: 'Discharge Summary', patient: 'VD002', provider: 'Dr. Thompson', time: '2 hr ago', status: 'Pending' }
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
          
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Complete Overdue Notes</div>
                <div className="text-xs text-blue-600">3 pending documents</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Generate Report</div>
                <div className="text-xs text-purple-600">Documentation compliance</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">Review Templates</div>
                <div className="text-xs text-emerald-600">Update standard forms</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Valvular Disease Care Team Tab Configuration
const valvularTabs: StandardTabConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Users,
    description: 'Valvular disease overview'
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: Users,
    description: 'Valvular disease patients'
  },
  {
    id: 'workflow',
    label: 'Valve Optimization',
    icon: Heart,
    description: 'Valve workflow optimization'
  },
  {
    id: 'safety',
    label: 'Safety Protocols',
    icon: Shield,
    description: 'Valvular safety protocols'
  },
  {
    id: 'team',
    label: 'Clinical Collaboration',
    icon: Users,
    description: 'Heart team collaboration and clinical consultation'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: AlertTriangle,
    description: 'Valvular documentation'
  }
];

// Valvular Disease Care Team Configuration
export const valvularCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Valvular Disease',
  moduleDescription: 'Comprehensive valvular disease management, surgical coordination, and intervention optimization',
  moduleIcon: Heart,
  primaryColor: 'medical-blue',
  tabs: valvularTabs,
  tabContent: {
    dashboard: ValvularDashboard,
    patients: ValvularPatients,
    workflow: ValvularWorkflow,
    safety: ValvularSafety,
    team: ValvularClinicalCollaboration,
    documentation: ValvularDocumentation
  }
};