import React, { useState } from 'react';
import { Stethoscope, Users, BarChart3, Target } from 'lucide-react';

// Import new Phase 3 components
import ProviderScorecard from '../components/service-line/ProviderScorecard';
import GDMTAnalyticsDashboard from '../components/service-line/GDMTAnalyticsDashboard';
import DevicePathwayFunnel from '../components/service-line/DevicePathwayFunnel';
import QualityMetricsDashboard from '../components/service-line/QualityMetricsDashboard';

type ServiceLineTab = 'providers' | 'gdmt' | 'devices' | 'quality';

const ServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ServiceLineTab>('providers');

  const tabs = [
    {
      id: 'providers' as ServiceLineTab,
      label: 'Provider Performance',
      icon: Stethoscope,
      description: 'Individual physician metrics and rankings',
    },
    {
      id: 'gdmt' as ServiceLineTab,
      label: 'GDMT Analytics',
      icon: Target,
      description: '4-pillar optimization by therapy class',
    },
    {
      id: 'devices' as ServiceLineTab,
      label: 'Device Pathways',
      icon: BarChart3,
      description: 'CRT, ICD, and CardioMEMS funnels',
    },
    {
      id: 'quality' as ServiceLineTab,
      label: 'Quality Metrics',
      icon: Users,
      description: 'Core and supplemental quality indicators',
    },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'providers':
        return <ProviderScorecard />;
      case 'gdmt':
        return <GDMTAnalyticsDashboard />;
      case 'devices':
        return <DevicePathwayFunnel />;
      case 'quality':
        return <QualityMetricsDashboard />;
      default:
        return <ProviderScorecard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="retina-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-steel-900 mb-2 font-sf">
                Service Line Analytics
              </h1>
              <p className="text-lg text-steel-600">
                Comprehensive provider performance and care optimization dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-medical-blue-100">
                <Stethoscope className="w-8 h-8 text-medical-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-4">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                  activeTab === tab.id
                    ? 'border-medical-blue-400 bg-medical-blue-50 shadow-retina-3'
                    : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    activeTab === tab.id ? 'bg-medical-blue-100' : 'bg-steel-100'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      activeTab === tab.id ? 'text-medical-blue-600' : 'text-steel-600'
                    }`} />
                  </div>
                  <span className={`font-semibold ${
                    activeTab === tab.id ? 'text-medical-blue-900' : 'text-steel-900'
                  }`}>
                    {tab.label}
                  </span>
                </div>
                <p className={`text-sm ${
                  activeTab === tab.id ? 'text-medical-blue-700' : 'text-steel-600'
                }`}>
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Component */}
        <div className="transition-all duration-300">
          {renderActiveComponent()}
        </div>
      </div>
    </div>
  );
};

export default ServiceLineView;
