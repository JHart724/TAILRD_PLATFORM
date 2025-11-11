import React, { useState } from 'react';
import { Heart, Users, Workflow, Shield, FileText, Zap, Cpu, Pill, ListTodo } from 'lucide-react';

// Import our new components
import AblationPlanningChecklist from '../components/care-team/AblationPlanningChecklist';
import DeviceImplantChecklist from '../components/care-team/DeviceImplantChecklist';
import OACManagementPanel from '../components/care-team/OACManagementPanel';
import EPWorklist from '../components/care-team/EPWorklist';

// Import existing components from config
import { electrophysiologyCareTeamConfig } from '../config/careTeamConfig';

// Extended interface to support custom tabs
interface EPCareTeamViewConfig {
  moduleName: string;
  moduleDescription: string;
  moduleIcon: React.ElementType;
  primaryColor: 'medical-blue' | 'medical-green' | 'medical-red' | 'medical-amber' | 'medical-purple';
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    description?: string;
  }>;
  tabContent: {
    dashboard: React.ComponentType<any>;
    patients: React.ComponentType<any>;
    workflow: React.ComponentType<any>;
    safety: React.ComponentType<any>;
    team: React.ComponentType<any>;
    documentation: React.ComponentType<any>;
    // Custom tabs
    ablation: React.ComponentType<any>;
    device: React.ComponentType<any>;
    oac: React.ComponentType<any>;
    worklist: React.ComponentType<any>;
  };
}

// Extended tab type
type EPCareTeamTab = 
  | 'dashboard'
  | 'patients' 
  | 'workflow'
  | 'safety'
  | 'team'
  | 'documentation'
  | 'ablation'
  | 'device'
  | 'oac'
  | 'worklist';

const EPCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EPCareTeamTab>('dashboard');

  // Extended configuration with our new components
  const config: EPCareTeamViewConfig = {
    ...electrophysiologyCareTeamConfig,
    tabs: [
      ...electrophysiologyCareTeamConfig.tabs,
      {
        id: 'ablation',
        label: 'Ablation Planning',
        icon: Zap,
        description: 'Pre-ablation assessment, type selection, and success rate prediction'
      },
      {
        id: 'device',
        label: 'Device Implant',
        icon: Cpu,
        description: 'CRT/ICD eligibility assessment and implant planning with PDF generation'
      },
      {
        id: 'oac',
        label: 'OAC Management',
        icon: Pill,
        description: 'Anticoagulation management with CHA₂DS₂-VASc and bridging protocols'
      },
      {
        id: 'worklist',
        label: 'EP Worklist',
        icon: ListTodo,
        description: 'Comprehensive patient management with device follow-up and remote monitoring'
      }
    ],
    tabContent: {
      ...electrophysiologyCareTeamConfig.tabContent,
      ablation: AblationPlanningChecklist,
      device: DeviceImplantChecklist,
      oac: OACManagementPanel,
      worklist: EPWorklist
    }
  };

  const renderActiveTabContent = () => {
    const TabComponent = config.tabContent[activeTab as keyof typeof config.tabContent];
    return TabComponent ? <TabComponent /> : null;
  };

  const getColorClasses = () => {
    switch (config.primaryColor) {
      case 'medical-blue':
        return {
          text: 'text-medical-blue-600',
          bg: 'bg-medical-blue-50',
          border: 'border-medical-blue-200',
          accent: 'medical-blue'
        };
      case 'medical-green':
        return {
          text: 'text-medical-green-600',
          bg: 'bg-medical-green-50',
          border: 'border-medical-green-200',
          accent: 'medical-green'
        };
      case 'medical-red':
        return {
          text: 'text-medical-red-600',
          bg: 'bg-medical-red-50',
          border: 'border-medical-red-200',
          accent: 'medical-red'
        };
      case 'medical-amber':
        return {
          text: 'text-medical-amber-600',
          bg: 'bg-medical-amber-50',
          border: 'border-medical-amber-200',
          accent: 'medical-amber'
        };
      case 'medical-purple':
        return {
          text: 'text-medical-purple-600',
          bg: 'bg-medical-purple-50',
          border: 'border-medical-purple-200',
          accent: 'medical-purple'
        };
      default:
        return {
          text: 'text-medical-blue-600',
          bg: 'bg-medical-blue-50',
          border: 'border-medical-blue-200',
          accent: 'medical-blue'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <header className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf">
                {config.moduleName} Care Team Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                {config.moduleDescription}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${colors.bg} ${colors.border} border shadow-lg`}>
                <config.moduleIcon className={`w-8 h-8 ${colors.text}`} />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Grid layout that adapts to more tabs */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
            {config.tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EPCareTeamTab)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg scale-105`
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? colors.text : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? colors.text : 'text-steel-600 group-hover:text-steel-800'}`}>
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

export default EPCareTeamView;