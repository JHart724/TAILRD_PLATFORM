import React, { useState, useMemo, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
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
  const [activeView, setActiveView] = useState<string>(initialView);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewChange = async (viewId: string) => {
 if (viewId === activeView) return;
 setIsLoading(true);
 await new Promise(resolve => setTimeout(resolve, 300));
 setActiveView(viewId);
 setIsLoading(false);
  };

  const { hasViewAccess, isDemoMode } = useAuth();

  // Map requiredRole values to backend view permission keys
  const VIEW_KEY_MAP: Record<string, string> = {
    executive: 'executive',
    'service-line': 'serviceLines',
    'care-team': 'careTeam',
    admin: 'executive', // admins see executive view
  };

  const filteredViews = useMemo(() => {
    if (isDemoMode) return config.views;
    return config.views.filter((view) => {
      if (!view.requiredRole) return true;
      const viewKey = VIEW_KEY_MAP[view.requiredRole];
      return viewKey ? hasViewAccess(viewKey) : true;
    });
  }, [config.views, isDemoMode, hasViewAccess]);

  // If activeView got filtered out, fall back to first available
  const effectiveActiveView = filteredViews.find(v => v.id === activeView)
    ? activeView
    : filteredViews[0]?.id || activeView;

  useEffect(() => {
    if (effectiveActiveView !== activeView) {
      setActiveView(effectiveActiveView);
    }
  }, [effectiveActiveView, activeView]);

  // No views available for this user
  if (filteredViews.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-titanium-600 font-body text-lg mb-2">No views available</p>
          <p className="text-titanium-400 font-body text-sm">Contact your administrator to request access to this module's views.</p>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
 const ViewComponent = config.components[activeView];
 if (!ViewComponent) {
 return (
 <div className="flex items-center justify-center h-64">
 <p className="text-titanium-500 font-body">View not found</p>
 </div>
 );
 }

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center">
 <div className="relative w-10 h-10 mx-auto mb-3">
 <div className="absolute inset-0 border-2 border-chrome-200 rounded-full"></div>
 <div className="absolute inset-0 border-2 border-chrome-600 rounded-full border-t-transparent animate-spin"></div>
 </div>
 <p className="text-titanium-500 text-sm font-body">Loading {filteredViews.find(v => v.id === activeView)?.label}...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="animate-fade-up">
 <ViewComponent />
 </div>
 );
  };

  return (
 <div className="min-h-full">
 {/* Module context bar */}
 <div className="bg-white border-b border-titanium-200 px-6 py-2">
 <div className="flex items-center justify-between max-w-[1800px] mx-auto">
 <div className="flex items-center gap-2">
 <config.icon className={`w-4 h-4 ${config.color}`} />
 <p className="text-xs text-titanium-500 font-body">{config.description}</p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-titanium-400 font-body">Active Patients</span>
 <span className="text-sm font-bold text-titanium-900 font-data">{config.patientCount}</span>
 </div>
 </div>
 </div>

 {/* Chrome-styled view tabs */}
 <nav className="bg-white border-b border-titanium-200">
 <div className="max-w-[1800px] mx-auto px-6">
 <div className="flex gap-1">
 {filteredViews.map((view) => (
 <button
 key={view.id}
 onClick={() => handleViewChange(view.id)}
 className={`flex items-center gap-2 py-3 px-5 text-sm font-medium transition-all duration-200 border-b-2 ${
 activeView === view.id
 ? 'border-chrome-600 text-chrome-700 bg-chrome-50'
 : 'border-transparent text-titanium-500 hover:text-titanium-700 hover:bg-titanium-50'
 }`}
 >
 <view.icon className="w-4 h-4" />
 <span>{view.label}</span>
 </button>
 ))}
 </div>
 </div>
 </nav>

 {/* Main Content */}
 <main className="relative">
 {renderActiveView()}
 </main>
 </div>
  );
};

export default ModuleLayout;
