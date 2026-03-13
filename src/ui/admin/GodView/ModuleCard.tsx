/**
 * Module Card Component
 * 
 * Displays overview information for each module with health status,
 * key metrics, and navigation links to module views.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Zap, 
  Activity, 
  Users, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../../theme';

interface ModuleCardProps {
  data: {
 module: string;
 health: 'healthy' | 'warning' | 'critical' | 'unknown';
 metrics: {
 patients: number;
 revenueOpportunity: number;
 gapsIdentified: number;
 };
 alerts: number;
 lastUpdated: string;
  };
}

const moduleConfig = {
  heartFailure: { 
 name: 'Heart Failure', 
 icon: Heart, 
 path: '/hf',
 description: 'GDMT optimization and clinical pathways',
 color: 'module.heartFailure'
  },
  structuralHeart: { 
 name: 'Structural Heart', 
 icon: Activity, 
 path: '/structural-heart',
 description: 'Device eligibility and procedural optimization',
 color: 'module.structural'
  },
  electrophysiology: { 
 name: 'Electrophysiology', 
 icon: Zap, 
 path: '/electrophysiology',
 description: 'Device therapy and arrhythmia management',
 color: 'module.ep'
  },
  peripheralVascular: { 
 name: 'Peripheral Vascular', 
 icon: TrendingUp, 
 path: '/peripheral-vascular',
 description: 'PAD interventions and limb salvage',
 color: 'module.vascular'
  },
  valvularDisease: { 
 name: 'Valvular Disease', 
 icon: Heart, 
 path: '/valvular',
 description: 'Valve replacement and repair pathways',
 color: 'module.valvular'
  },
  coronaryIntervention: { 
 name: 'Coronary Intervention', 
 icon: Activity, 
 path: '/coronary',
 description: 'PCI optimization and stent management',
 color: 'module.coronary'
  },
  revenueCycle: { 
 name: 'Revenue Cycle', 
 icon: DollarSign, 
 path: '/revenue-cycle',
 description: 'CDI and documentation optimization',
 color: 'module.revenue'
  }
};

export const ModuleCard: React.FC<ModuleCardProps> = ({ data }) => {
  const { semantic, getModuleColor } = useTheme();
  const config = moduleConfig[data.module as keyof typeof moduleConfig];
  
  if (!config) {
 return null; // Skip unknown modules
  }
  
  const Icon = config.icon;
  
  const healthColors = {
 healthy: semantic['status.success'],
 warning: semantic['status.warning'], 
 critical: semantic['status.danger'],
 unknown: semantic['status.neutral']
  };
  
  const healthColor = healthColors[data.health];
  const moduleColor = getModuleColor(data.module);
  
  return (
 <div 
 className="rounded-xl p-6 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default'],
 }}
 >
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 <div 
 className="p-3 rounded-lg transition-colors"
 style={{ 
 backgroundColor: `${moduleColor}15`,
 }}
 >
 <Icon className="w-6 h-6" style={{ color: moduleColor }} />
 </div>
 <div>
 <h3 className="font-semibold text-lg" style={{ color: semantic['text.primary'] }}>
 {config.name}
 </h3>
 <p className="text-sm mt-1" style={{ color: semantic['text.muted'] }}>
 {config.description}
 </p>
 </div>
 </div>
 
 {/* Health Status Indicator */}
 <div className="flex items-center gap-2">
 {data.alerts > 0 && (
 <div 
 className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
 style={{ 
 backgroundColor: `${semantic['status.warning']}20`,
 color: semantic['status.warning']
 }}
 >
 <AlertTriangle className="w-3 h-3" />
 {data.alerts}
 </div>
 )}
 <div 
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: healthColor }}
 title={`Health: ${data.health}`}
 />
 </div>
 </div>
 
 {/* Metrics */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div>
 <div className="text-xs uppercase tracking-wider mb-1" style={{ color: semantic['text.muted'] }}>
 Patients
 </div>
 <div className="font-semibold text-lg" style={{ color: semantic['text.primary'] }}>
 {data.metrics.patients.toLocaleString()}
 </div>
 </div>
 <div>
 <div className="text-xs uppercase tracking-wider mb-1" style={{ color: semantic['text.muted'] }}>
 Revenue
 </div>
 <div className="font-semibold text-lg" style={{ color: semantic['status.success'] }}>
 ${(data.metrics.revenueOpportunity / 1000000).toFixed(1)}M
 </div>
 </div>
 <div>
 <div className="text-xs uppercase tracking-wider mb-1" style={{ color: semantic['text.muted'] }}>
 Gaps
 </div>
 <div className="font-semibold text-lg" style={{ color: semantic['status.warning'] }}>
 {data.metrics.gapsIdentified.toLocaleString()}
 </div>
 </div>
 </div>
 
 {/* View Links */}
 <div className="space-y-2">
 {['executive', 'service-line', 'care-team'].map((view) => (
 <Link
 key={view}
 to={`${config.path}/${view}`}
 className="flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50 group/link"
 style={{ 
 backgroundColor: 'transparent',
 color: semantic['text.secondary'],
 }}
 >
 <span className="font-medium">
 {view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} View
 </span>
 <ChevronRight 
 className="w-4 h-4 transition-transform group-hover/link:translate-x-1" 
 style={{ color: semantic['text.muted'] }}
 />
 </Link>
 ))}
 </div>
 
 {/* Last Updated */}
 <div 
 className="text-xs mt-4 pt-4 border-t"
 style={{ 
 color: semantic['text.muted'],
 borderColor: semantic['border.muted']
 }}
 >
 Updated: {new Date(data.lastUpdated).toLocaleString()}
 </div>
 </div>
  );
};