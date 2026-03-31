import React, { useState } from 'react';
import { Zap, Target, Grid3X3, BarChart3, Users, Activity, Heart, Shield, Network, Award, FileText, TrendingUp, PieChart, Search } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';

// Import EP components
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import EPEquityAnalysis from '../components/service-line/EPEquityAnalysis';
import EPOutcomesByCohort from '../components/service-line/EPOutcomesByCohort';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

import EPClinicalGapDetectionDashboard from '../components/clinical/EPClinicalGapDetectionDashboard';
import EPPhenotypeDetectionChart from '../components/EPPhenotypeDetectionChart';
import EPOutcomesTrends from '../components/executive/EPOutcomesTrends';
import { electrophysiologyServiceLineConfig } from '../config/serviceLineConfig';

// Electrophysiology Analytics Dashboard
const ElectrophysiologyAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">AFib Ablations</h4>
        <div className="text-2xl font-bold text-titanium-900">1,234</div>
        <div className="text-sm text-[#2C4A60]">+14.7% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">LAAC Procedures</h4>
        <div className="text-2xl font-bold text-titanium-900">456</div>
        <div className="text-sm text-[#2C4A60]">+28.3% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">Device Implants</h4>
        <div className="text-2xl font-bold text-titanium-900">789</div>
        <div className="text-sm text-[#2C4A60]">+9.2% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">Lead Extractions</h4>
        <div className="text-2xl font-bold text-titanium-900">123</div>
        <div className="text-sm text-[#2C4A60]">+6.5% vs last quarter</div>
      </div>
    </div>
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-[#2C4A60]" />
        Analytics Overview
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive electrophysiology analytics including AFib ablations, LAAC procedures, device implantations, arrhythmia management, and anticoagulation optimization.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">AFib Excellence</h4>
          <p className="text-sm text-titanium-600">Advanced atrial fibrillation management with optimal ablation outcomes and stroke prevention</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Device Innovation</h4>
          <p className="text-sm text-titanium-600">Comprehensive device management including implants, extractions, and remote monitoring</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">LAAC Program</h4>
          <p className="text-sm text-titanium-600">Left atrial appendage closure program with comprehensive stroke prevention analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// Arrhythmia Management
const ArrhythmiaManagement: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-[#2C4A60]" />
        Arrhythmia Management Analytics
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive arrhythmia management and treatment optimization analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">AFib Management</h4>
          <p className="text-sm text-titanium-600">Rate vs rhythm control strategies, anticoagulation management, and outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">VT/VF Management</h4>
          <p className="text-sm text-titanium-600">Ventricular arrhythmia management, ICD therapy optimization, and ablation outcomes</p>
        </div>
      </div>
    </div>
  </div>
);

// EP Provider Performance
const EPProviderPerformance: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-[#2C4A60]" />
        EP Provider Performance
      </h3>
      <p className="text-titanium-600 mb-6">Individual electrophysiologist performance metrics and outcomes tracking.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Ablation Specialists</h4>
          <p className="text-sm text-titanium-600">AFib ablation success rates, procedure times, and complication tracking</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Device Specialists</h4>
          <p className="text-sm text-titanium-600">Device implant success, extraction outcomes, and programming optimization</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const EPQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-[#2C4A60]" />
        EP Quality Metrics
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive quality indicators for electrophysiology programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Ablation Quality</h4>
          <p className="text-sm text-titanium-600">Success rates, freedom from arrhythmia, and procedural complications</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Device Quality</h4>
          <p className="text-sm text-titanium-600">Implant success rates, lead performance, and device longevity metrics</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f5fa] to-[#F0F5FA] p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Stroke Prevention</h4>
          <p className="text-sm text-titanium-600">Anticoagulation adherence, LAAC outcomes, and stroke risk reduction</p>
        </div>
      </div>
    </div>
  </div>
);

const epGapSubTabs = [
  { id: 'all', label: 'All Gaps', keywords: [] as string[] },
  { id: 'af', label: 'AF Management', keywords: ['persistent af', 'rhythm control', 'rate control', 'east-afnet', 'cardioversion', 'early rhythm', 'af recurrence', 'af rate', 'flutter'] },
  { id: 'anticoag', label: 'Anticoagulation', keywords: ['oac', 'cha', 'anticoagulation not', 'subclinical af', 'undertreatment', 'tee not', 'aspirin + oac'] },
  { id: 'ablation', label: 'Ablation Candidates', keywords: ['ablation', 'pfa', 'svt', 'avnrt', 'avrt', 'vt ablation', 'epicardial', 'csp', 'zero-fluoroscopy', 'castle-af', 'vanish', 'partita'] },
  { id: 'device', label: 'Device Therapy', keywords: ['icd', 'laac', 'leadless', 'subcutaneous icd', 'crt', 'battery', 'eri', 'eol', 'lead recall', 'device infection', 'cardiac arrest survivor'] },
  { id: 'drugsafety', label: 'Drug Safety', keywords: ['amiodarone', 'dofetilide', 'dronedarone', 'qtc', 'lqts', 'torsades', 'aad not discontinued', 'rems'] },
  { id: 'diagnostics', label: 'Diagnostics & Syncope', keywords: ['syncope', 'loop recorder', 'ilr', 'pvc burden', 'wpw', 'fontan', 'adult congenital', 'carotid', 'cryptogenic', 'inappropriate sinus'] },
];

type EPServiceLineTab =
  | 'analytics'
  | 'heatmap'
  | 'phenotype-detection'
  | 'gap-detection'
  | 'arrhythmia'
  | 'laac-risk'
  | 'safety'
  | 'automated-support'
  | 'device-network'
  | 'network'
  | 'providers'
  | 'quality'
  | 'outcomes-trends'
  | 'equity-analysis'
  | 'outcomes-cohort'
  | 'reporting';

interface TabGroup {
  label: string;
  color: string;
  colorBg: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const EPServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EPServiceLineTab>('gap-detection');
  const [activeGapSubTab, setActiveGapSubTab] = useState<string>('all');

  const handleTabChange = (tab: EPServiceLineTab) => {
    setActiveTab(tab);
    if (tab !== 'gap-detection') {
      setActiveGapSubTab('all');
    }
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };

  const tabGroups: TabGroup[] = [
    {
      label: 'Clinical Analytics',
      color: '#2C4A60',
      colorBg: 'rgba(44, 74, 96, 0.08)',
      tabs: [
        { id: 'analytics', label: 'EP Analytics', icon: Target, description: 'Comprehensive electrophysiology analytics dashboard' },
        { id: 'heatmap', label: 'Risk Heatmap', icon: Grid3X3, description: 'EP patient risk visualization matrix' },
        { id: 'phenotype-detection', label: 'Phenotyping', icon: Search, description: 'EP phenotype prevalence and detection rates' },
      ],
    },
    {
      label: 'Gap & Opportunity',
      color: '#C4982A',
      colorBg: 'rgba(196, 152, 42, 0.10)',
      tabs: [
        { id: 'gap-detection', label: 'Gap Detection', icon: Search, description: 'AI-driven EP clinical gap detection' },
      ],
    },
    {
      label: 'Clinical Tools',
      color: '#1A6878',
      colorBg: 'rgba(26, 104, 120, 0.08)',
      tabs: [
        { id: 'arrhythmia', label: 'Arrhythmia Management', icon: Activity, description: 'Comprehensive arrhythmia treatment optimization' },
        { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Anticoagulation safety and contraindication screening' },
        { id: 'laac-risk', label: 'LAAC Risk Dashboard', icon: Heart, description: 'Left atrial appendage closure risk assessment' },
        { id: 'automated-support', label: 'Clinical Automation', icon: Zap, description: 'Automated EP clinical support and recommendations' },
      ],
    },
    {
      label: 'Care Coordination',
      color: '#9B2438',
      colorBg: 'rgba(155, 36, 56, 0.08)',
      tabs: [
        { id: 'device-network', label: 'Device Network', icon: Network, description: 'EP device utilization and network analysis' },
        { id: 'network', label: 'Care Team Network', icon: Network, description: 'EP care team collaboration and referral patterns' },
        { id: 'providers', label: 'Provider Performance', icon: Users, description: 'Electrophysiologist performance metrics and outcomes' },
      ],
    },
    {
      label: 'Outcomes & Reporting',
      color: '#2D6147',
      colorBg: 'rgba(45, 97, 71, 0.10)',
      tabs: [
        { id: 'quality', label: 'Quality Metrics', icon: Award, description: 'EP quality indicators and outcome measures' },
        { id: 'outcomes-trends', label: 'Outcomes Trends', icon: TrendingUp, description: 'EP outcomes trends and longitudinal analysis' },
        { id: 'equity-analysis', label: 'Equity Analysis', icon: PieChart, description: 'Health equity analysis across patient demographics' },
        { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Scheduled reporting and data exports' },
      ],
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics': return <ElectrophysiologyAnalytics />;
      case 'heatmap': return <PatientRiskHeatmap />;
      case 'phenotype-detection': return <EPPhenotypeDetectionChart />;
      case 'arrhythmia': return <ArrhythmiaManagement />;
      case 'laac-risk': return <LAACRiskDashboard />;
      case 'safety': return <AnticoagulationSafetyChecker />;
      case 'automated-support': return <EPAutomatedClinicalSupport />;
      case 'device-network': return <EPDeviceNetworkVisualization />;
      case 'network': return <CareTeamNetworkGraph />;
      case 'providers': return <EPProviderPerformance />;
      case 'quality': return <EPQualityMetrics />;
      case 'outcomes-trends': return <EPOutcomesTrends />;
      case 'equity-analysis': return <EPEquityAnalysis />;
      case 'outcomes-cohort': return <EPOutcomesByCohort />;
      case 'reporting': return <AutomatedReportingSystem />;
      case 'gap-detection':
        return (
          <div>
            {/* Gap Sub-Navigation */}
            <div className="mb-4 bg-white rounded-xl border border-titanium-200 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-titanium-500 mb-3">Gap Category</div>
              <div className="flex flex-wrap gap-2">
                {epGapSubTabs.map(sub => {
                  const isActive = activeGapSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveGapSubTab(sub.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={isActive ? { backgroundColor: '#2C4A60' } : {}}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <EPClinicalGapDetectionDashboard
              categoryFilter={activeGapSubTab === 'all' ? undefined : {
                label: epGapSubTabs.find(s => s.id === activeGapSubTab)?.label || '',
                keywords: epGapSubTabs.find(s => s.id === activeGapSubTab)?.keywords || []
              }}
            />
          </div>
        );
      default: return <ElectrophysiologyAnalytics />;
    }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Export Action */}
        <div className="flex justify-end">
          <ExportButton
            data={electrophysiologyServiceLineConfig.exportData?.providers || {
              filename: 'ep-service-line-export',
              title: 'Electrophysiology Service Line Report',
              headers: ['Metric', 'Value'],
              rows: [['AFib Ablations', '1,234'], ['LAAC Procedures', '456']]
            }}
            variant="outline"
            size="sm"
            className="shadow-lg hover:shadow-xl transition-all duration-300"
          />
        </div>

        {/* Tab Navigation — Grouped */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
          {tabGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {groupIdx > 0 && <div className="border-t border-titanium-100 my-4" />}
              <div className="mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>{group.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-2">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as EPServiceLineTab)}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'shadow-lg scale-105'
                          : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
                      }`}
                      style={isActive ? {
                        background: group.colorBg,
                        borderColor: group.color,
                        color: group.color,
                      } : {}}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon
                          className="w-6 h-6"
                          style={{ color: isActive ? group.color : undefined }}
                        />
                        <span
                          className={`text-xs font-semibold text-center leading-tight ${!isActive ? 'text-titanium-600 group-hover:text-titanium-800' : ''}`}
                          style={isActive ? { color: group.color } : {}}
                        >
                          {tab.label}
                        </span>
                      </div>
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
                          style={{ background: group.color }}
                        />
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

export default EPServiceLineView;
