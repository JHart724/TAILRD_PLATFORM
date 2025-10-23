import React, { useState } from 'react';
import { Heart, Users, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TailrdLogo from '../../components/TailrdLogo';

// Import Valvular Disease views
import ValvularExecutiveView from './views/ValvularExecutiveView';
import ValvularServiceLineView from './views/ValvularServiceLineView';
import ValvularCareTeamView from './views/ValvularCareTeamView';

type ValvularViewType = 'executive' | 'service-line' | 'care-team';

const ValvularDiseaseModule: React.FC = () => {
  const navigate = useNavigate();
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
      description: 'Surgical valve repair, Ross procedure, and complex surgery',
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
      <div className="bg-white border-b border-steel-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Header Layout */}
          <div className="flex items-start justify-between">
            {/* Left side - TAILRD logo top, module info below */}
            <div>
              {/* TAILRD Brand */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  onClick={() => navigate('/dashboard')}
                  className="cursor-pointer"
                >
                  <TailrdLogo size="small" variant="light" />
                </div>
                <div className="text-xs text-steel-500 hover:text-steel-700 cursor-pointer" onClick={() => navigate('/dashboard')}>
                  ← Dashboard
                </div>
              </div>
              
              {/* Module Branding */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-medical-purple-100">
                  <Heart className="w-6 h-6 text-medical-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-blue-950">Valvular Surgery</h1>
                  <p className="text-steel-600 text-xs">
                    Surgical valve repair and replacement program
                  </p>
                </div>
              </div>
            </div>
            
            {/* Patient Count */}
            <div className="text-right">
              <div className="text-xs text-steel-600">Active Patients</div>
              <div className="text-xl font-bold text-medical-purple-600 font-sf">892</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Navigation - Folder Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-3">
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
                    ? 'bg-white border-2 border-medical-purple-400 border-b-white shadow-lg' 
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
                      isActive ? 'bg-medical-purple-100' : 'bg-white'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-medical-purple-600' : 'text-steel-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-base transition-colors ${
                        isActive ? 'text-medical-purple-900' : 'text-blue-950'
                      }`}>
                        {view.label}
                      </div>
                      <div className={`text-xs mt-1 transition-colors ${
                        isActive ? 'text-medical-purple-700' : 'text-steel-600'
                      }`}>
                        {view.description}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active tab highlight bar */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-medical-purple-500 rounded-t-full"></div>
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

export default ValvularDiseaseModule;