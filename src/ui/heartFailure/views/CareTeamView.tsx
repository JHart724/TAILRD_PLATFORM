import React, { useState } from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck } from 'lucide-react';

// Import Heart Failure Care Team components
import PatientWorklistEnhanced from '../components/care-team/PatientWorklistEnhanced';
import ReferralTrackerEnhanced from '../components/care-team/ReferralTrackerEnhanced';
import TeamCollaborationPanel from '../components/care-team/TeamCollaborationPanel';
import CareGapAnalyzer from '../components/care-team/CareGapAnalyzer';
import RealTimeHospitalAlerts from '../components/care-team/RealTimeHospitalAlerts';

type TabId = 'dashboard' | 'patients' | 'workflow' | 'safety' | 'team' | 'documentation';

const CareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Care team overview & alerts' },
    { id: 'patients', label: 'Patients', icon: Users, description: 'Enhanced patient worklist' },
    { id: 'workflow', label: 'Workflow', icon: Calendar, description: 'GDMT optimization workflow' },
    { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
    { id: 'team', label: 'Team', icon: UserCheck, description: 'Team collaboration & communication' },
    { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation tools' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <RealTimeHospitalAlerts />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CareGapAnalyzer />
              <TeamCollaborationPanel />
            </div>
          </div>
        );
      case 'patients':
        return (
          <div className="space-y-6">
            <PatientWorklistEnhanced />
          </div>
        );
      case 'workflow':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-medical-blue-600" />
                GDMT Optimization Workflow
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">4-Pillar GDMT Optimization</h4>
                  <div className="space-y-3">
                    {[
                      { pillar: 'ACE/ARB/ARNI', current: '89.2%', target: '≥95%', status: 'amber' },
                      { pillar: 'Beta Blockers', current: '91.7%', target: '≥95%', status: 'amber' },
                      { pillar: 'MRA', current: '76.4%', target: '≥85%', status: 'red' },
                      { pillar: 'SGLT2i', current: '62.1%', target: '≥75%', status: 'red' }
                    ].map((item, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        item.status === 'red' ? 'bg-red-50 border-red-200' : 
                        item.status === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-steel-900">{item.pillar}</span>
                          <div className="text-right">
                            <div className="font-semibold text-steel-900">{item.current}</div>
                            <div className="text-xs text-steel-600">{item.target}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Workflow Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                      <div className="font-medium text-blue-900">Review MRA Eligibility</div>
                      <div className="text-sm text-blue-600">23 patients pending review</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                      <div className="font-medium text-purple-900">SGLT2i Assessment</div>
                      <div className="text-sm text-purple-600">31 patients for evaluation</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
                      <div className="font-medium text-green-900">Dose Optimization</div>
                      <div className="text-sm text-green-600">18 patients ready for titration</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'safety':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Safety Monitoring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { alert: 'High K+', count: 7, color: 'red' },
                  { alert: 'Low BP', count: 12, color: 'amber' },
                  { alert: 'Renal Function', count: 5, color: 'red' },
                  { alert: 'Drug Interactions', count: 3, color: 'amber' },
                  { alert: 'Contraindications', count: 8, color: 'red' },
                  { alert: 'Side Effects', count: 15, color: 'amber' }
                ].map((item, index) => (
                  <div key={index} className={`p-4 rounded-xl border ${
                    item.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        item.color === 'red' ? 'text-red-600' : 'text-amber-600'
                      }`}>{item.count}</div>
                      <div className="text-sm font-medium text-steel-700">{item.alert}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-6">
            <TeamCollaborationPanel />
          </div>
        );
      case 'documentation':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-medical-blue-600" />
                Clinical Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Recent Notes</h4>
                  <div className="space-y-3">
                    {[
                      { patient: 'Johnson, Mary', type: 'GDMT Review', time: '2 hours ago' },
                      { patient: 'Smith, John', type: 'Follow-up', time: '4 hours ago' },
                      { patient: 'Davis, Sarah', type: 'Medication Change', time: '6 hours ago' }
                    ].map((note, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-medium text-steel-900">{note.patient}</div>
                        <div className="text-sm text-blue-600">{note.type}</div>
                        <div className="text-xs text-steel-500">{note.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Documentation Tools</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
                      <div className="font-medium text-green-900">GDMT Template</div>
                      <div className="text-sm text-green-600">Standardized assessment form</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                      <div className="font-medium text-blue-900">Discharge Planning</div>
                      <div className="text-sm text-blue-600">Heart failure discharge checklist</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                      <div className="font-medium text-purple-900">Quality Metrics</div>
                      <div className="text-sm text-purple-600">Performance documentation</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <RealTimeHospitalAlerts />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CareGapAnalyzer />
              <TeamCollaborationPanel />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <header className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf">
                Heart Failure Care Team Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Enhanced Patient Management & Clinical Decision Support
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-medical-blue-50 border-medical-blue-200 border shadow-lg">
                <Heart className="w-8 h-8 text-medical-blue-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-blue-50 border-medical-blue-200 text-medical-blue-600 shadow-lg scale-105'
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-medical-blue-600' : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-medical-blue-600' : 'text-steel-600 group-hover:text-steel-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-medical-blue-400/20 to-medical-blue-500/20 rounded-xl opacity-50" />
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

export default CareTeamView;