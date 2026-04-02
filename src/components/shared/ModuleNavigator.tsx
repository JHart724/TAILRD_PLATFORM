import React, { useState, useContext } from 'react';
import {
  Heart,
  Activity,
  Zap,
  Route,
  Settings,
  DollarSign,
  Menu,
  X,
  AlertTriangle,
  Users,
  Calendar,
  Bell,
  ChevronRight,
  Target,
  TrendingUp
} from 'lucide-react';
import { toFixed } from '../../utils/formatters';

// Mock data for module counts and status
const mockModuleData = {
  heartFailure: {
 name: 'Heart Failure',
 displayName: 'Heart Failure',
 icon: Heart,
 color: 'porsche',
 activeAlerts: 23,
 openGaps: 156,
 pendingReferrals: 8,
 totalPatients: 1702,
 revenueOpportunity: 2840000,
 qualityScore: 87.3,
 description: 'GDMT optimization and HF management'
  },
  structural: {
 name: 'Structural',
 displayName: 'Structural Heart',
 icon: Settings,
 color: 'arterial',
 activeAlerts: 12,
 openGaps: 67,
 pendingReferrals: 15,
 totalPatients: 1298,
 revenueOpportunity: 4320000,
 qualityScore: 92.1,
 description: 'TAVR, MitraClip, and valve interventions'
  },
  ep: {
 name: 'Electrophysiology',
 displayName: 'Electrophysiology',
 icon: Zap,
 color: 'chrome-blue',
 activeAlerts: 18,
 openGaps: 89,
 pendingReferrals: 6,
 totalPatients: 1001,
 revenueOpportunity: 1890000,
 qualityScore: 94.2,
 description: 'Device management and arrhythmia care'
  },
  vascular: {
 name: 'Vascular',
 displayName: 'Vascular',
 icon: Route,
 color: 'chrome-blue',
 activeAlerts: 7,
 openGaps: 34,
 pendingReferrals: 4,
 totalPatients: 645,
 revenueOpportunity: 1200000,
 qualityScore: 89.7,
 description: 'Peripheral and vascular interventions'
  },
  valvular: {
 name: 'Valvular',
 displayName: 'Valvular',
 icon: Activity,
 color: 'crimson',
 activeAlerts: 9,
 openGaps: 45,
 pendingReferrals: 3,
 totalPatients: 489,
 revenueOpportunity: 980000,
 qualityScore: 85.4,
 description: 'Valve disease management'
  },
  coronary: {
 name: 'Coronary',
 displayName: 'Coronary',
 icon: Target,
 color: 'medical-red',
 activeAlerts: 31,
 openGaps: 198,
 pendingReferrals: 12,
 totalPatients: 1223,
 revenueOpportunity: 2100000,
 qualityScore: 91.8,
 description: 'PCI and coronary interventions'
  }
};

interface ModuleNavigatorProps {
  currentModule?: string;
  onModuleChange?: (module: string) => void;
  layout?: 'tabs' | 'sidebar' | 'drawer';
  showPatientContext?: boolean;
  patientId?: string;
  className?: string;
}

