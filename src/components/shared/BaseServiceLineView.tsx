import React, { useState } from 'react';
import { ServiceLineTabConfig } from './StandardInterfaces';
import ExportButton from './ExportButton';
import { ExportData } from '../../utils/dataExport';

export interface ServiceLineViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'porsche' | 'medical-green' | 'medical-red' | 'medical-amber' | 'medical-arterial' | 'medical-teal';
  tabs: ServiceLineTabConfig[];
  tabContent: Record<string, React.ComponentType<any>>;
  exportData?: Record<string, ExportData>;
  hasExport?: boolean;
}

interface BaseServiceLineViewProps {
  config: ServiceLineViewConfig;
}

const BaseServiceLineView: React.FC<BaseServiceLineViewProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState(config.tabs[0]?.id || '');
  
  const {
 moduleName,
 moduleDescription,
 moduleIcon: ModuleIcon,
 primaryColor,
 tabs,
 tabContent,
 exportData,
 hasExport = true
  } = config;

  const getColorClasses = (type: 'border' | 'bg' | 'text') => {
 const colorMap = {
 'porsche': {
 border: 'border-porsche-500',
 bg: 'bg-porsche-50',
 text: 'text-porsche-600'
 },
 'medical-green': {
 border: 'border-medical-green-500',
 bg: 'bg-medical-green-50', 
 text: 'text-medical-green-600'
 },
 'medical-red': {
 border: 'border-medical-red-500',
 bg: 'bg-medical-red-50',
 text: 'text-medical-red-600'
 },
 'medical-amber': {
 border: 'border-medical-amber-500',
 bg: 'bg-medical-amber-50',
 text: 'text-medical-amber-600'
 },
 'medical-arterial': {
 border: 'border-medical-arterial-500',
 bg: 'bg-medical-arterial-50',
 text: 'text-medical-arterial-600'
 },
 'medical-teal': {
 border: 'border-medical-teal-500',
 bg: 'bg-medical-teal-50',
 text: 'text-medical-teal-600'
 }
 };
 
 return colorMap[primaryColor][type];
  };

  const getCurrentTabExportData = (): ExportData | undefined => {
 if (!exportData || !activeTab) return undefined;
 return exportData[activeTab];
  };

  const ActiveComponent = tabContent[activeTab];

  return (
 <div className="min-h-screen bg-gradient-medical-liquid p-6">
 {/* Skip Navigation */}
 <a 
 href="#main-content" 
 className="skip-nav"
 >
 Skip to main content
 </a>
 
 <div className="max-w-7xl mx-auto space-y-6">
 {/* Export Controls */}
 {hasExport && getCurrentTabExportData() && (
 <div className="flex justify-end">
 <ExportButton
 data={getCurrentTabExportData()!}
 variant="outline"
 size="md"
 label={`Export ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data`}
 />
 </div>
 )}

 {/* Navigation Tabs */}
 <nav 
 className="flex flex-wrap gap-2 border-b border-titanium-200 pb-1"
 role="tablist"
 aria-label={`${moduleName} service line analytics sections`}
 >
 {tabs.map((tab) => {
 const IconComponent = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
 activeTab === tab.id
 ? `${getColorClasses('border')} ${getColorClasses('text')} ${getColorClasses('bg')}`
 : 'border-transparent text-titanium-600 hover:text-titanium-800 hover:bg-titanium-50'
 }`}
 role="tab"
 aria-selected={activeTab === tab.id}
 aria-controls={`panel-${tab.id}`}
 tabIndex={activeTab === tab.id ? 0 : -1}
 aria-label={`${tab.label}: ${tab.description}`}
 >
 <IconComponent className="w-5 h-5" />
 <span className="font-semibold">{tab.label}</span>
 </button>
 );
 })}
 </nav>

 {/* Active Component */}
 <main 
 id="main-content"
 className="transition-all duration-300"
 role="tabpanel"
 aria-labelledby={`tab-${activeTab}`}
 tabIndex={0}
 >
 <div 
 id={`panel-${activeTab}`}
 role="region"
 aria-label={`${tabs.find(t => t.id === activeTab)?.label} content`}
 >
 {ActiveComponent && <ActiveComponent />}
 </div>
 </main>
 </div>
 </div>
  );
};

export default BaseServiceLineView;