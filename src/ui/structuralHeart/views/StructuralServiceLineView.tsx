import React, { useState } from 'react';
import { Heart, Users, Calendar, Shield, Gauge, Activity, Target, BarChart3, FileText, TrendingUp, Search } from 'lucide-react';

// Import Structural Heart components
import STSRiskCalculator from '../components/STSRiskCalculator';
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';
import SHClinicalGapDetectionDashboard from '../components/clinical/SHClinicalGapDetectionDashboard';
import SHProviderScorecard from '../components/service-line/SHProviderScorecard';
import SHPhenotypeDetection from '../components/SHPhenotypeDetectionChart';
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import CrossReferralEngine from '../../../components/crossReferral/CrossReferralEngine';

type TabId = 'tavr' | 'teer-mitral' | 'teer-tricuspid' | 'tmvr' | 'pfo-asd' | 'sts-risk' | 'referrals' | 'analytics' | 'outcomes' | 'quality' | 'reporting' | 'gap-detection' | 'provider-scorecard' | 'phenotype-detection' | 'risk-heatmap' | 'care-network' | 'cross-referral';

interface TabGroup {
  label: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const StructuralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('gap-detection');

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const tabGroups: TabGroup[] = [
    {
      label: 'Procedure Analytics',
      tabs: [
        { id: 'tavr', label: 'TAVR Analytics', icon: Heart, description: 'TAVR procedure analytics and outcomes' },
        { id: 'teer-mitral', label: 'TEER Mitral', icon: Activity, description: 'MitraClip procedure funnel' },
        { id: 'teer-tricuspid', label: 'TEER Tricuspid', icon: Target, description: 'Tricuspid TEER pathway' },
        { id: 'tmvr', label: 'TMVR', icon: Shield, description: 'Transcatheter mitral valve replacement' },
        { id: 'pfo-asd', label: 'PFO/ASD', icon: Shield, description: 'Patent foramen ovale and atrial septal defect closure' },
      ],
    },
    {
      label: 'Risk & Quality',
      tabs: [
        { id: 'sts-risk', label: 'STS Risk', icon: Gauge, description: 'STS risk calculator' },
        { id: 'analytics', label: 'Procedure Analytics', icon: BarChart3, description: 'Advanced analytics dashboard' },
        { id: 'quality', label: 'Quality', icon: Target, description: 'Quality metrics and benchmarks' },
        { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Clinical outcomes tracking' },
      ],
    },
    {
      label: 'Gap & Opportunity',
      tabs: [
        { id: 'gap-detection', label: 'Gap Detection (20-Gap)', icon: Search, description: 'AI-driven clinical gap detection across 14 structural heart gaps' },
      ],
    },
    {
      label: 'Care Coordination',
      tabs: [
        { id: 'referrals', label: 'Referral Network', icon: Users, description: 'Heart team referral patterns' },
        { id: 'provider-scorecard', label: 'Provider Scorecard', icon: Users, description: 'Individual structural heart provider performance analytics' },
        { id: 'cross-referral', label: 'Cross-Referral Engine', icon: Heart, description: 'Cross-specialty referral pathways for structural heart' },
      ],
    },
    {
      label: 'Analytics & Reporting',
      tabs: [
        { id: 'risk-heatmap', label: 'Patient Risk Heatmap', icon: Target, description: 'Interactive structural heart risk visualization matrix' },
        { id: 'care-network', label: 'Care Team Network', icon: Users, description: 'Structural heart care team collaboration patterns' },
        { id: 'phenotype-detection', label: 'Phenotype Detection', icon: Search, description: 'SH phenotype prevalence and detection rates' },
        { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Automated reports and exports' },
      ],
    },
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
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Activity className="w-8 h-8 text-arterial-600" />
              TEER Mitral (MitraClip) Funnel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { stage: 'Screening', patients: 247, rate: '100%', bgColor: 'bg-chrome-50', borderColor: 'border-chrome-200', textColor: 'text-chrome-600' },
                { stage: 'Suitable', patients: 189, rate: '76.5%', bgColor: 'bg-[#C8D4DC]', borderColor: 'border-[#2C4A60]', textColor: 'text-[#2C4A60]' },
                { stage: 'Scheduled', patients: 156, rate: '82.5%', bgColor: 'bg-[#F0F5FA]', borderColor: 'border-[#C8D4DC]', textColor: 'text-[#6B7280]' },
                { stage: 'Completed', patients: 142, rate: '91.0%', bgColor: 'bg-arterial-50', borderColor: 'border-arterial-200', textColor: 'text-arterial-600' }
              ].map((item, index) => (
                <div key={item.stage} className={`text-center p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
                  <div className={`text-3xl font-bold ${item.textColor} mb-2`}>{item.patients}</div>
                  <div className="font-semibold text-titanium-900">{item.stage}</div>
                  <div className={`text-sm ${item.textColor}`}>{item.rate}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Suitability Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Moderate-to-severe MR</span><span className="text-[#2C4A60]">&#10003; Met</span></div>
                  <div className="flex justify-between"><span>Disease Stage &#8805;20%</span><span className="text-[#2C4A60]">&#10003; Met</span></div>
                  <div className="flex justify-between"><span>Appropriate anatomy</span><span className="text-[#6B7280]">Review</span></div>
                  <div className="flex justify-between"><span>Heart team evaluation</span><span className="text-[#2C4A60]">&#10003; Met</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Recent Outcomes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>30-day mortality</span><span className="font-medium">2.1%</span></div>
                  <div className="flex justify-between"><span>Procedural success</span><span className="font-medium">96.8%</span></div>
                  <div className="flex justify-between"><span>MR reduction &#8805;1 grade</span><span className="font-medium">94.2%</span></div>
                  <div className="flex justify-between"><span>Length of stay</span><span className="font-medium">2.3 days</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'teer-tricuspid':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-arterial-600" />
              TEER Tricuspid Pathway
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { stage: 'Evaluation', patients: 89, status: 'Active' },
                { stage: 'Approved', patients: 34, status: 'In Progress' },
                { stage: 'Completed', patients: 12, status: 'Success' }
              ].map((item, index) => (
                <div key={item.stage} className="text-center p-6 rounded-xl bg-arterial-50 border border-arterial-200">
                  <div className="text-3xl font-bold text-arterial-600 mb-2">{item.patients}</div>
                  <div className="font-semibold text-titanium-900">{item.stage}</div>
                  <div className="text-sm text-arterial-600">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'tmvr':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-arterial-600" />
              TMVR Candidate Assessment
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Inclusion Criteria</h4>
                <div className="space-y-3">
                  {[
                    { criteria: 'Severe MS or MR', met: true },
                    { criteria: 'High surgical risk', met: true },
                    { criteria: 'Suitable anatomy', met: true },
                    { criteria: 'Disease Stage \u226520%', met: true },
                    { criteria: 'Heart team approval', met: false }
                  ].map((item, index) => (
                    <div key={item.criteria} className={`p-3 rounded-lg border ${
                      item.met ? 'bg-[#C8D4DC] border-[#2C4A60]' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-titanium-900">{item.criteria}</span>
                        <span className={`font-medium ${item.met ? 'text-[#2C4A60]' : 'text-red-600'}`}>
                          {item.met ? '\u2713 Met' : '\u2717 Not Met'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Procedure Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Total Procedures</span>
                    <span className="font-bold text-titanium-900">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Success Rate</span>
                    <span className="font-bold text-[#2C4A60]">94.4%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Complication Rate</span>
                    <span className="font-bold text-[#6B7280]">5.6%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Avg Procedure Time</span>
                    <span className="font-bold text-titanium-900">120 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'pfo-asd':
        return (
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-arterial-600" />
              PFO/ASD Closure Assessment
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Closure Criteria</h4>
                <div className="space-y-3">
                  {[
                    { criteria: 'Cryptogenic stroke', met: true },
                    { criteria: 'Age <60 years', met: true },
                    { criteria: 'Suitable anatomy', met: true },
                    { criteria: 'High-risk PFO features', met: true },
                    { criteria: 'No other stroke etiology', met: false }
                  ].map((item, index) => (
                    <div key={item.criteria} className={`p-3 rounded-lg border ${
                      item.met ? 'bg-[#C8D4DC] border-[#2C4A60]' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-titanium-900">{item.criteria}</span>
                        <span className={`font-medium ${item.met ? 'text-[#2C4A60]' : 'text-red-600'}`}>
                          {item.met ? '\u2713 Met' : '\u2717 Not Met'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-titanium-200">
                <h4 className="font-semibold text-titanium-900 mb-4">Procedure Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Total Closures</span>
                    <span className="font-bold text-titanium-900">67</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Success Rate</span>
                    <span className="font-bold text-[#2C4A60]">98.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Complication Rate</span>
                    <span className="font-bold text-[#6B7280]">1.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-titanium-600">Avg Procedure Time</span>
                    <span className="font-bold text-titanium-900">30 min</span>
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
          <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-titanium-900 mb-6">Clinical Outcomes Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { metric: '30-Day Mortality', value: '1.8%', benchmark: '2.5%', trend: 'down' },
                { metric: 'Stroke Rate', value: '1.2%', benchmark: '1.8%', trend: 'down' },
                { metric: 'Readmission Rate', value: '8.4%', benchmark: '12.0%', trend: 'down' }
              ].map((item, index) => (
                <div key={item.metric} className="bg-white p-6 rounded-xl border border-titanium-200">
                  <h4 className="font-semibold text-titanium-900 mb-2">{item.metric}</h4>
                  <div className="text-3xl font-bold text-arterial-600 mb-1">{item.value}</div>
                  <div className="text-sm text-titanium-600">Benchmark: {item.benchmark}</div>
                  <div className="text-xs text-[#2C4A60]">&darr; Better than benchmark</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'quality':
        return (
          <div className="space-y-6">
            <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
                <Target className="w-8 h-8 text-arterial-600" />
                Quality Metrics & Benchmarks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { metric: '30-Day Mortality', value: '1.8%', benchmark: '<2.5%', met: true },
                  { metric: 'Stroke Rate', value: '1.2%', benchmark: '<2.0%', met: true },
                  { metric: 'Paravalvular Leak', value: '3.4%', benchmark: '<5.0%', met: true },
                  { metric: '30-Day Readmission', value: '8.4%', benchmark: '<12.0%', met: true }
                ].map((item, index) => (
                  <div key={item.metric} className={`p-6 rounded-xl border ${item.met ? 'bg-[#C8D4DC] border-[#2C4A60]' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-2xl font-bold text-titanium-900 mb-1">{item.value}</div>
                    <div className="font-medium text-titanium-800 text-sm">{item.metric}</div>
                    <div className={`text-xs mt-2 ${item.met ? 'text-[#2C4A60]' : 'text-red-600'}`}>
                      Benchmark: {item.benchmark} {item.met ? '\u2713' : '\u2717'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-titanium-200">
                  <h4 className="font-semibold text-titanium-900 mb-4">STS/ACC TVT Registry Metrics</h4>
                  <div className="space-y-3">
                    {[
                      { metric: 'TAVR In-Hospital Mortality', value: '1.4%', percentile: '92nd' },
                      { metric: 'New Pacemaker Rate', value: '12.3%', percentile: '75th' },
                      { metric: 'Major Vascular Complication', value: '2.1%', percentile: '88th' },
                      { metric: 'Moderate+ PVL', value: '3.4%', percentile: '82nd' },
                      { metric: 'Acute Kidney Injury', value: '1.8%', percentile: '90th' }
                    ].map((item, index) => (
                      <div key={item.metric} className="flex items-center justify-between p-3 bg-arterial-50 rounded-lg">
                        <span className="text-titanium-800 text-sm">{item.metric}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-titanium-900">{item.value}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-[#C8D4DC] text-[#2C4A60]">{item.percentile}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-titanium-200">
                  <h4 className="font-semibold text-titanium-900 mb-4">MitraClip Quality Indicators</h4>
                  <div className="space-y-3">
                    {[
                      { metric: 'Technical Success Rate', value: '96.8%', status: 'Excellent' },
                      { metric: 'MR Reduction to \u22642+', value: '94.2%', status: 'Excellent' },
                      { metric: '30-Day Mortality', value: '2.1%', status: 'Below Benchmark' },
                      { metric: 'Heart Team Review Rate', value: '98.0%', status: 'Excellent' },
                      { metric: 'Discharge <3 Days', value: '78.5%', status: 'Good' }
                    ].map((item, index) => (
                      <div key={item.metric} className="flex items-center justify-between p-3 bg-chrome-50 rounded-lg">
                        <span className="text-titanium-800 text-sm">{item.metric}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-titanium-900">{item.value}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'Excellent' ? 'bg-[#C8D4DC] text-[#2C4A60]' :
                            item.status === 'Good' ? 'bg-chrome-100 text-chrome-700' :
                            'bg-[#F0F5FA] text-[#6B7280]'
                          }`}>{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'reporting':
        return <AutomatedReportingSystem />;
      case 'risk-heatmap':
        return <PatientRiskHeatmap />;
      case 'care-network':
        return <CareTeamNetworkGraph />;
      case 'gap-detection':
        return <SHClinicalGapDetectionDashboard />;
      case 'provider-scorecard':
        return <SHProviderScorecard />;
      case 'phenotype-detection':
        return <SHPhenotypeDetection />;
      case 'cross-referral':
        return <CrossReferralEngine />;
      default:
        return <TAVRAnalyticsDashboard />;
    }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Tab Navigation — Grouped */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
          {tabGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Section Divider */}
              {groupIdx > 0 && <div className="border-t border-titanium-100 my-4" />}
              <div className="mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-titanium-400">{group.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-2">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as TabId)}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-porsche-50 border-porsche-200 text-porsche-600 shadow-lg scale-105'
                          : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon className={`w-6 h-6 ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
                        <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
                          {tab.label}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-porsche-400 to-porsche-500 rounded-xl opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
