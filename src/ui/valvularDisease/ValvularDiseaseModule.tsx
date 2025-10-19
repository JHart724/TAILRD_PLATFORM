import React, { useState } from 'react';
import { Heart, Users, BarChart3, Activity } from 'lucide-react';

// Import Valvular Disease views
import ValvularExecutiveView from './views/ValvularExecutiveView';
import ValvularServiceLineView from './views/ValvularServiceLineView';
import ValvularCareTeamView from './views/ValvularCareTeamView';

type ValvularViewType = 'executive' | 'service-line' | 'care-team';

const ValvularDiseaseModule: React.FC = () => {
  const [activeView, setActiveView] = useState<ValvularViewType>('executive');

  const views = [
    {
      id: 'executive' as ValvularViewType,
      label: 'Executive Dashboard',
      icon: BarChart3,
      description: 'Valvular program metrics and strategic insights',
    },
    {
      id: 'service-line' as ValvularViewType,
      label: 'Service Line Analytics',
      icon: Activity,
      description: 'Valve replacement and repair optimization',
    },
    {
      id: 'care-team' as ValvularViewType,
      label: 'Care Team Operations',
      icon: Users,
      description: 'Multidisciplinary valve team coordination',
    },
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'executive':
        return <ValvularExecutiveView />;
      case 'service-line':
        return <ValvularServiceLineView />;
      case 'care-team':
        return <ValvularCareTeamView />;
      default:
        return <ValvularExecutiveView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid">
      {/* Module Header */}
      <div className="bg-white border-b border-steel-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-medical-purple-100">
                <Heart className="w-8 h-8 text-medical-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-steel-900 font-sf">
                  Valvular Disease Module
                </h1>
                <p className="text-steel-600">
                  Comprehensive valve replacement and repair programs
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-steel-600">Active Patients</div>
              <div className="text-2xl font-bold text-medical-purple-600 font-sf">892</div>
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
                    ? 'border-medical-purple-400 bg-medical-purple-50 shadow-retina-3'
                    : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    activeView === view.id ? 'bg-medical-purple-100' : 'bg-steel-100'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      activeView === view.id ? 'text-medical-purple-600' : 'text-steel-600'
                    }`} />
                  </div>
                  <span className={`font-semibold ${
                    activeView === view.id ? 'text-medical-purple-900' : 'text-steel-900'
                  }`}>
                    {view.label}
                  </span>
                </div>
                <p className={`text-sm ${
                  activeView === view.id ? 'text-medical-purple-700' : 'text-steel-600'
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

export default ValvularDiseaseModule;