import React from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp } from 'lucide-react';
import { CareTeamViewConfig } from '../../../components/shared/BaseCareTeamView';
import { StandardTabConfig } from '../../../components/shared/StandardInterfaces';
import CHA2DS2VAScCalculator from '../../../components/riskCalculators/CHA2DS2VAScCalculator';
import { featureFlags } from '../../../config/featureFlags';

// Import Structural Heart specific components
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';
import { apiService } from '../../../services/apiService';

// Structural Heart Dashboard Component
const StructuralDashboard: React.FC = () => (
  <div className="space-y-6">
    {/* Structural Heart Metrics Overview */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-medical-purple-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">327</div>
            <div className="text-sm text-steel-600">TAVR Procedures MTD</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-green-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">96.8%</div>
            <div className="text-sm text-steel-600">TAVR Success Rate</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">4.2d</div>
            <div className="text-sm text-steel-600">Avg Length of Stay</div>
          </div>
        </div>
      </div>
      <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-purple-600" />
          <div>
            <div className="text-2xl font-bold text-steel-900">2.1%</div>
            <div className="text-sm text-steel-600">30-day Mortality</div>
          </div>
        </div>
      </div>
    </div>
    
    {/* TAVR Analytics Dashboard */}
    <TAVRAnalyticsDashboard />
  </div>
);

// Structural Patients Component
const StructuralPatients: React.FC = () => (
  <div className="space-y-6">
    {/* Patient Registry Table */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-medical-purple-600" />
          Structural Heart Patient Registry
        </h3>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-medical-purple-100 text-medical-purple-700 rounded-lg hover:bg-medical-purple-200 transition-colors text-sm">
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
              <th className="text-left py-3 px-4 font-medium text-steel-700">Risk Category</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">STS Score</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Approach</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-steel-700">Provider</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'SH001', name: 'Margaret Johnson', procedure: 'TAVR', risk: 'Intermediate', sts: '4.2%', approach: 'Transfemoral', status: 'Completed', provider: 'Dr. Williams' },
              { id: 'SH002', name: 'Robert Chen', procedure: 'TEER', risk: 'High', sts: '8.1%', approach: 'Transvenous', status: 'Scheduled', provider: 'Dr. Martinez' },
              { id: 'SH003', name: 'Sarah Wilson', procedure: 'TMVR', risk: 'Intermediate', sts: '5.7%', approach: 'Transapical', status: 'Planning', provider: 'Dr. Thompson' },
              { id: 'SH004', name: 'James Rodriguez', procedure: 'TAVR', risk: 'Low', sts: '2.8%', approach: 'Transfemoral', status: 'Pre-op', provider: 'Dr. Park' },
              { id: 'SH005', name: 'Lisa Anderson', procedure: 'PVL Closure', risk: 'High', sts: '9.4%', approach: 'Transcatheter', status: 'Consult', provider: 'Dr. Chen' }
            ].map((patient, index) => (
              <tr key={index} className="border-b border-steel-100 hover:bg-steel-50">
                <td className="py-3 px-4 font-mono text-steel-900">{patient.id}</td>
                <td className="py-3 px-4 text-steel-900">{patient.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.procedure === 'TAVR' ? 'bg-purple-100 text-purple-700' :
                    patient.procedure === 'TEER' ? 'bg-blue-100 text-blue-700' :
                    patient.procedure === 'TMVR' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {patient.procedure}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.risk === 'High' ? 'bg-red-100 text-red-700' :
                    patient.risk === 'Intermediate' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {patient.risk}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-steel-700">{patient.sts}</td>
                <td className="py-3 px-4 text-steel-700">{patient.approach}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    patient.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'Planning' ? 'bg-purple-100 text-purple-700' :
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
    
    {/* Structural Referral Network */}
    <StructuralReferralNetworkVisualization />
  </div>
);

// Structural Workflow Component  
const StructuralWorkflow: React.FC = () => (
  <div className="space-y-6">
    {/* TAVR & Structural Procedure Optimization */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-purple-600" />
        TAVR & Structural Procedure Optimization
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procedure Pathway */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
            <h4 className="font-semibold text-steel-900 mb-4">TAVR Procedure Pathway</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <div className="font-medium text-steel-900">Referral & Initial Screening</div>
                  <div className="text-sm text-steel-600">Primary care or cardiology referral evaluation</div>
                </div>
                <div className="ml-auto text-sm text-purple-600 font-medium">1-2 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-indigo-200">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div>
                  <div className="font-medium text-steel-900">Echo & STS Risk Assessment</div>
                  <div className="text-sm text-steel-600">Valve evaluation and surgical risk calculation</div>
                </div>
                <div className="ml-auto text-sm text-indigo-600 font-medium">3-5 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div>
                  <div className="font-medium text-steel-900">Heart Team Conference</div>
                  <div className="text-sm text-steel-600">TAVR vs SAVR vs medical therapy decision</div>
                </div>
                <div className="ml-auto text-sm text-blue-600 font-medium">7-10 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-violet-200">
                <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <div>
                  <div className="font-medium text-steel-900">CT Planning & Sizing</div>
                  <div className="text-sm text-steel-600">Valve sizing, approach planning, annular measurements</div>
                </div>
                <div className="ml-auto text-sm text-violet-600 font-medium">5-7 days</div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-emerald-200">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">5</div>
                <div>
                  <div className="font-medium text-steel-900">Procedure & Recovery</div>
                  <div className="text-sm text-steel-600">TAVR implantation and post-procedure monitoring</div>
                </div>
                <div className="ml-auto text-sm text-emerald-600 font-medium">1-3 days</div>
              </div>
            </div>
          </div>
          
          {/* Procedure Volume Tracking */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Current Procedure Pipeline</h4>
            <div className="space-y-3">
              {[
                { stage: 'Initial Screening', count: 18, color: 'purple' },
                { stage: 'Heart Team Review', count: 12, color: 'indigo' },
                { stage: 'CT Planning', count: 8, color: 'blue' },
                { stage: 'Scheduled for TAVR', count: 15, color: 'emerald' },
                { stage: 'Post-procedure', count: 6, color: 'green' }
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
        
        {/* Optimization Metrics */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-600" />
              Optimization Metrics
            </h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">16.8d</div>
                <div className="text-xs text-purple-700">Avg Time to TAVR</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">96.8%</div>
                <div className="text-xs text-green-700">Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">4.2d</div>
                <div className="text-xs text-blue-700">Avg Length of Stay</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">89%</div>
                <div className="text-xs text-orange-700">Heart Team Utilization</div>
              </div>
            </div>
          </div>
          
          {/* Procedure Types */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Procedure Mix (MTD)</h4>
            <div className="space-y-3">
              {[
                { procedure: 'TAVR', count: 327, color: 'purple' },
                { procedure: 'TEER', count: 89, color: 'blue' },
                { procedure: 'TMVR', count: 43, color: 'indigo' },
                { procedure: 'PVL Closure', count: 28, color: 'emerald' },
                { procedure: 'Tricuspid', count: 15, color: 'orange' }
              ].map((proc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                  <span className="text-steel-700">{proc.procedure}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-${proc.color}-600 font-bold`}>{proc.count}</span>
                    <div className={`w-3 h-3 bg-${proc.color}-500 rounded-full`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Schedule Heart Team</div>
                <div className="text-xs text-purple-600">Next slot: Tuesday 2 PM</div>
              </button>
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">CT Planning Queue</div>
                <div className="text-xs text-blue-600">8 studies pending</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">OR Schedule</div>
                <div className="text-xs text-emerald-600">15 procedures scheduled</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Structural Safety Component
const StructuralSafety: React.FC = () => (
  <div className="space-y-6">
    {/* TAVR Safety Protocols & Quality */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-purple-600" />
        TAVR Safety Protocols & Quality Assurance
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Alerts & Monitoring */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
            <h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Active Safety Alerts
            </h4>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">High-Risk Patient Alert</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">URGENT</span>
                </div>
                <div className="text-sm text-red-700">Patient SH002: STS Score 8.1% - Consider alternative approach</div>
                <div className="text-xs text-red-600 mt-1">Heart team evaluation required</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">CT Planning Alert</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">REVIEW</span>
                </div>
                <div className="text-sm text-orange-700">Annular sizing discrepancy detected - dual measurements required</div>
                <div className="text-xs text-orange-600 mt-1">CT review pending</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-yellow-900">Anticoagulation Review</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">PENDING</span>
                </div>
                <div className="text-sm text-yellow-700">4 post-TAVR patients due for dual antiplatelet review</div>
                <div className="text-xs text-yellow-600 mt-1">Next clinic: Thursday 9 AM</div>
              </div>
            </div>
          </div>
          
          {/* Quality Metrics */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Safety & Quality Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">96.8%</div>
                <div className="text-xs text-green-700">Procedural Success</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.1%</div>
                <div className="text-xs text-blue-700">30-day Mortality</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">1.8%</div>
                <div className="text-xs text-purple-700">Major Complications</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">97.4%</div>
                <div className="text-xs text-emerald-700">Safety Compliance</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Safety Protocols & Checklists */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">TAVR Safety Protocol</h4>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900">Low-Intermediate Risk</span>
                  <span className="text-sm font-bold text-green-600">STS &lt;8%</span>
                </div>
                <div className="text-sm text-green-700">Standard TAVR protocol • Femoral approach preferred • Conscious sedation</div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">High Risk</span>
                  <span className="text-sm font-bold text-orange-600">STS 8-15%</span>
                </div>
                <div className="text-sm text-orange-700">Enhanced monitoring • General anesthesia • ICU recovery • Extended observation</div>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">Prohibitive Risk</span>
                  <span className="text-sm font-bold text-red-600">STS &gt;15%</span>
                </div>
                <div className="text-sm text-red-700">Alternative access • Staged procedures • Palliative considerations</div>
              </div>
            </div>
          </div>
          
          {/* Pre-procedure Safety Checklist */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Pre-procedure Safety Checklist</h4>
            <div className="space-y-2">
              {[
                { item: 'CT measurements verified', status: 'complete' },
                { item: 'Valve sizing confirmed', status: 'complete' },
                { item: 'Access route planned', status: 'complete' },
                { item: 'Anticoagulation optimized', status: 'pending' },
                { item: 'Anesthesia consultation', status: 'complete' },
                { item: 'Blood products available', status: 'pending' },
                { item: 'Backup surgical team alerted', status: 'complete' },
                { item: 'Post-procedure bed reserved', status: 'pending' }
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
          
          {/* Emergency Protocols */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Emergency Response</h4>
            <div className="space-y-2">
              <button className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <div className="font-medium text-red-900">Activate TAVR Emergency Team</div>
                <div className="text-xs text-red-600">Immediate surgical backup</div>
              </button>
              <button className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <div className="font-medium text-orange-900">Vascular Complication Protocol</div>
                <div className="text-xs text-orange-600">Access site management</div>
              </button>
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Valve Malposition Protocol</div>
                <div className="text-xs text-purple-600">Valve-in-valve procedures</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Structural Clinical Collaboration Component
const StructuralClinicalCollaboration: React.FC = () => (
  <div className="space-y-6">
    {/* Clinical Collaboration & Heart Team */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-purple-600" />
        Structural Heart Clinical Collaboration & Heart Team
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Team Collaboration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Multidisciplinary Heart Team</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Dr. Sarah Williams', role: 'Interventional Cardiology', specialty: 'TAVR Clinical Lead', expertise: 'Transcatheter Interventions', consultations: 128 },
                { name: 'Dr. Michael Chen', role: 'Cardiac Surgery', specialty: 'SAVR Specialist', expertise: 'Surgical Risk Assessment', consultations: 124 },
                { name: 'Dr. Jennifer Martinez', role: 'Cardiac Imaging', specialty: 'CT Planning', expertise: 'Valve Assessment', consultations: 235 },
                { name: 'Dr. Robert Thompson', role: 'Cardiac Anesthesia', specialty: 'Perioperative Care', expertise: 'Risk Stratification', consultations: 131 },
                { name: 'Dr. Lisa Park', role: 'Heart Failure', specialty: 'Medical Optimization', expertise: 'Clinical Assessment', consultations: 118 },
                { name: 'Dr. David Kim', role: 'Structural Echo', specialty: 'Valve Assessment', expertise: 'Functional Evaluation', consultations: 122 },
                { name: 'Maria Rodriguez, RN', role: 'TAVR Coordinator', specialty: 'Patient Navigation', expertise: 'Clinical Pathways', consultations: 245 },
                { name: 'James Wilson, CVT', role: 'Clinical Specialist', specialty: 'Procedure Planning', expertise: 'Technical Assessment', consultations: 138 }
              ].map((member, index) => (
                <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
                  <div className="mb-2">
                    <div className="font-medium text-steel-900">{member.name}</div>
                  </div>
                  <div className="text-sm text-steel-700">{member.role}</div>
                  <div className="text-xs text-steel-600">{member.specialty}</div>
                  <div className="text-xs text-purple-600 mt-1 font-medium">{member.expertise}</div>
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
              <Heart className="w-5 h-5 text-purple-600" />
              Evidence-Based Clinical Decision Pathways
            </h4>
            <div className="space-y-3">
              {[
                { pathway: 'TAVR vs SAVR Decision Algorithm', indication: 'Aortic Stenosis', evidence: 'AHA/ACC Guidelines', consultation: 'Heart Team Required' },
                { pathway: 'MitraClip Evaluation Protocol', indication: 'Secondary Mitral Regurgitation', evidence: 'Expert Consensus', consultation: 'Multidisciplinary Review' },
                { pathway: 'Tricuspid Intervention Assessment', indication: 'Severe Tricuspid Regurgitation', evidence: 'Clinical Evidence', consultation: 'Heart Team Consultation' },
                { pathway: 'Risk Stratification Framework', indication: 'High-Risk Patients', evidence: 'STS Score Guidelines', consultation: 'Risk Assessment Team' }
              ].map((pathway, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${
                  pathway.indication === 'Aortic Stenosis' ? 'bg-purple-50 border-purple-200' :
                  pathway.indication === 'Secondary Mitral Regurgitation' ? 'bg-blue-50 border-blue-200' :
                  pathway.indication === 'Severe Tricuspid Regurgitation' ? 'bg-green-50 border-green-200' :
                  'bg-orange-50 border-orange-200'
                }`}>
                  <div>
                    <div className={`font-medium ${
                      pathway.indication === 'Aortic Stenosis' ? 'text-purple-900' :
                      pathway.indication === 'Secondary Mitral Regurgitation' ? 'text-blue-900' :
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
                    pathway.indication === 'Aortic Stenosis' ? 'bg-purple-100 text-purple-700' :
                    pathway.indication === 'Secondary Mitral Regurgitation' ? 'bg-blue-100 text-blue-700' :
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
                <div className="text-2xl font-bold text-green-600">96.8%</div>
                <div className="text-xs text-green-700">Clinical Success Rate</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.1%</div>
                <div className="text-xs text-blue-700">30-day Mortality</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">94%</div>
                <div className="text-xs text-purple-700">Heart Team Consensus</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">97%</div>
                <div className="text-xs text-emerald-700">Guideline Adherence</div>
              </div>
            </div>
          </div>
          
          {/* Active Clinical Consultations */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Active Clinical Consultations</h4>
            <div className="space-y-3">
              {[
                { consultation: 'TAVR vs SAVR Decision', patient: 'SH001', status: 'STS Risk Assessment', urgency: 'routine' },
                { consultation: 'MitraClip Evaluation', patient: 'SH003', status: 'Echo Assessment', urgency: 'priority' },
                { consultation: 'High-Risk TAVR Planning', patient: 'SH004', status: 'Heart Team Review', urgency: 'urgent' },
                { consultation: 'Tricuspid Intervention', patient: 'SH005', status: 'Feasibility Assessment', urgency: 'routine' }
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
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={async () => {
                  console.log('Structural Heart: Opening STS Risk Calculator - calling automated API');
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
                <div className="font-medium text-purple-900">STS Risk Calculator</div>
                <div className="text-xs text-purple-600">Surgical risk assessment tool</div>
              </button>
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">TAVR Decision Framework</div>
                <div className="text-xs text-blue-600">Evidence-based selection criteria</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">Clinical Guidelines</div>
                <div className="text-xs text-emerald-600">AHA/ACC/EACTS recommendations</div>
              </button>
              <button className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <div className="font-medium text-orange-900">Heart Team Consultation</div>
                <div className="text-xs text-orange-600">Multidisciplinary case review</div>
              </button>
            </div>
          </div>
          
          {/* CHA2DS2VASc Calculator */}
          {featureFlags.riskCalculators.cha2ds2vasc && (
            <CHA2DS2VAScCalculator />
          )}
        </div>
      </div>
    </div>
  </div>
);

// Structural Documentation Component
const StructuralDocumentation: React.FC = () => (
  <div className="space-y-6">
    {/* TAVR Documentation & Registry */}
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-medical-purple-600" />
        TAVR Documentation & Registry Management
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
                  <span className="font-medium text-amber-900">STS/ACC TVT Registry</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">DUE TODAY</span>
                </div>
                <div className="text-sm text-amber-700">3 TAVR cases require 30-day follow-up data entry</div>
                <div className="text-xs text-amber-600 mt-1">Registry deadline: End of business today</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900">Procedure Notes Overdue</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">OVERDUE</span>
                </div>
                <div className="text-sm text-red-700">SH001 TAVR operative note incomplete - 48h post-procedure</div>
                <div className="text-xs text-red-600 mt-1">Requires immediate completion</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-900">CT Planning Documentation</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">PENDING</span>
                </div>
                <div className="text-sm text-orange-700">5 patients awaiting CT measurement documentation</div>
                <div className="text-xs text-orange-600 mt-1">Required before procedure scheduling</div>
              </div>
            </div>
          </div>
          
          {/* Registry Performance */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">Registry Compliance</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-900">STS/ACC TVT Registry</div>
                  <div className="text-sm text-green-700">Data completeness</div>
                </div>
                <div className="text-2xl font-bold text-green-600">96.2%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-900">30-day Follow-up</div>
                  <div className="text-sm text-blue-700">Outcome tracking</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">94.8%</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-900">Timely Documentation</div>
                  <div className="text-sm text-purple-700">Within 24h completion</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">91.5%</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Documentation Templates & Tools */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h4 className="font-semibold text-steel-900 mb-4">TAVR Documentation Templates</h4>
            <div className="grid grid-cols-1 gap-3">
              {[
                { template: 'TAVR Pre-procedure Assessment', time: '~5 min', color: 'purple', priority: 'high' },
                { template: 'Heart Team Decision Note', time: '~4 min', color: 'indigo', priority: 'high' },
                { template: 'CT Planning Report', time: '~6 min', color: 'blue', priority: 'medium' },
                { template: 'TAVR Operative Report', time: '~8 min', color: 'violet', priority: 'high' },
                { template: 'Post-procedure Assessment', time: '~3 min', color: 'emerald', priority: 'high' },
                { template: '30-day Follow-up Form', time: '~4 min', color: 'orange', priority: 'medium' }
              ].map((template, index) => (
                <button key={index} className={`p-3 text-left bg-${template.color}-50 hover:bg-${template.color}-100 rounded-lg transition-colors border border-${template.color}-200`}>
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
                { action: 'TAVR Registry Entry', patient: 'SH001', provider: 'Dr. Williams', time: '12 min ago', status: 'Complete' },
                { action: 'CT Planning Report', patient: 'SH003', provider: 'Dr. Martinez', time: '28 min ago', status: 'Complete' },
                { action: 'Heart Team Note', patient: 'SH004', provider: 'Dr. Thompson', time: '45 min ago', status: 'In Progress' },
                { action: '30-day Follow-up', patient: 'SH002', provider: 'M. Rodriguez', time: '1.2 hr ago', status: 'Pending' }
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
              <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="font-medium text-purple-900">Complete Registry Entries</div>
                <div className="text-xs text-purple-600">3 cases pending TVT submission</div>
              </button>
              <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="font-medium text-blue-900">Generate Quality Report</div>
                <div className="text-xs text-blue-600">Monthly TAVR outcomes summary</div>
              </button>
              <button className="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <div className="font-medium text-emerald-900">Update Templates</div>
                <div className="text-xs text-emerald-600">Review documentation forms</div>
              </button>
              <button className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <div className="font-medium text-orange-900">Follow-up Reminders</div>
                <div className="text-xs text-orange-600">Schedule 30-day contacts</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Care Team Tab Configuration
const structuralTabs: StandardTabConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Users,
    description: 'TAVR and SAVR overview'
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: Users,
    description: 'Structural heart patient census'
  },
  {
    id: 'workflow',
    label: 'TAVR Optimization',
    icon: Heart,
    description: 'TAVR workflow optimization'
  },
  {
    id: 'safety',
    label: 'Safety Protocols',
    icon: Shield,
    description: 'Structural heart safety'
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
    description: 'Structural documentation'
  }
];

// Structural Heart Care Team Configuration
export const structuralCareTeamConfig: CareTeamViewConfig = {
  moduleName: 'Structural Heart',
  moduleDescription: 'Advanced structural heart interventions, TAVR/SAVR coordination, and valve optimization',
  moduleIcon: Heart,
  primaryColor: 'medical-purple',
  tabs: structuralTabs,
  tabContent: {
    dashboard: StructuralDashboard,
    patients: StructuralPatients,
    workflow: StructuralWorkflow,
    safety: StructuralSafety,
    team: StructuralClinicalCollaboration,
    documentation: StructuralDocumentation
  }
};