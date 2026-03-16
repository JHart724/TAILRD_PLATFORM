import React, { useState } from 'react';
import { Target, Grid3X3, Stethoscope, BarChart3, Activity, Search, Heart, Network, Users, FileText, Shield } from 'lucide-react';

// Import all Heart Failure Service Line components
import ProviderScorecard from '../components/service-line/ProviderScorecard';
import GDMTAnalyticsDashboard from '../components/service-line/GDMTAnalyticsDashboard';
import DevicePathwayFunnel from '../components/service-line/DevicePathwayFunnel';
import QualityMetricsDashboard from '../components/service-line/QualityMetricsDashboard';
import HFPhenotypeClassification from '../components/clinical/HFPhenotypeClassification';
import GDMTContraindicationChecker from '../components/clinical/GDMTContraindicationChecker';
import SpecialtyPhenotypesDashboard from '../components/clinical/SpecialtyPhenotypesDashboard';
import AdvancedDeviceTracker from '../components/clinical/AdvancedDeviceTracker';
import HFCareNetworkVisualization from '../components/service-line/HFCareNetworkVisualization';
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

type TabId = 'gdmt' | 'heatmap' | 'providers' | 'devices' | 'advanced-devices' | 'phenotypes' | 'advanced-phenotypes' | 'safety' | 'network' | 'hf-care-network' | 'quality' | 'reporting';

const ServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('gdmt');

  const tabs = [
 { id: 'gdmt', label: 'GDMT Analytics', icon: Target, description: 'Real-time 4-pillar optimization dashboard' },
 { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'Interactive risk visualization matrix' },
 { id: 'providers', label: 'Provider Performance', icon: Stethoscope, description: 'Individual physician metrics and rankings' },
 { id: 'devices', label: 'Device Pathways', icon: BarChart3, description: 'CRT, ICD, and CardioMEMS funnels' },
 { id: 'advanced-devices', label: 'Advanced Devices', icon: Activity, description: 'Underutilized high-value interventions' },
 { id: 'phenotypes', label: 'Basic Phenotypes', icon: Search, description: 'Iron deficiency & sleep apnea assessment' },
 { id: 'advanced-phenotypes', label: 'Specialty Phenotypes', icon: Heart, description: 'Beyond GDMT: 12 rare HF conditions' },
 { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'GDMT contraindication checker' },
 { id: 'network', label: 'Care Team Network', icon: Network, description: 'Provider relationship & patient flow analysis' },
 { id: 'hf-care-network', label: 'HF Care Coordination', icon: Heart, description: 'Heart failure care pathways & GDMT optimization network' },
 { id: 'quality', label: 'Quality Metrics', icon: Users, description: 'Core and supplemental quality indicators' },
 { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Scheduled reporting & data exports' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'gdmt': return <GDMTAnalyticsDashboard />;
 case 'heatmap': return <PatientRiskHeatmap />;
 case 'providers': return <ProviderScorecard />;
 case 'devices': return <DevicePathwayFunnel />;
 case 'advanced-devices': return <AdvancedDeviceTracker />;
 case 'phenotypes': return <HFPhenotypeClassification />;
 case 'advanced-phenotypes': return <SpecialtyPhenotypesDashboard />;
 case 'safety': return <GDMTContraindicationChecker />;
 case 'network': return <CareTeamNetworkGraph />;
 case 'hf-care-network': return <HFCareNetworkVisualization />;
 case 'quality': return <QualityMetricsDashboard />;
 case 'reporting': return <AutomatedReportingSystem />;
 default: return <GDMTAnalyticsDashboard />;
 }
  };

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>
 
 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
 {tabs.map((tab) => {
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
 <span className={`text-sm font-semibold ${isActive ? 'text-porsche-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
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

 {/* Tab Content */}
 <div className="space-y-6">
 {renderTabContent()}
 </div>
 </div>
 </div>
  );
};

export default ServiceLineView;