const ModuleNavigator: React.FC<ModuleNavigatorProps> = ({
  currentModule = 'heartFailure',
  onModuleChange,
  layout = 'tabs',
  showPatientContext = false,
  patientId,
  className = ''
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const modules = Object.entries(mockModuleData);

  const getColorClasses = (colorName: string, isActive: boolean = false) => {
 const colors = {
 'porsche': {
 bg: isActive ? 'bg-porsche-500' : 'bg-porsche-50 hover:bg-porsche-100',
 text: isActive ? 'text-white' : 'text-porsche-700',
 border: 'border-porsche-200',
 badge: 'bg-porsche-500 text-white'
 },
 'arterial': {
 bg: isActive ? 'bg-arterial-500' : 'bg-arterial-50 hover:bg-arterial-100',
 text: isActive ? 'text-white' : 'text-arterial-700',
 border: 'border-arterial-200',
 badge: 'bg-arterial-500 text-white'
 },
 'chrome-blue': {
 bg: isActive ? 'bg-teal-700' : 'bg-chrome-50 hover:bg-chrome-50',
 text: isActive ? 'text-white' : 'text-teal-700',
 border: 'border-titanium-300',
 badge: 'bg-teal-700 text-white'
 },
 'crimson': {
 bg: isActive ? 'bg-crimson-500' : 'bg-crimson-50 hover:bg-crimson-100',
 text: isActive ? 'text-white' : 'text-crimson-700',
 border: 'border-crimson-200',
 badge: 'bg-crimson-500 text-white'
 },
 'medical-red': {
 bg: isActive ? 'bg-medical-red-500' : 'bg-medical-red-50 hover:bg-medical-red-100',
 text: isActive ? 'text-white' : 'text-medical-red-700',
 border: 'border-medical-red-200',
 badge: 'bg-medical-red-500 text-white'
 }
 };
 return colors[colorName as keyof typeof colors] || colors['porsche'];
  };

  const handleModuleClick = (moduleKey: string) => {
 onModuleChange?.(moduleKey);
 setIsDrawerOpen(false); // Close drawer on mobile
  };

  const renderModuleButton = (moduleKey: string, module: any, isActive: boolean) => {
 const IconComponent = module.icon;
 const colors = getColorClasses(module.color, isActive);
 const totalBadges = module.activeAlerts + module.openGaps + module.pendingReferrals;

 return (
 <button
 key={moduleKey}
 onClick={() => handleModuleClick(moduleKey)}
 onMouseEnter={() => setHoveredModule(moduleKey)}
 onMouseLeave={() => setHoveredModule(null)}
 className={`relative group transition-all duration-200 ${
 layout === 'tabs' 
 ? `px-4 py-3 rounded-lg border ${colors.border} ${colors.bg} ${colors.text}` 
 : `w-full p-4 rounded-xl border ${colors.border} ${colors.bg} ${colors.text} text-left`
 }`}
 >
 <div className={`flex items-center ${layout === 'tabs' ? 'gap-2' : 'gap-3'}`}>
 <IconComponent className={`${layout === 'tabs' ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
 <span className={`font-medium ${layout === 'tabs' ? 'text-sm' : 'text-base'}`}>
 {module.displayName}
 </span>
 
 {/* Badge for counts */}
 {totalBadges > 0 && (
 <div className={`ml-auto flex items-center gap-1 ${layout === 'tabs' ? '' : 'flex-wrap'}`}>
 {module.activeAlerts > 0 && (
 <span className={`px-1.5 py-0.5 ${colors.badge} rounded text-xs font-bold`}>
 {module.activeAlerts}
 </span>
 )}
 {layout === 'sidebar' && (
 <>
 {module.openGaps > 0 && (
 <span className="px-1.5 py-0.5 bg-crimson-500 text-white rounded text-xs font-bold">
 {module.openGaps}
 </span>
 )}
 {module.pendingReferrals > 0 && (
 <span className="px-1.5 py-0.5 bg-titanium-500 text-white rounded text-xs font-bold">
 {module.pendingReferrals}
 </span>
 )}
 </>
 )}
 </div>
 )}
 </div>
 
 {/* Expanded info for sidebar */}
 {layout === 'sidebar' && (
 <div className="mt-2 text-xs opacity-75">
 {module.description}
 </div>
 )}
 
 {/* Hover tooltip for tabs */}
 {layout === 'tabs' && hoveredModule === moduleKey && (
 <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 bg-white border border-titanium-200 rounded-lg p-3 shadow-xl min-w-64">
 <div className="text-sm font-semibold text-titanium-900 mb-2">{module.displayName}</div>
 <div className="text-xs text-titanium-600 mb-3">{module.description}</div>
 
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div>
 <div className="text-titanium-500">Patients</div>
 <div className="font-semibold text-titanium-900">{module.totalPatients.toLocaleString()}</div>
 </div>
 <div>
 <div className="text-titanium-500">Quality Score</div>
 <div className="font-semibold text-titanium-900">{module.qualityScore}%</div>
 </div>
 <div>
 <div className="text-titanium-500">Revenue Opp.</div>
 <div className="font-semibold text-titanium-900">${toFixed(module.revenueOpportunity / 1000000, 1)}M</div>
 </div>
 <div>
 <div className="text-titanium-500">Active Items</div>
 <div className="font-semibold text-titanium-900">{totalBadges}</div>
 </div>
 </div>
 
 <div className="mt-3 pt-3 border-t border-titanium-200">
 <div className="flex justify-between items-center text-xs">
 <div className="flex items-center gap-2">
 <AlertTriangle className="w-3 h-3 text-medical-red-500" />
 <span>{module.activeAlerts} alerts</span>
 </div>
 <div className="flex items-center gap-2">
 <Target className="w-3 h-3 text-crimson-500" />
 <span>{module.openGaps} gaps</span>
 </div>
 <div className="flex items-center gap-2">
 <Calendar className="w-3 h-3 text-titanium-500" />
 <span>{module.pendingReferrals} referrals</span>
 </div>
 </div>
 </div>
 </div>
 )}
 </button>
 );
  };

  // Mobile drawer layout
  if (layout === 'drawer') {
 return (
 <>
 {/* Mobile menu button */}
 <button
 onClick={() => setIsDrawerOpen(true)}
 className="lg:hidden p-2 bg-white border border-titanium-200 rounded-lg text-titanium-700 hover:bg-white transition-colors duration-200"
 >
 <Menu className="w-5 h-5" />
 </button>

 {/* Overlay */}
 {isDrawerOpen && (
 <div 
 className="fixed inset-0 bg-black/50 z-40 lg:hidden"
 onClick={() => setIsDrawerOpen(false)}
 />
 )}

 {/* Drawer */}
 <div className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-titanium-200 transform transition-transform duration-300 z-50 lg:hidden ${
 isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
 }`}>
 <div className="p-4 border-b border-titanium-200 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-titanium-900">CV Modules</h2>
 <button
 onClick={() => setIsDrawerOpen(false)}
 className="p-1 text-titanium-500 hover:text-titanium-700 transition-colors duration-200"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-4 space-y-2 overflow-y-auto h-full">
 {modules.map(([moduleKey, module]) => 
 renderModuleButton(moduleKey, module, currentModule === moduleKey)
 )}
 </div>
 </div>
 </>
 );
  }

  // Sidebar layout
  if (layout === 'sidebar') {
 return (
 <div className={`w-72 bg-white border border-titanium-200 rounded-2xl p-6 ${className}`}>
 <div className="mb-6">
 <h2 className="text-xl font-semibold text-titanium-900 mb-2">Cardiovascular Modules</h2>
 {showPatientContext && patientId && (
 <div className="text-sm text-titanium-600">
 Patient context maintained across modules
 </div>
 )}
 </div>
 
 <div className="space-y-3">
 {modules.map(([moduleKey, module]) => 
 renderModuleButton(moduleKey, module, currentModule === moduleKey)
 )}
 </div>
 
 {/* Summary Stats */}
 <div className="mt-6 pt-6 border-t border-titanium-200">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div className="text-center p-3 bg-white rounded-lg border border-titanium-200">
 <div className="font-bold text-titanium-900">
 {Object.values(mockModuleData).reduce((sum, m) => sum + m.totalPatients, 0).toLocaleString()}
 </div>
 <div className="text-titanium-600">Total Patients</div>
 </div>
 <div className="text-center p-3 bg-white rounded-lg border border-titanium-200">
 <div className="font-bold text-titanium-900">
 {Object.values(mockModuleData).reduce((sum, m) => sum + m.activeAlerts, 0)}
 </div>
 <div className="text-titanium-600">Active Alerts</div>
 </div>
 </div>
 </div>
 </div>
 );
  }

  // Default tabs layout
  return (
 <div className={`${className}`}>
 <div className="flex items-center justify-between mb-6">
 <div className="metal-card p-1 bg-white border border-titanium-200 rounded-xl">
 <div className="flex items-center gap-1">
 {modules.map(([moduleKey, module]) => 
 renderModuleButton(moduleKey, module, currentModule === moduleKey)
 )}
 </div>
 </div>
 
 {/* Quick stats for current module */}
 {currentModule && mockModuleData[currentModule as keyof typeof mockModuleData] && (
 <div className="flex items-center gap-4">
 <div className="metal-card p-3 bg-white border border-titanium-200 rounded-lg">
 <div className="flex items-center gap-3 text-sm">
 <div className="flex items-center gap-1">
 <Users className="w-4 h-4 text-titanium-500" />
 <span className="font-medium text-titanium-900">
 {mockModuleData[currentModule as keyof typeof mockModuleData].totalPatients.toLocaleString()}
 </span>
 <span className="text-titanium-600">patients</span>
 </div>
 
 <div className="w-px h-4 bg-white" />
 
 <div className="flex items-center gap-1">
 <TrendingUp className="w-4 h-4 text-teal-700" />
 <span className="font-medium text-titanium-900">
 {mockModuleData[currentModule as keyof typeof mockModuleData].qualityScore}%
 </span>
 <span className="text-titanium-600">quality</span>
 </div>
 
 <div className="w-px h-4 bg-white" />
 
 <div className="flex items-center gap-1">
 <DollarSign className="w-4 h-4 text-teal-700" />
 <span className="font-medium text-titanium-900">
 ${toFixed(mockModuleData[currentModule as keyof typeof mockModuleData].revenueOpportunity / 1000000, 1)}M
 </span>
 <span className="text-titanium-600">opportunity</span>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 
 {/* Module switching on mobile */}
 <div className="lg:hidden">
 <ModuleNavigator
 currentModule={currentModule}
 onModuleChange={onModuleChange}
 layout="drawer"
 showPatientContext={showPatientContext}
 patientId={patientId}
 />
 </div>
 </div>
  );
};

export default ModuleNavigator;