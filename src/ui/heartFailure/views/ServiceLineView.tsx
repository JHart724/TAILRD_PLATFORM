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
 <div className="min-h-screen bg-gradient-to-br from-chrome-50 via-indigo-50/30 to-purple-50 p-6 relative overflow-hidden">
 {/* Web 3.0 Background Elements */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-chrome-100 via-transparent to-transparent" />
 <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-chrome-400 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
 
 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Page Header */}
 <header className="metal-card bg-white border border-titanium-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-chrome-400 to-purple-400 rounded-full blur-2xl" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold bg-gradient-to-r from-titanium-900 via-titanium-800 to-titanium-900 bg-clip-text text-transparent mb-2 font-sf">
 Service Line Command Center
 </h1>
 <p className="text-lg text-titanium-600 font-medium">
 Advanced Analytics & Performance Optimization for Heart Failure Care
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="p-4 rounded-2xl bg-porsche-50 border-porsche-200 border shadow-lg">
 <Heart className="w-8 h-8 text-porsche-600" />
 </div>
 </div>
 </div>
 </header>

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
