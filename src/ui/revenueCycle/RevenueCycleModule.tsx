import React, { useState } from 'react';
import { DollarSign, Users, BarChart3, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import Revenue Cycle views
import RCExecutiveView from './views/RCExecutiveView';
import RCOperationsView from './views/RCOperationsView';
import RCCDIView from './views/RCCDIView';

type RCViewType = 'executive' | 'operations' | 'cdi';

const RevenueCycleModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<RCViewType>('executive');
  const [isLoading, setIsLoading] = useState(false);

  const views = [
    {
      id: 'executive' as RCViewType,
      label: 'Executive Dashboard',
      icon: BarChart3,
      description: 'Financial performance and DRG optimization',
    },
    {
      id: 'operations' as RCViewType,
      label: 'Operations Analytics',
      icon: TrendingUp,
      description: 'Claims processing and denial management',
    },
    {
      id: 'cdi' as RCViewType,
      label: 'CDI Intelligence',
      icon: FileText,
      description: 'Clinical documentation improvement opportunities',
    },
  ];

  const handleViewChange = async (viewId: RCViewType) => {
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
        return <RCExecutiveView />;
      case 'operations':
        return <RCOperationsView />;
      case 'cdi':
        return <RCCDIView />;
      default:
        return <RCExecutiveView />;
    }
  };

  return (
    <div className="min-h-screen bg-liquid-porsche-blue relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-liquid-porsche-blue z-50 flex items-center justify-center">
          <div className="text-center">
            {/* Loading animation */}
            <div className="mb-8">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-medical-green-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-medical-green-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
            
            {/* Brand */}
            <h1 className="text-3xl font-light mb-2">
              <span className="text-slate-700 font-extralight tracking-wide">TAILRD</span>
              <span className="text-medical-green-400 mx-2 font-thin">•</span>
              <span className="bg-gradient-to-r from-medical-green-600 to-medical-green-700 bg-clip-text text-transparent font-medium">Heart</span>
            </h1>
            
            {/* Loading message */}
            <p className="text-lg text-slate-600 font-light mb-4">Processing Revenue Cycle Analytics...</p>
            
            {/* Animated dots */}
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-medical-green-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-medical-green-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-medical-green-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
            </div>
            
            {/* Subtitle */}
            <p className="text-sm text-slate-500 mt-6">
              DRG Optimization • Claims Analytics • CDI Intelligence
            </p>
          </div>
        </div>
      )}
      
      {/* Module Header */}
      <div className="bg-blue-50/20 backdrop-blur-md border-b border-blue-200/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-3 rounded-xl bg-medical-green-100 hover:bg-medical-green-200 transition-colors cursor-pointer"
                title="Return to Dashboard"
              >
                <DollarSign className="w-8 h-8 text-medical-green-600" />
              </button>
              <div className="text-xs text-steel-500 mt-1 text-center">← Dashboard</div>
              <div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-2xl font-bold text-blue-950 font-sf hover:text-blue-800 transition-colors"
                >
                  TAILRD | Heart
                </button>
                <p className="text-steel-600">
                  Revenue Cycle Intelligence - UB04 analytics to DRG optimization across claims lifecycle
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-steel-500">
                  <span className="bg-blue-50 px-2 py-1 rounded-full border border-blue-200">DRG • ICD-10 • CPT Analytics</span>
                  <span className="bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">Claims • CDI • Denial Management</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-steel-600">Total Claims Value</div>
              <div className="text-2xl font-bold text-medical-green-600 font-sf">$24.8M</div>
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
                  isActive ? 'z-10' : 'z-0'
                }`}
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
              >
                {/* Folder Tab Shape */}
                <div className={`relative px-6 py-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white border-2 border-medical-green-400 border-b-white shadow-lg' 
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
                      isActive ? 'bg-medical-green-100' : 'bg-white'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-medical-green-600' : 'text-steel-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-base transition-colors ${
                        isActive ? 'text-medical-green-900' : 'text-blue-950'
                      }`}>
                        {view.label}
                      </div>
                      <div className={`text-xs mt-1 transition-colors ${
                        isActive ? 'text-medical-green-700' : 'text-steel-600'
                      }`}>
                        {view.description}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active tab highlight bar */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-medical-green-500 rounded-t-full"></div>
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

export default RevenueCycleModule;