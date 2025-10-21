import React, { useState } from 'react';
import { Zap, Users, BarChart3, Calendar, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import Coronary Intervention views
import CoronaryExecutiveView from './views/CoronaryExecutiveView';
import CoronaryServiceLineView from './views/CoronaryServiceLineView';
import CoronaryCareTeamView from './views/CoronaryCareTeamView';

type CoronaryViewType = 'executive' | 'service-line' | 'care-team';

const CoronaryInterventionModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<CoronaryViewType>('executive');
  const [isLoading, setIsLoading] = useState(false);

  const views = [
    {
      id: 'executive' as CoronaryViewType,
      label: 'Executive Dashboard',
      icon: BarChart3,
      description: 'Financial metrics and strategic insights',
    },
    {
      id: 'service-line' as CoronaryViewType,
      label: 'Service Line Analytics',
      icon: Activity,
      description: 'Complex PCI/CTO, Protected PCI, and surgical outcomes',
    },
    {
      id: 'care-team' as CoronaryViewType,
      label: 'Care Team Operations',
      icon: Users,
      description: 'Patient flow and acute care coordination',
    },
  ];

  const handleViewChange = async (viewId: CoronaryViewType) => {
    if (viewId === activeView) return;
    setIsLoading(true);
    // Add delay to show loading animation for view processing
    await new Promise(resolve => setTimeout(resolve, 600));
    setActiveView(viewId);
    setIsLoading(false);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'executive':
        return <CoronaryExecutiveView />;
      case 'service-line':
        return <CoronaryServiceLineView />;
      case 'care-team':
        return <CoronaryCareTeamView />;
      default:
        return <CoronaryExecutiveView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-gradient-medical-liquid z-[100] flex items-center justify-center">
          <div className="text-center">
            {/* Loading animation */}
            <div className="mb-8">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-medical-amber-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-medical-amber-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
            
            {/* Brand */}
            <h1 className="text-3xl font-light mb-2">
              <span className="text-slate-700 font-extralight tracking-wide">TAILRD</span>
              <span className="text-medical-amber-400 mx-2 font-thin">•</span>
              <span className="bg-gradient-to-r from-medical-amber-600 to-medical-amber-700 bg-clip-text text-transparent font-medium">Heart</span>
            </h1>
            
            {/* Loading message */}
            <p className="text-lg text-slate-600 font-light mb-4">Processing Coronary Analytics...</p>
            
            {/* Animated dots */}
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-medical-amber-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-medical-amber-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-medical-amber-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
            </div>
            
            {/* Subtitle */}
            <p className="text-sm text-slate-500 mt-6">
              Complex PCI • CABG Analytics • Safety Screening
            </p>
          </div>
        </div>
      )}
      
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
                <div className="p-3 rounded-xl bg-medical-amber-100">
                  <Activity className="w-8 h-8 text-medical-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-950 mb-1">Coronary Revascularization</h1>
                  <p className="text-steel-600 text-sm">
                    Population CAD screening to complex revascularization across PCP-Cardiology-Surgery
                  </p>
                </div>
              </div>
            </div>
            
            {/* Patient Count */}
            <div className="text-right">
              <div className="text-sm text-steel-600">Active Patients</div>
              <div className="text-2xl font-bold text-medical-amber-600 font-sf">1,523</div>
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
                onClick={() => handleViewChange(view.id)}
                className={`relative transition-all duration-300 ${
                  isActive ? 'z-30' : 'z-20'
                }`}
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
              >
                {/* Folder Tab Shape */}
                <div className={`relative px-6 py-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white border-2 border-medical-amber-400 border-b-white shadow-lg' 
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
                      isActive ? 'bg-medical-amber-100' : 'bg-white'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-medical-amber-600' : 'text-steel-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-base transition-colors ${
                        isActive ? 'text-medical-amber-900' : 'text-blue-950'
                      }`}>
                        {view.label}
                      </div>
                      <div className={`text-xs mt-1 transition-colors ${
                        isActive ? 'text-medical-amber-700' : 'text-steel-600'
                      }`}>
                        {view.description}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active tab highlight bar */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-medical-amber-500 rounded-t-full"></div>
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

export default CoronaryInterventionModule;