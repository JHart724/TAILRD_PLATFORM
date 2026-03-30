import React, { useState } from 'react';
import { StandardCareTeamTab, StandardTabConfig } from './StandardInterfaces';

// Base Care Team View Configuration Interface
export interface CareTeamViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'porsche' | 'chrome-blue' | 'medical-red' | 'crimson' | 'medical-arterial';
  tabs: StandardTabConfig[];
  tabContent: {
 dashboard: React.ComponentType<any>;
 patients: React.ComponentType<any>;
 workflow: React.ComponentType<any>;
 safety: React.ComponentType<any>;
 team: React.ComponentType<any>;
 documentation: React.ComponentType<any>;
 'clinical-gaps'?: React.ComponentType<any>;
  };
}

interface BaseCareTeamViewProps {
  config: CareTeamViewConfig;
}

const BaseCareTeamView: React.FC<BaseCareTeamViewProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<StandardCareTeamTab>('dashboard');

  const getTabIcon = (tabId: StandardCareTeamTab) => {
 const tab = config.tabs.find(t => t.id === tabId);
 return tab?.icon;
  };

  const getTabLabel = (tabId: StandardCareTeamTab) => {
 const tab = config.tabs.find(t => t.id === tabId);
 return tab?.label || tabId;
  };

  const renderActiveTabContent = () => {
 const TabComponent = config.tabContent[activeTab];
 return TabComponent ? <TabComponent /> : null;
  };

  const getColorClasses = () => {
 switch (config.primaryColor) {
 case 'porsche':
 return {
 text: 'text-porsche-600',
 bg: 'bg-porsche-50',
 border: 'border-porsche-200',
 accent: 'porsche'
 };
 case 'chrome-blue':
 return {
 text: 'text-[#2C4A60]',
 bg: 'bg-[#f0f5fa]',
 border: 'border-[#C8D4DC]',
 accent: 'chrome-blue'
 };
 case 'medical-red':
 return {
 text: 'text-medical-red-600',
 bg: 'bg-medical-red-50',
 border: 'border-medical-red-200',
 accent: 'medical-red'
 };
 case 'crimson':
 return {
 text: 'text-crimson-600',
 bg: 'bg-crimson-50',
 border: 'border-crimson-200',
 accent: 'crimson'
 };
 case 'medical-arterial':
 return {
 text: 'text-medical-arterial-600',
 bg: 'bg-medical-arterial-50',
 border: 'border-medical-arterial-200',
 accent: 'medical-arterial'
 };
 default:
 return {
 text: 'text-porsche-600',
 bg: 'bg-porsche-50',
 border: 'border-porsche-200',
 accent: 'porsche'
 };
 }
  };

  const colors = getColorClasses();

  return (
 <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>
 
 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
 {config.tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg scale-105`
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? colors.text : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? colors.text : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className={`absolute inset-0 bg-gradient-to-r from-${colors.accent}-400/20 to-${colors.accent}-500/20 rounded-xl opacity-50`} />
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* Tab Content */}
 <div className="space-y-6">
 {renderActiveTabContent()}
 </div>
 </div>
 </div>
  );
};

export default BaseCareTeamView;