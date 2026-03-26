import React, { useState } from 'react';
import { Zap, Target, Grid3X3, BarChart3, Users, Activity, Heart, Shield, Network, Award, FileText, TrendingUp, PieChart, Search } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';

// Import EP components
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import EPPhysicianPerformanceHeatmap from '../components/service-line/EPPhysicianPerformanceHeatmap';
import EPEquityAnalysis from '../components/service-line/EPEquityAnalysis';
import EPOutcomesByCohort from '../components/service-line/EPOutcomesByCohort';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

import EPClinicalGapDetectionDashboard from '../components/clinical/EPClinicalGapDetectionDashboard';
import EPPhenotypeDetectionChart from '../components/EPPhenotypeDetectionChart';
import EPOutcomesTrends from '../components/executive/EPOutcomesTrends';
import EPRiskStratification from '../components/executive/EPRiskStratification';
import { electrophysiologyServiceLineConfig } from '../config/serviceLineConfig';

// Electrophysiology Analytics Dashboard
const ElectrophysiologyAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">AFib Ablations</h4>
 <div className="text-2xl font-bold text-titanium-900">1,234</div>
 <div className="text-sm text-green-600">+14.7% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">LAAC Procedures</h4>
 <div className="text-2xl font-bold text-titanium-900">456</div>
 <div className="text-sm text-green-600">+28.3% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Device Implants</h4>
 <div className="text-2xl font-bold text-titanium-900">789</div>
 <div className="text-sm text-green-600">+9.2% vs last quarter</div>
 </div>
 <div className="metal-card p-6">
 <h4 className="text-sm font-medium text-titanium-600 mb-2">Lead Extractions</h4>
 <div className="text-2xl font-bold text-titanium-900">123</div>
 <div className="text-sm text-green-600">+6.5% vs last quarter</div>
 </div>
 </div>
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-medical-green-600" />
 Analytics Overview
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive electrophysiology analytics including AFib ablations, LAAC procedures, device implantations, arrhythmia management, and anticoagulation optimization.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">AFib Excellence</h4>
 <p className="text-sm text-titanium-600">Advanced atrial fibrillation management with optimal ablation outcomes and stroke prevention</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Device Innovation</h4>
 <p className="text-sm text-titanium-600">Comprehensive device management including implants, extractions, and remote monitoring</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">LAAC Program</h4>
 <p className="text-sm text-titanium-600">Left atrial appendage closure program with comprehensive stroke prevention analytics</p>
 </div>
 </div>
 </div>
  </div>
);

// EP Procedure Analytics
const EPProcedureAnalytics: React.FC = () => (
  <div className="space-y-6">
 <div className="metal-card p-8">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <BarChart3 className="w-5 h-5 text-medical-green-600" />
 EP Procedure Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive electrophysiology procedure performance analytics.</p>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Ablation Procedures</h4>
 <p className="text-sm text-titanium-600">AFib, AFL, VT, and SVT ablation success rates, recurrence tracking, and complications</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Device Procedures</h4>
 <p className="text-sm text-titanium-600">Pacemaker, ICD, CRT implants, upgrades, and lead extraction analytics</p>
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
 <Users className="w-5 h-5 text-medical-green-600" />
 EP Provider Performance
 </h3>
 <p className="text-titanium-600 mb-6">Individual electrophysiologist performance metrics and outcomes tracking.</p>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Ablation Specialists</h4>
 <p className="text-sm text-titanium-600">AFib ablation success rates, procedure times, and complication tracking</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Device Specialists</h4>
 <p className="text-sm text-titanium-600">Device implant success, extraction outcomes, and programming optimization</p>
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
 <Activity className="w-5 h-5 text-medical-green-600" />
 Arrhythmia Management Analytics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive arrhythmia management and treatment optimization analytics.</p>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">AFib Management</h4>
 <p className="text-sm text-titanium-600">Rate vs rhythm control strategies, anticoagulation management, and outcomes</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">VT/VF Management</h4>
 <p className="text-sm text-titanium-600">Ventricular arrhythmia management, ICD therapy optimization, and ablation outcomes</p>
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
 <Award className="w-5 h-5 text-medical-green-600" />
 EP Quality Metrics
 </h3>
 <p className="text-titanium-600 mb-6">Comprehensive quality indicators for electrophysiology programs.</p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Ablation Quality</h4>
 <p className="text-sm text-titanium-600">Success rates, freedom from arrhythmia, and procedural complications</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Device Quality</h4>
 <p className="text-sm text-titanium-600">Implant success rates, lead performance, and device longevity metrics</p>
 </div>
 <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
 <h4 className="font-semibold text-titanium-900 mb-2">Stroke Prevention</h4>
 <p className="text-sm text-titanium-600">Anticoagulation adherence, LAAC outcomes, and stroke risk reduction</p>
 </div>
 </div>
 </div>
  </div>
);

