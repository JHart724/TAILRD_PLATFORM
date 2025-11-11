import React, { useState } from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Shield, Activity, FileText, Download, UserCheck, Gauge, Target, TrendingUp } from 'lucide-react';

// Import CHA2DS2VAScCalculator - the key calculator for this module
import CHA2DS2VAScCalculator from '../../../components/riskCalculators/CHA2DS2VAScCalculator';

// Import Structural Heart specific components
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';

type TabId = 'dashboard' | 'patients' | 'workflow' | 'safety' | 'team' | 'documentation' | 'calculator';

const StructuralCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Structural heart metrics overview' },
    { id: 'patients', label: 'Patients', icon: Users, description: 'TAVR and structural heart patients' },
    { id: 'workflow', label: 'Workflow', icon: Calendar, description: 'Heart team workflows' },
    { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
    { id: 'calculator', label: 'CHA2DS2-VASc', icon: Gauge, description: 'Stroke risk calculator' },
    { id: 'team', label: 'Team', icon: UserCheck, description: 'Heart team collaboration' },
    { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
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
                    <div className="text-2xl font-bold text-steel-900">98.2%</div>
                    <div className="text-sm text-steel-600">Success Rate</div>
                  </div>
                </div>
              </div>
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-amber-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">2.1</div>
                    <div className="text-sm text-steel-600">Avg LOS (days)</div>
                  </div>
                </div>
              </div>
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">152</div>
                    <div className="text-sm text-steel-600">Active Referrals</div>
                  </div>
                </div>
              </div>
            </div>
            <TAVRAnalyticsDashboard />
          </div>
        );
      case 'patients':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-medical-purple-600" />
                Structural Heart Patient Worklist
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-steel-200">
                      <th className="text-left p-3 font-semibold text-steel-700">Patient</th>
                      <th className="text-left p-3 font-semibold text-steel-700">Procedure</th>
                      <th className="text-left p-3 font-semibold text-steel-700">Risk Score</th>
                      <th className="text-left p-3 font-semibold text-steel-700">Status</th>
                      <th className="text-left p-3 font-semibold text-steel-700">Next Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Smith, John', procedure: 'TAVR', risk: 'Low (2.1%)', status: 'Pre-op', action: 'Heart Team Review' },
                      { name: 'Johnson, Mary', procedure: 'MitraClip', risk: 'Moderate (5.8%)', status: 'Scheduled', action: 'Pre-op Testing' },
                      { name: 'Williams, Robert', procedure: 'TAVR', risk: 'High (12.3%)', status: 'Evaluation', action: 'Risk Assessment' },
                      { name: 'Brown, Sarah', procedure: 'Watchman', risk: 'Low (1.9%)', status: 'Post-op', action: 'Follow-up Echo' }
                    ].map((patient, index) => (
                      <tr key={index} className="border-b border-steel-100 hover:bg-medical-purple-50/50">
                        <td className="p-3 font-medium text-steel-900">{patient.name}</td>
                        <td className="p-3 text-steel-700">{patient.procedure}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            patient.risk.includes('Low') ? 'bg-green-100 text-green-700' :
                            patient.risk.includes('Moderate') ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {patient.risk}
                          </span>
                        </td>
                        <td className="p-3 text-steel-700">{patient.status}</td>
                        <td className="p-3 text-medical-purple-600 font-medium">{patient.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'calculator':
        return (
          <div className="space-y-6">
            <CHA2DS2VAScCalculator />
          </div>
        );
      case 'workflow':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-medical-purple-600" />
                Heart Team Workflow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Pending Reviews</h4>
                  <div className="space-y-3">
                    {[
                      { patient: 'Davis, Michael', procedure: 'TAVR', urgency: 'High' },
                      { patient: 'Wilson, Linda', procedure: 'MitraClip', urgency: 'Medium' },
                      { patient: 'Garcia, Carlos', procedure: 'LAAC', urgency: 'Low' }
                    ].map((item, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        item.urgency === 'High' ? 'bg-red-50 border-red-200' : 
                        item.urgency === 'Medium' ? 'bg-amber-50 border-amber-200' : 
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="font-medium text-steel-900">{item.patient}</div>
                        <div className="text-sm text-steel-600">{item.procedure}</div>
                        <div className={`text-xs font-medium ${
                          item.urgency === 'High' ? 'text-red-600' : 
                          item.urgency === 'Medium' ? 'text-amber-600' : 
                          'text-green-600'
                        }`}>
                          {item.urgency} Priority
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Today's Procedures</h4>
                  <div className="space-y-3">
                    {[
                      { time: '08:00', patient: 'Anderson, Kate', procedure: 'TAVR' },
                      { time: '10:30', patient: 'Martinez, Jose', procedure: 'MitraClip' },
                      { time: '14:00', patient: 'Thompson, David', procedure: 'LAAC' }
                    ].map((item, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-steel-900">{item.patient}</div>
                            <div className="text-sm text-blue-600">{item.procedure}</div>
                          </div>
                          <div className="text-sm font-medium text-blue-700">{item.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Follow-up Required</h4>
                  <div className="space-y-3">
                    {[
                      { patient: 'Lee, Susan', days: '30-day Echo', status: 'Due' },
                      { patient: 'Miller, James', days: '90-day Follow-up', status: 'Overdue' },
                      { patient: 'Taylor, Nancy', days: '6-month CT', status: 'Scheduled' }
                    ].map((item, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        item.status === 'Overdue' ? 'bg-red-50 border-red-200' : 
                        item.status === 'Due' ? 'bg-amber-50 border-amber-200' : 
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="font-medium text-steel-900">{item.patient}</div>
                        <div className="text-sm text-steel-600">{item.days}</div>
                        <div className={`text-xs font-medium ${
                          item.status === 'Overdue' ? 'text-red-600' : 
                          item.status === 'Due' ? 'text-amber-600' : 
                          'text-green-600'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
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
                Safety Monitoring & Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { alert: 'High Surgical Risk', count: 3, color: 'red' },
                  { alert: 'Bleeding Risk', count: 7, color: 'amber' },
                  { alert: 'Renal Function', count: 2, color: 'red' },
                  { alert: 'Contraindications', count: 1, color: 'amber' }
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
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-medical-purple-600" />
                Heart Team Collaboration
              </h3>
              <StructuralReferralNetworkVisualization />
            </div>
          </div>
        );
      case 'documentation':
        return (
          <div className="space-y-6">
            <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-medical-purple-600" />
                Clinical Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Recent Notes</h4>
                  <div className="space-y-3">
                    {[
                      { patient: 'Smith, John', type: 'TAVR Evaluation', time: '1 hour ago' },
                      { patient: 'Davis, Mary', type: 'Heart Team Note', time: '3 hours ago' },
                      { patient: 'Wilson, Bob', type: 'Post-op Note', time: '5 hours ago' }
                    ].map((note, index) => (
                      <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="font-medium text-steel-900">{note.patient}</div>
                        <div className="text-sm text-purple-600">{note.type}</div>
                        <div className="text-xs text-steel-500">{note.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-4">Documentation Tools</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                      <div className="font-medium text-purple-900">TAVR Assessment</div>
                      <div className="text-sm text-purple-600">Comprehensive evaluation form</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                      <div className="font-medium text-blue-900">Heart Team Note</div>
                      <div className="text-sm text-blue-600">Multidisciplinary decision template</div>
                    </button>
                    <button className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
                      <div className="font-medium text-green-900">Procedure Note</div>
                      <div className="text-sm text-green-600">Standardized operative note</div>
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
            <TAVRAnalyticsDashboard />
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf">
                Structural Heart Care Team Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced TAVR, MitraClip & Structural Heart Interventions Management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-medical-purple-50 border-medical-purple-200 border shadow-lg">
                <Heart className="w-8 h-8 text-medical-purple-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-purple-50 border-medical-purple-200 text-medical-purple-600 shadow-lg scale-105'
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-medical-purple-600' : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-medical-purple-600' : 'text-steel-600 group-hover:text-steel-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-medical-purple-400/20 to-medical-purple-500/20 rounded-xl opacity-50" />
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

export default StructuralCareTeamView;