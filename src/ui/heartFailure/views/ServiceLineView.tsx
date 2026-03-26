import React, { useState } from 'react';
import { Target, Grid3X3, Stethoscope, BarChart3, Activity, Search, Heart, Network, Users, FileText, Shield } from 'lucide-react';

// Import all Heart Failure Service Line components
import ProviderScorecard from '../components/service-line/ProviderScorecard';
import GDMTAnalyticsDashboard from '../components/service-line/GDMTAnalyticsDashboard';
import DevicePathwayFunnel from '../components/service-line/DevicePathwayFunnel';
import QualityMetricsDashboard from '../components/service-line/QualityMetricsDashboard';
import HFCareNetworkVisualization from '../components/service-line/HFCareNetworkVisualization';
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';
import ClinicalGapDetectionDashboard from '../components/clinical/ClinicalGapDetectionDashboard';
import KCCQOutcomesPanel from '../components/service-line/KCCQOutcomesPanel';
import PhenotypeDetection from '../components/PhenotypeDetectionChart';
import TherapyGapDashboard from '../../../components/therapyGap/TherapyGapDashboard';
import GDMTOptimizationTracker from '../../../components/therapyGap/GDMTOptimizationTracker';
import DeviceUnderutilizationPanel from '../../../components/therapyGap/DeviceUnderutilizationPanel';
import CrossReferralEngine from '../../../components/crossReferral/CrossReferralEngine';
import PopulationOverviewDashboard from '../../../components/populationHealth/PopulationOverviewDashboard';
import PatientRiskStratification from '../../../components/populationHealth/PatientRiskStratification';

type TabId = 'gdmt' | 'heatmap' | 'providers' | 'devices' | 'phenotype-detection' | 'population-health' | 'risk-stratification' | 'gap-detection' | 'therapy-gaps' | 'gdmt-tracker' | 'device-underutil' | 'network' | 'cross-referral' | 'quality' | 'kccq-outcomes' | 'reporting';

interface TabGroup {
  label: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const ServiceLineView: React.FC = () => {
  const [activeTab, _setActiveTab] = useState<TabId>('gap-detection');
  const setActiveTab = (tab: TabId) => {
    _setActiveTab(tab);
    // Scroll content area to top when switching tabs
    const scrollContainer = document.querySelector('.overflow-y-auto.h-screen');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabGroups: TabGroup[] = [
 {
 label: 'Clinical Analytics',
 tabs: [
 { id: 'gdmt', label: 'GDMT Analytics', icon: Target, description: 'Real-time 4-pillar optimization dashboard' },
 { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'Interactive risk visualization matrix' },
 { id: 'phenotype-detection', label: 'Phenotyping', icon: Search, description: 'HF phenotype detection and classification' },
 { id: 'population-health', label: 'Population Health', icon: Users, description: 'Population-level HF analytics and trends' },
 { id: 'risk-stratification', label: 'Risk Stratification', icon: Target, description: 'Patient risk stratification and cohort analysis' },
 ],
 },
 {
 label: 'Gap & Opportunity',
 tabs: [
 { id: 'gap-detection', label: 'Gap Detection (33-Gap)', icon: Search, description: 'AI-driven clinical gap detection' },
 { id: 'therapy-gaps', label: 'Therapy Gap Analysis', icon: Target, description: 'GDMT and device therapy gap identification' },
 { id: 'gdmt-tracker', label: 'GDMT Optimization', icon: Heart, description: 'GDMT titration tracking and optimization' },
 { id: 'device-underutil', label: 'Device Underutilization', icon: Activity, description: 'Device therapy underutilization analysis' },
 ],
 },
 {
 label: 'Device & Advanced Therapy',
 tabs: [
 { id: 'devices', label: 'Device Analytics', icon: BarChart3, description: 'CRT, ICD, CardioMEMS funnels and advanced device tracking' },
 ],
 },
 {
 label: 'Care Coordination',
 tabs: [
 { id: 'providers', label: 'Provider Performance', icon: Stethoscope, description: 'Individual physician metrics and rankings' },
 { id: 'network', label: 'Care Network', icon: Network, description: 'Heart failure care pathways and referral patterns' },
 { id: 'cross-referral', label: 'Cross-Referral Engine', icon: Heart, description: 'Cross-specialty referral pathways and coordination' },
 ],
 },
 {
 label: 'Outcomes & Reporting',
 tabs: [
 { id: 'quality', label: 'Quality Metrics', icon: Shield, description: 'Core and supplemental quality indicators' },
 { id: 'kccq-outcomes', label: 'PRO-Outcomes (KCCQ)', icon: Activity, description: 'Kansas City Cardiomyopathy Questionnaire outcomes tracking' },
 { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Scheduled reporting and data exports' },
 ],
 },
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'gdmt': return <GDMTAnalyticsDashboard />;
 case 'heatmap': return <PatientRiskHeatmap />;
 case 'providers': return <ProviderScorecard />;
 case 'devices': return <DevicePathwayFunnel />;
 case 'phenotype-detection': return <PhenotypeDetection />;
 case 'network': return <HFCareNetworkVisualization />;
 case 'quality': return <QualityMetricsDashboard />;
 case 'reporting': return <AutomatedReportingSystem />;
 case 'gap-detection': return <ClinicalGapDetectionDashboard />;
 case 'kccq-outcomes': return <KCCQOutcomesPanel />;
 case 'therapy-gaps': return <TherapyGapDashboard />;
 case 'gdmt-tracker': return <GDMTOptimizationTracker />;
 case 'device-underutil': return <DeviceUnderutilizationPanel />;
 case 'cross-referral': return <CrossReferralEngine />;
 case 'population-health': return <PopulationOverviewDashboard />;
 case 'risk-stratification': return <PatientRiskStratification />;
 default: return <ClinicalGapDetectionDashboard />;
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
 onClick={() => setActiveTab(tab.id as TabId)}
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

export default ServiceLineView;
