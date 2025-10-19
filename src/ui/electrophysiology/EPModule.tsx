import React, { useState } from 'react';
import { Zap, Users, BarChart3, Calendar } from 'lucide-react';

// Import EP views
import EPExecutiveView from './views/EPExecutiveView';
import EPServiceLineView from './views/EPServiceLineView';
import EPCareTeamView from './views/EPCareTeamView';

type EPViewType = 'executive' | 'service-line' | 'care-team';

const EPModule: React.FC = () => {
  const [activeView, setActiveView] = useState<EPViewType>('executive');

  const views = [
    {
      id: 'executive' as EPViewType,
      label: 'Executive Dashboard',
      icon: BarChart3,
      description: 'Financial metrics and strategic insights',
    },
    {
      id: 'service-line' as EPViewType,
      label: 'Service Line Analytics',
      icon: Zap,
      description: 'EP procedure optimization and quality metrics',
    },
    {
      id: 'care-team' as EPViewType,
      label: 'Care Team Operations',
      icon: Users,
      description: 'Patient flow and care coordination',
    },
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'executive':
        return <EPExecutiveView />;
      case 'service-line':
        return <EPServiceLineView />;
      case 'care-team':
        return <EPCareTeamView />;
      default:
        return <EPExecutiveView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid">
      {/* Module Header */}
      <div className="bg-white border-b border-steel-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-medical-blue-100">
                <Zap className="w-8 h-8 text-medical-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-steel-900 font-sf">
                  Electrophysiology Module
                </h1>
                <p className="text-steel-600">
                  Arrhythmia management and device therapy optimization
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-steel-600">Active Patients</div>
              <div className="text-2xl font-bold text-medical-blue-600 font-sf">1,247</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {views.map((view) => {
            const IconComponent = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                  activeView === view.id
                    ? 'border-medical-blue-400 bg-medical-blue-50 shadow-retina-3'
                    : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    activeView === view.id ? 'bg-medical-blue-100' : 'bg-steel-100'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      activeView === view.id ? 'text-medical-blue-600' : 'text-steel-600'
                    }`} />
                  </div>
                  <span className={`font-semibold ${
                    activeView === view.id ? 'text-medical-blue-900' : 'text-steel-900'
                  }`}>
                    {view.label}
                  </span>
                </div>
                <p className={`text-sm ${
                  activeView === view.id ? 'text-medical-blue-700' : 'text-steel-600'
                }`}>
                  {view.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active View Content */}
        <div className="transition-all duration-300">
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
};

export default EPModule;