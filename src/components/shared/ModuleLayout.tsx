import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon, Home } from 'lucide-react';
import TailrdLogo from '../TailrdLogo';
import { useAuth } from '../../auth/AuthContext';

export interface ModuleView {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  requiredRole?: 'executive' | 'service-line' | 'care-team' | 'admin';
}

export interface ModuleConfig {
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  patientCount: string;
  views: ModuleView[];
  components: Record<string, React.ComponentType>;
}

interface ModuleLayoutProps {
  config: ModuleConfig;
  initialView?: string;
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ 
  config, 
  initialView = config.views[0]?.id 
}) => {
  const navigate = useNavigate();
  const { state, hasPermission } = useAuth();
  const [activeView, setActiveView] = useState<string>(initialView);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewChange = async (viewId: string) => {
    if (viewId === activeView) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    setActiveView(viewId);
    setIsLoading(false);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const filteredViews = config.views.filter(view => {
    if (!view.requiredRole) return true;
    return state.user?.role === view.requiredRole || state.user?.role === 'admin';
  });

  const renderActiveView = () => {
    const ViewComponent = config.components[activeView];
    if (!ViewComponent) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-steel-500">View not found</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 border-3 border-medical-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-3 border-medical-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-steel-600">Loading {filteredViews.find(v => v.id === activeView)?.label}...</p>
          </div>
        </div>
      );
    }

    return <ViewComponent />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 30% 20%, #1e40af 2px, transparent 2px), radial-gradient(circle at 70% 80%, #0ea5e9 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }}></div>
      
      {/* Header */}
      <header className="relative z-30 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-medical-card">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-4">
              <TailrdLogo size="small" variant="dark" />
              <button 
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-steel-600 hover:text-medical-blue-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">← Dashboard</span>
              </button>
            </div>
            
            {/* Module Info */}
            <div className="flex items-center gap-3">
              <config.icon className={`w-6 h-6 ${config.color}`} />
              <div>
                <h1 className="text-xl font-bold text-steel-900">{config.name}</h1>
                <p className="text-sm text-steel-600">{config.description}</p>
              </div>
            </div>

            {/* Patient Count */}
            <div className="text-right">
              <div className="text-sm text-steel-500">Active Patients</div>
              <div className="text-2xl font-bold text-steel-900">{config.patientCount}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="relative z-20 bg-white/50 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-6">
            {filteredViews.map((view) => (
              <button
                key={view.id}
                onClick={() => handleViewChange(view.id)}
                className={`flex flex-col items-center gap-2 py-4 px-6 transition-all duration-200 border-b-2 ${
                  activeView === view.id
                    ? 'border-medical-blue-500 text-medical-blue-700 bg-medical-blue-50/50'
                    : 'border-transparent text-steel-600 hover:text-medical-blue-600 hover:bg-white/30'
                }`}
              >
                <view.icon className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-semibold text-sm">{view.label}</div>
                  <div className="text-xs opacity-75">{view.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default ModuleLayout;