type EPServiceLineTab =
  | 'analytics'
  | 'heatmap'
  | 'procedures'
  | 'providers'
  | 'physician-heatmap'
  | 'gap-detection'
  | 'outcomes-trends'
  | 'risk-stratification'
  | 'phenotype-detection'
  | 'arrhythmia'
  | 'laac-risk'
  | 'safety'
  | 'automated-support'
  | 'device-network'
  | 'network'
  | 'quality'
  | 'equity-analysis'
  | 'outcomes-cohort'
  | 'reporting';

interface TabGroup {
  label: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const EPServiceLineView: React.FC = () => {
  const [activeTab, _setActiveTab] = useState<EPServiceLineTab>('analytics');
  const setActiveTab = (tab: EPServiceLineTab) => {
    _setActiveTab(tab);
    const scrollContainer = document.querySelector('.overflow-y-auto.h-screen');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabGroups: TabGroup[] = [
 {
 label: 'Clinical Analytics',
 tabs: [
 { id: 'analytics', label: 'EP Analytics', icon: Target, description: 'Comprehensive electrophysiology analytics dashboard' },
 { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'EP patient risk visualization matrix' },
 { id: 'procedures', label: 'Procedure Analytics', icon: BarChart3, description: 'AFib ablation, LAAC, and device procedure metrics' },
 { id: 'providers', label: 'Provider Performance', icon: Users, description: 'Electrophysiologist performance metrics and outcomes' },
 { id: 'physician-heatmap', label: 'Provider Heatmap', icon: TrendingUp, description: 'EP physician performance visualization matrix' },
 ],
 },
 {
 label: 'Gap & Opportunity',
 tabs: [
 { id: 'gap-detection', label: 'Gap Detection (27-Gap)', icon: Search, description: 'AI-driven EP clinical gap detection' },
 { id: 'outcomes-trends', label: 'Outcomes Trends', icon: TrendingUp, description: 'EP outcomes trends and longitudinal analysis' },
 { id: 'risk-stratification', label: 'Risk Stratification', icon: Target, description: 'EP patient risk stratification dashboard' },
 { id: 'phenotype-detection', label: 'Phenotype Detection', icon: Search, description: 'EP phenotype prevalence and detection rates' },
 ],
 },
 {
 label: 'Clinical Tools',
 tabs: [
 { id: 'arrhythmia', label: 'Arrhythmia Management', icon: Activity, description: 'Comprehensive arrhythmia treatment optimization' },
 { id: 'laac-risk', label: 'LAAC Risk Dashboard', icon: Heart, description: 'Left atrial appendage closure risk assessment' },
 { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Anticoagulation safety and contraindication screening' },
 { id: 'automated-support', label: 'Clinical Automation', icon: Zap, description: 'Automated EP clinical support and recommendations' },
 ],
 },
 {
 label: 'Care Coordination',
 tabs: [
 { id: 'device-network', label: 'Device Network', icon: Network, description: 'EP device utilization and network analysis' },
 { id: 'network', label: 'Care Team Network', icon: Network, description: 'EP care team collaboration and referral patterns' },
 ],
 },
 {
 label: 'Outcomes & Reporting',
 tabs: [
 { id: 'quality', label: 'Quality Metrics', icon: Award, description: 'EP quality indicators and outcome measures' },
 { id: 'equity-analysis', label: 'Equity Analysis', icon: PieChart, description: 'Health equity analysis across patient demographics' },
 { id: 'outcomes-cohort', label: 'Outcomes by Cohort', icon: BarChart3, description: 'Clinical outcomes comparison by patient cohorts' },
 { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Scheduled reporting and data exports' },
 ],
 },
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'analytics': return <ElectrophysiologyAnalytics />;
 case 'heatmap': return <PatientRiskHeatmap />;
 case 'procedures': return <EPProcedureAnalytics />;
 case 'providers': return <EPProviderPerformance />;
 case 'arrhythmia': return <ArrhythmiaManagement />;
 case 'laac-risk': return <LAACRiskDashboard />;
 case 'safety': return <AnticoagulationSafetyChecker />;
 case 'device-network': return <EPDeviceNetworkVisualization />;
 case 'network': return <CareTeamNetworkGraph />;
 case 'automated-support': return <EPAutomatedClinicalSupport />;
 case 'quality': return <EPQualityMetrics />;
 case 'reporting': return <AutomatedReportingSystem />;
 case 'physician-heatmap': return <EPPhysicianPerformanceHeatmap />;
 case 'equity-analysis': return <EPEquityAnalysis />;
 case 'outcomes-cohort': return <EPOutcomesByCohort />;
 case 'gap-detection': return <EPClinicalGapDetectionDashboard />;
 case 'phenotype-detection': return <EPPhenotypeDetectionChart />;
 case 'outcomes-trends': return <EPOutcomesTrends />;
 case 'risk-stratification': return <EPRiskStratification />;
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
 <span className="text-xs font-semibold uppercase tracking-wider text-titanium-400">{group.label}</span>
 </div>
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-2">
 {group.tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as EPServiceLineTab)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? 'bg-medical-green-50 border-medical-green-200 text-medical-green-600 shadow-lg scale-105'
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? 'text-medical-green-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-medical-green-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className="absolute inset-0 bg-gradient-to-r from-medical-green-400/20 to-medical-green-500/20 rounded-xl opacity-50" />
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