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

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleViewChange = (viewId: string) => {
 if (viewId === activeView) return;
 scrollToTop();
 setActiveView(viewId);
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
    return config.views;
  }, [config.views]);

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
 <div className="-mt-6 min-h-full">
 {/* Chrome-styled view tabs — sticky, flush against TopBar */}
 <nav className="px-6 py-2 sticky z-20" style={{ top: '3.5rem', background: 'linear-gradient(180deg, rgba(249,251,254,0.95) 0%, rgba(245,247,249,0.92) 100%)', borderBottom: '1px solid rgba(180,200,215,0.20)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
 <div className="max-w-[1800px] mx-auto">
 <div className="tab-switcher flex gap-1" role="tablist" aria-label="Module views">
 {filteredViews.map((view) => (
 <button
 type="button"
 role="tab"
 key={view.id}
 onClick={() => handleViewChange(view.id)}
 aria-selected={activeView === view.id}
 aria-controls={`panel-${view.id}`}
 className={`flex items-center gap-2 py-2.5 px-5 text-sm transition-all duration-200 rounded-md ${
 activeView === view.id
 ? 'tab-item-active'
 : 'tab-item-inactive hover:bg-white/40'
 }`}
 >
 <view.icon className="w-4 h-4" />
 <span>{view.label}</span>
 </button>
 ))}
 </div>
 </div>
 </nav>

 {/* Main Content — pt-6 restores the padding cancelled by -mt-6 on the wrapper */}
 <main className="relative pt-6">
 {renderActiveView()}
 </main>
 </div>
  );
};

export default ModuleLayout;
