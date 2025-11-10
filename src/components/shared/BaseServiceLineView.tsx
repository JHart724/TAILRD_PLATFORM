import React, { useState } from 'react';
import { ServiceLineTabConfig } from './StandardInterfaces';
import ExportButton from './ExportButton';
import { ExportData } from '../../utils/dataExport';

export interface ServiceLineViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'medical-blue' | 'medical-green' | 'medical-red' | 'medical-amber' | 'medical-purple' | 'medical-indigo';
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
      'medical-blue': {
        border: 'border-medical-blue-500',
        bg: 'bg-medical-blue-50',
        text: 'text-medical-blue-600'
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
      'medical-purple': {
        border: 'border-medical-purple-500',
        bg: 'bg-medical-purple-50',
        text: 'text-medical-purple-600'
      },
      'medical-indigo': {
        border: 'border-medical-indigo-500',
        bg: 'bg-medical-indigo-50',
        text: 'text-medical-indigo-600'
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
        {/* Header */}
        <header className="retina-card p-6" role="banner">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-steel-900 mb-2 font-sf">
                {moduleName} Service Line Analytics
              </h1>
              <p className="text-lg text-steel-600">
                {moduleDescription}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasExport && getCurrentTabExportData() && (
                <ExportButton
                  data={getCurrentTabExportData()!}
                  variant="outline"
                  size="md"
                  label={`Export ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data`}
                />
              )}
              <div className={`p-3 rounded-xl ${getColorClasses('bg')}`} aria-hidden="true">
                <ModuleIcon className={`w-8 h-8 ${getColorClasses('text')}`} />
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav 
          className="flex gap-4 border-b border-steel-200 overflow-x-auto"
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
                    : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
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