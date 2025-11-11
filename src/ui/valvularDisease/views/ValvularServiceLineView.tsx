import React, { useState } from 'react';
import { Heart, Users, Calendar, Shield, Activity, Target, BarChart3, FileText, TrendingUp, Scissors, Workflow } from 'lucide-react';

// Import Valvular Disease components  
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';

type TabId = 'bicuspid' | 'ross' | 'repair-vs-replace' | 'echo-surveillance' | 'heatmap' | 'network' | 'analytics' | 'outcomes' | 'quality' | 'reporting';

const ValvularServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('bicuspid');

  const tabs = [
    { id: 'bicuspid', label: 'Bicuspid Repair', icon: Scissors, description: 'Bicuspid aortic valve repair pathway' },
    { id: 'ross', label: 'Ross Procedure', icon: Heart, description: 'Ross procedure tracking and outcomes' },
    { id: 'repair-vs-replace', label: 'Repair vs Replace', icon: Workflow, description: 'Decision support tool' },
    { id: 'echo-surveillance', label: 'Echo Surveillance', icon: Calendar, description: 'Echo surveillance scheduler' },
    { id: 'heatmap', label: 'Patient Heatmap', icon: Target, description: 'Valve patient risk visualization' },
    { id: 'network', label: 'Surgical Network', icon: Users, description: 'Surgical referral patterns' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced valve analytics' },
    { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Surgical outcomes tracking' },
    { id: 'quality', label: 'Quality', icon: Shield, description: 'Quality metrics and benchmarks' },
    { id: 'reporting', label: 'Reporting', icon: FileText, description: 'Automated reports and exports' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'heatmap':
        return <ValvePatientHeatmap />;
      case 'network':
        return <ValvularSurgicalNetworkVisualization />;
      case 'bicuspid':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Scissors className="w-8 h-8 text-medical-blue-600" />
              Bicuspid Aortic Valve Repair Pathway
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { stage: 'Assessment', patients: 156, rate: '100%', color: 'blue' },
                { stage: 'Suitable', patients: 98, rate: '62.8%', color: 'green' },
                { stage: 'Repair Planned', patients: 82, rate: '83.7%', color: 'amber' },
                { stage: 'Completed', patients: 76, rate: '92.7%', color: 'purple' }
              ].map((item, index) => (
                <div key={index} className={`text-center p-6 rounded-xl bg-${item.color}-50 border border-${item.color}-200`}>
                  <div className={`text-3xl font-bold text-${item.color}-600 mb-2`}>{item.patients}</div>
                  <div className="font-semibold text-steel-900">{item.stage}</div>
                  <div className={`text-sm text-${item.color}-600`}>{item.rate}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Repair Suitability Criteria</h4>
                <div className="space-y-3">
                  {[
                    { criteria: 'Bicuspid morphology', suitable: 87, total: 156 },
                    { criteria: 'Adequate leaflet tissue', suitable: 92, total: 156 },
                    { criteria: 'Root dimensions <45mm', suitable: 78, total: 156 },
                    { criteria: 'No severe calcification', suitable: 134, total: 156 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-steel-900">{item.criteria}</span>
                      <div className="text-right">
                        <div className="font-semibold text-blue-700">{item.suitable}/{item.total}</div>
                        <div className="text-xs text-blue-600">{Math.round((item.suitable/item.total)*100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Repair Outcomes</h4>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-steel-900">Freedom from reoperation</span>
                    <span className="font-bold text-green-600">94.2% @ 5 yrs</span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-steel-900">Post-op AI grade ≤ mild</span>
                    <span className="font-bold text-blue-600">91.8%</span>
                  </div>
                  <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-steel-900">Operative mortality</span>
                    <span className="font-bold text-purple-600">0.8%</span>
                  </div>
                  <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-steel-900">Mean gradient</span>
                    <span className="font-bold text-amber-600">8.2 mmHg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ross':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Heart className="w-8 h-8 text-medical-red-600" />
              Ross Procedure Tracker
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { metric: 'Candidates Evaluated', value: 47, period: 'YTD' },
                { metric: 'Procedures Completed', value: 23, period: 'YTD' },
                { metric: 'Success Rate', value: '100%', period: 'Recent' }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-3xl font-bold text-red-600 mb-2">{item.value}</div>
                  <div className="font-semibold text-steel-900">{item.metric}</div>
                  <div className="text-sm text-red-600">{item.period}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Selection Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Age &lt;50 years</span><span className="text-green-600">✓ Required</span></div>
                  <div className="flex justify-between"><span>Active lifestyle</span><span className="text-green-600">✓ Required</span></div>
                  <div className="flex justify-between"><span>Normal PV anatomy</span><span className="text-green-600">✓ Required</span></div>
                  <div className="flex justify-between"><span>No contraindications</span><span className="text-green-600">✓ Required</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Long-term Outcomes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>15-year survival</span><span className="font-medium">96.8%</span></div>
                  <div className="flex justify-between"><span>Freedom from AVR</span><span className="font-medium">89.2%</span></div>
                  <div className="flex justify-between"><span>Freedom from PVR</span><span className="font-medium">78.5%</span></div>
                  <div className="flex justify-between"><span>Endocarditis rate</span><span className="font-medium">0.5%/pt-yr</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'repair-vs-replace':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Workflow className="w-8 h-8 text-medical-green-600" />
              Valve Repair vs Replacement Decision Tool
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-steel-900">Decision Factors</h4>
                <div className="space-y-4">
                  {[
                    { factor: 'Patient Age', repair: '&lt;65 years', replace: '&gt;65 years', weight: 'High' },
                    { factor: 'Valve Anatomy', repair: 'Good leaflets', replace: 'Calcified/destroyed', weight: 'Critical' },
                    { factor: 'Surgeon Experience', repair: 'Experienced', replace: 'Standard', weight: 'Medium' },
                    { factor: 'Urgency', repair: 'Elective', replace: 'Urgent/Emergent', weight: 'Medium' }
                  ].map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl border border-steel-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-steel-900">{item.factor}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.weight === 'Critical' ? 'bg-red-100 text-red-700' :
                          item.weight === 'High' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {item.weight}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <div className="text-green-700 font-medium">Repair</div>
                          <div className="text-green-600">{item.repair}</div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <div className="text-blue-700 font-medium">Replace</div>
                          <div className="text-blue-600">{item.replace}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-steel-900">Outcomes Comparison</h4>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold mb-3">Repair</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Operative mortality</span>
                          <span className="font-medium">1.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>15-year survival</span>
                          <span className="font-medium">85.3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reoperation</span>
                          <span className="font-medium">8.7%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thromboembolism</span>
                          <span className="font-medium">0.8%/pt-yr</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-semibold mb-3">Replace</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Operative mortality</span>
                          <span className="font-medium">2.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>15-year survival</span>
                          <span className="font-medium">78.9%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reoperation</span>
                          <span className="font-medium">12.3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thromboembolism</span>
                          <span className="font-medium">1.9%/pt-yr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'echo-surveillance':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-medical-amber-600" />
              Echo Surveillance Scheduler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { interval: 'Overdue', count: 23, color: 'red' },
                { interval: 'Due This Month', count: 67, color: 'amber' },
                { interval: 'Due Next Month', count: 89, color: 'blue' },
                { interval: 'Future', count: 245, color: 'green' }
              ].map((item, index) => (
                <div key={index} className={`text-center p-6 rounded-xl bg-${item.color}-50 border border-${item.color}-200`}>
                  <div className={`text-3xl font-bold text-${item.color}-600 mb-2`}>{item.count}</div>
                  <div className="font-semibold text-steel-900">{item.interval}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Surveillance Guidelines</h4>
                <div className="space-y-3">
                  {[
                    { severity: 'Mild AS/AI', interval: 'Every 3-5 years' },
                    { severity: 'Moderate AS/AI', interval: 'Every 1-2 years' },
                    { severity: 'Severe AS/AI', interval: 'Every 6 months' },
                    { severity: 'Post-repair', interval: 'Every 6-12 months' }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-steel-900">{item.severity}</span>
                      <span className="font-medium text-amber-700">{item.interval}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Compliance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Overall compliance rate</span>
                    <span className="font-bold text-green-600">87.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Avg delay (overdue cases)</span>
                    <span className="font-bold text-amber-600">4.2 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">No-show rate</span>
                    <span className="font-bold text-red-600">12.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Automatic reminders sent</span>
                    <span className="font-bold text-blue-600">156 this month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <ValvePatientHeatmap />;
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
                Valvular Disease Service Line Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced Analytics for Valve Repair, Replacement, and Surveillance
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
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

export default ValvularServiceLineView;