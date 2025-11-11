import React, { useState } from 'react';
import { Heart, Users, Calendar, Shield, Gauge, Activity, Target, BarChart3, FileText, TrendingUp } from 'lucide-react';

// Import Structural Heart components
import STSRiskCalculator from '../components/STSRiskCalculator';
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';

type TabId = 'tavr' | 'teer-mitral' | 'teer-tricuspid' | 'watchman' | 'sts-risk' | 'referrals' | 'analytics' | 'outcomes' | 'quality' | 'reporting';

const StructuralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tavr');

  const tabs = [
    { id: 'tavr', label: 'TAVR Analytics', icon: Heart, description: 'TAVR procedure analytics and outcomes' },
    { id: 'teer-mitral', label: 'TEER Mitral', icon: Activity, description: 'MitraClip procedure funnel' },
    { id: 'teer-tricuspid', label: 'TEER Tricuspid', icon: Target, description: 'Tricuspid TEER pathway' },
    { id: 'watchman', label: 'LAAC/Watchman', icon: Shield, description: 'Left atrial appendage closure criteria' },
    { id: 'sts-risk', label: 'STS Risk', icon: Gauge, description: 'STS risk calculator' },
    { id: 'referrals', label: 'Referral Network', icon: Users, description: 'Heart team referral patterns' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced analytics dashboard' },
    { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Clinical outcomes tracking' },
    { id: 'quality', label: 'Quality', icon: Target, description: 'Quality metrics and benchmarks' },
    { id: 'reporting', label: 'Reporting', icon: FileText, description: 'Automated reports and exports' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tavr':
        return <TAVRAnalyticsDashboard />;
      case 'sts-risk':
        return <STSRiskCalculator />;
      case 'referrals':
        return <StructuralReferralNetworkVisualization />;
      case 'teer-mitral':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Activity className="w-8 h-8 text-medical-purple-600" />
              TEER Mitral (MitraClip) Funnel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { stage: 'Screening', patients: 247, rate: '100%', color: 'blue' },
                { stage: 'Suitable', patients: 189, rate: '76.5%', color: 'green' },
                { stage: 'Scheduled', patients: 156, rate: '82.5%', color: 'amber' },
                { stage: 'Completed', patients: 142, rate: '91.0%', color: 'purple' }
              ].map((item, index) => (
                <div key={index} className={`text-center p-6 rounded-xl bg-${item.color}-50 border border-${item.color}-200`}>
                  <div className={`text-3xl font-bold text-${item.color}-600 mb-2`}>{item.patients}</div>
                  <div className="font-semibold text-steel-900">{item.stage}</div>
                  <div className={`text-sm text-${item.color}-600`}>{item.rate}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Suitability Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Moderate-to-severe MR</span><span className="text-green-600">✓ Met</span></div>
                  <div className="flex justify-between"><span>LVEF ≥20%</span><span className="text-green-600">✓ Met</span></div>
                  <div className="flex justify-between"><span>Appropriate anatomy</span><span className="text-amber-600">Review</span></div>
                  <div className="flex justify-between"><span>Heart team evaluation</span><span className="text-green-600">✓ Met</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Recent Outcomes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>30-day mortality</span><span className="font-medium">2.1%</span></div>
                  <div className="flex justify-between"><span>Procedural success</span><span className="font-medium">96.8%</span></div>
                  <div className="flex justify-between"><span>MR reduction ≥1 grade</span><span className="font-medium">94.2%</span></div>
                  <div className="flex justify-between"><span>Length of stay</span><span className="font-medium">2.3 days</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'teer-tricuspid':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-medical-purple-600" />
              TEER Tricuspid Pathway
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { stage: 'Evaluation', patients: 89, status: 'Active' },
                { stage: 'Approved', patients: 34, status: 'In Progress' },
                { stage: 'Completed', patients: 12, status: 'Success' }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{item.patients}</div>
                  <div className="font-semibold text-steel-900">{item.stage}</div>
                  <div className="text-sm text-purple-600">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'watchman':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-medical-purple-600" />
              LAAC/Watchman Criteria Checker
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Inclusion Criteria</h4>
                <div className="space-y-3">
                  {[
                    { criteria: 'Non-valvular AF', met: true },
                    { criteria: 'CHA₂DS₂-VASc ≥2', met: true },
                    { criteria: 'Contraindication to OAC', met: true },
                    { criteria: 'Life expectancy >1 year', met: true },
                    { criteria: 'Suitable anatomy', met: false }
                  ].map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      item.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-steel-900">{item.criteria}</span>
                        <span className={`font-medium ${item.met ? 'text-green-600' : 'text-red-600'}`}>
                          {item.met ? '✓ Met' : '✗ Not Met'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Procedure Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Total Procedures</span>
                    <span className="font-bold text-steel-900">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Success Rate</span>
                    <span className="font-bold text-green-600">97.4%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Complication Rate</span>
                    <span className="font-bold text-amber-600">2.6%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Avg Procedure Time</span>
                    <span className="font-bold text-steel-900">45 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return <TAVRAnalyticsDashboard />;
      case 'outcomes':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6">Clinical Outcomes Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { metric: '30-Day Mortality', value: '1.8%', benchmark: '2.5%', trend: 'down' },
                { metric: 'Stroke Rate', value: '1.2%', benchmark: '1.8%', trend: 'down' },
                { metric: 'Readmission Rate', value: '8.4%', benchmark: '12.0%', trend: 'down' }
              ].map((item, index) => (
                <div key={index} className="bg-white p-6 rounded-xl border border-steel-200">
                  <h4 className="font-semibold text-steel-900 mb-2">{item.metric}</h4>
                  <div className="text-3xl font-bold text-medical-purple-600 mb-1">{item.value}</div>
                  <div className="text-sm text-steel-600">Benchmark: {item.benchmark}</div>
                  <div className="text-xs text-green-600">↓ Better than benchmark</div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <TAVRAnalyticsDashboard />;
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
                Structural Heart Service Line Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced Analytics for TAVR, TEER, and Structural Heart Interventions
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

export default StructuralServiceLineView;