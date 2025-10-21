import React, { useState } from 'react';
import { Navigation, Users, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import Peripheral Vascular views
import PeripheralExecutiveView from './views/PeripheralExecutiveView';
import PeripheralServiceLineView from './views/PeripheralServiceLineView';
import PeripheralCareTeamView from './views/PeripheralCareTeamView';

type PeripheralViewType = 'executive' | 'service-line' | 'care-team';

const PeripheralVascularModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<PeripheralViewType>('executive');

  const views = [
    {
      id: 'executive' as PeripheralViewType,
      label: 'Executive Dashboard',
      icon: BarChart3,
      description: 'PAD program metrics and strategic insights',
    },
    {
      id: 'service-line' as PeripheralViewType,
      label: 'Service Line Analytics',
      icon: Activity,
      description: 'Endovascular and surgical outcomes',
    },
    {
      id: 'care-team' as PeripheralViewType,
      label: 'Care Team Operations',
      icon: Users,
      description: 'Limb salvage and wound care coordination',
    },
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'executive':
        return <PeripheralExecutiveView />;
      case 'service-line':
        return <PeripheralServiceLineView />;
      case 'care-team':
        return <PeripheralCareTeamView />;
      default:
        return <PeripheralExecutiveView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid">
      {/* Module Header */}
      <div className="bg-white border-b border-steel-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Header Layout */}
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              {/* TAILRD Brand */}
              <div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-2xl font-bold text-blue-950 font-sf hover:text-blue-800 transition-colors"
                >
                  TAILRD | Heart
                </button>
                <div className="text-xs text-steel-500 hover:text-steel-700 cursor-pointer mt-1" onClick={() => navigate('/dashboard')}>
                  ← Dashboard
                </div>
              </div>
              
              {/* Module Branding */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-medical-teal-100">
                  <Navigation className="w-8 h-8 text-medical-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-950 mb-1">Peripheral Vascular</h1>
                  <p className="text-steel-600 text-sm">
                    Comprehensive PAD and limb salvage programs
                  </p>
                </div>
              </div>
            </div>
            
            {/* Patient Count */}
            <div className="text-right">
              <div className="text-sm text-steel-600">Active Patients</div>
              <div className="text-2xl font-bold text-medical-teal-600 font-sf">1,247</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Navigation - Folder Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {views.map((view, index) => {
            const IconComponent = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`relative transition-all duration-300 ${
                  isActive ? 'z-30' : 'z-20'
                }`}
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
              >
                {/* Folder Tab Shape */}
                <div className={`relative px-6 py-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white border-2 border-medical-teal-400 border-b-white shadow-lg' 
                    : 'bg-slate-100 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
                style={{
                  clipPath: isActive 
                    ? 'polygon(12px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 12px)'
                    : 'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                  minWidth: '240px'
                }}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActive ? 'bg-medical-teal-100' : 'bg-white'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-medical-teal-600' : 'text-steel-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-base transition-colors ${
                        isActive ? 'text-medical-teal-900' : 'text-blue-950'
                      }`}>
                        {view.label}
                      </div>
                      <div className={`text-xs mt-1 transition-colors ${
                        isActive ? 'text-medical-teal-700' : 'text-steel-600'
                      }`}>
                        {view.description}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active tab highlight bar */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-medical-teal-500 rounded-t-full"></div>
                )}
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

export default PeripheralVascularModule;