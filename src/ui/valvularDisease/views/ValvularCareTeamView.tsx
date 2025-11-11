import React, { useState } from 'react';
import { Users, Calendar, Shield, Activity, FileText, Heart, Scissors, ListTodo, Eye } from 'lucide-react';

// Import Valvular Disease components
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';

type TabId = 'dashboard' | 'patients' | 'surgical-planning' | 'surveillance' | 'worklist' | 'safety' | 'team' | 'documentation';

const ValvularCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Valve care team overview' },
    { id: 'patients', label: 'Patients', icon: Users, description: 'Valve patient management' },
    { id: 'surgical-planning', label: 'Surgical Planning', icon: Scissors, description: 'Surgical planning checklist' },
    { id: 'surveillance', label: 'Valve Surveillance', icon: Eye, description: 'Repaired valve surveillance' },
    { id: 'worklist', label: 'Valve Worklist', icon: ListTodo, description: 'Comprehensive valve worklist' },
    { id: 'safety', label: 'Safety', icon: Shield, description: 'Risk assessment & monitoring' },
    { id: 'team', label: 'Team', icon: Users, description: 'Team collaboration' },
    { id: 'documentation', label: 'Documentation', icon: FileText, description: 'Clinical documentation' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Heart className="w-8 h-8 text-medical-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">187</div>
                    <div className="text-sm text-steel-600">Active Valve Patients</div>
                  </div>
                </div>
              </div>
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Scissors className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">23</div>
                    <div className="text-sm text-steel-600">Surgeries This Month</div>
                  </div>
                </div>
              </div>
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-amber-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">89</div>
                    <div className="text-sm text-steel-600">Due for Echo</div>
                  </div>
                </div>
              </div>
              <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-steel-900">7</div>
                    <div className="text-sm text-steel-600">High Risk Cases</div>
                  </div>
                </div>
              </div>
            </div>
            <ValvePatientHeatmap />
          </div>
        );
      case 'patients':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6">Valve Patient Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steel-200">
                    <th className="text-left p-3 font-semibold text-steel-700">Patient</th>
                    <th className="text-left p-3 font-semibold text-steel-700">Valve Type</th>
                    <th className="text-left p-3 font-semibold text-steel-700">Severity</th>
                    <th className="text-left p-3 font-semibold text-steel-700">Last Echo</th>
                    <th className="text-left p-3 font-semibold text-steel-700">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Anderson, Michael', valve: 'Aortic', severity: 'Severe AS', echo: '2 weeks ago', action: 'Surgical evaluation' },
                    { name: 'Brown, Sarah', valve: 'Mitral', severity: 'Moderate MR', echo: '1 month ago', action: 'Repeat echo 6mo' },
                    { name: 'Davis, Robert', valve: 'Aortic', severity: 'Mild AI', echo: '6 months ago', action: 'Annual echo' },
                    { name: 'Wilson, Linda', valve: 'Tricuspid', severity: 'Severe TR', echo: '1 week ago', action: 'Heart team review' }
                  ].map((patient, index) => (
                    <tr key={index} className="border-b border-steel-100 hover:bg-medical-blue-50/50">
                      <td className="p-3 font-medium text-steel-900">{patient.name}</td>
                      <td className="p-3 text-steel-700">{patient.valve}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.severity.includes('Severe') ? 'bg-red-100 text-red-700' :
                          patient.severity.includes('Moderate') ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {patient.severity}
                        </span>
                      </td>
                      <td className="p-3 text-steel-700">{patient.echo}</td>
                      <td className="p-3 text-medical-blue-600 font-medium">{patient.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'surgical-planning':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6">Surgical Planning Checklist</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Pre-operative Assessment</h4>
                <div className="space-y-3">
                  {[
                    { item: 'Echo completed', checked: true },
                    { item: 'Cardiac catheterization', checked: true },
                    { item: 'CT planning (if TAVR)', checked: false },
                    { item: 'Anesthesia clearance', checked: true },
                    { item: 'Blood type & screen', checked: false }
                  ].map((item, index) => (
                    <label key={index} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="w-5 h-5 text-blue-600 border-steel-300 rounded"
                      />
                      <span className={`text-sm ${item.checked ? 'text-steel-700' : 'text-steel-500'}`}>
                        {item.item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Risk Assessment</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-steel-600">STS Score</span>
                    <span className="font-bold text-amber-600">4.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">EuroSCORE II</span>
                    <span className="font-bold text-amber-600">3.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Frailty Assessment</span>
                    <span className="font-bold text-green-600">Not frail</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Recommendation</span>
                    <span className="font-bold text-blue-600">Surgical AVR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'surveillance':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6">Repaired Valve Surveillance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { status: 'Excellent Function', count: 45, color: 'green' },
                { status: 'Mild Dysfunction', count: 12, color: 'amber' },
                { status: 'Needs Follow-up', count: 8, color: 'red' }
              ].map((item, index) => (
                <div key={index} className={`text-center p-6 rounded-xl bg-${item.color}-50 border border-${item.color}-200`}>
                  <div className={`text-3xl font-bold text-${item.color}-600 mb-2`}>{item.count}</div>
                  <div className="font-semibold text-steel-900">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'worklist':
        return <ValvularSurgicalNetworkVisualization />;
      default:
        return (
          <div className="space-y-6">
            <ValvePatientHeatmap />
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
                Valvular Disease Care Team Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Enhanced Valve Care Management & Clinical Decision Support
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
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

export default ValvularCareTeamView;