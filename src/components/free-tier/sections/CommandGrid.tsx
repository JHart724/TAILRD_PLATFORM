import React, { useState } from 'react';
import { Heart, Zap, Box, Target, Repeat2, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';
import ModuleDetailPanel from './ModuleDetailPanel';
import { ModuleTile } from '../types';
import { MODULE_DETAIL_DATA } from '../data';
import { formatCurrency, formatNumber, formatPercent } from '../utils';

const iconMap: Record<string, React.ElementType> = {
  Heart,
  Zap,
  Box,
  Target,
  Repeat: Repeat2,
  GitBranch,
};

/** Distinct identity color per module */
const MODULE_COLORS: Record<string, string> = {
  hf:      '#B91C1C', // Heart Failure — deep red
  ep:      '#6D28D9', // Electrophysiology — deep purple
  sh:      '#0E7490', // Structural Heart — deep teal
  coronary:'#C2410C', // Coronary — deep orange
  valvular:'#1D4ED8', // Valvular — deep blue
  pv:      '#065F46', // Peripheral Vascular — deep forest green
};

interface CommandGridProps {
  modules: ModuleTile[];
  expandedModule: string | null;
  onModuleClick: (moduleId: string) => void;
}

const QualityDot: React.FC<{ score: number }> = ({ score }) => {
  let colorClass = 'bg-arterial-500';
  if (score >= 92) colorClass = 'bg-[#F0F5FA]';
  else if (score >= 88) colorClass = 'bg-[#F0F5FA]';

  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colorClass} mr-1`} />;
};

const CommandGrid: React.FC<CommandGridProps> = ({ modules, expandedModule, onModuleClick }) => {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  return (
    <SectionCard title="Service Line Command Center" subtitle="6 Cardiovascular Modules" sectionLabel="Service Line">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {modules.map((module) => {
          const IconComponent = iconMap[module.icon];
          const moduleColor = MODULE_COLORS[module.id] || '#2C4A60';
          const isExpanded = expandedModule === module.id;
          const isHovered = hoveredModule === module.id;
          const isActive = isExpanded || isHovered;

          return (
            <div
              key={module.id}
              onClick={() => onModuleClick(module.id)}
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
              className="bg-white rounded-xl p-4 cursor-pointer transition-all duration-200 relative"
              style={{
                borderTop: `4px solid ${moduleColor}`,
                borderRight: `1px solid ${isActive ? moduleColor : '#e2e8f0'}`,
                borderBottom: `1px solid ${isActive ? moduleColor : '#e2e8f0'}`,
                borderLeft: `1px solid ${isActive ? moduleColor : '#e2e8f0'}`,
                boxShadow: isActive
                  ? `0 4px 16px ${moduleColor}28, 0 1px 3px rgba(0,0,0,0.08)`
                  : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {/* Expand indicator */}
              <div className="absolute top-2 right-2">
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" style={{ color: moduleColor }} />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-chrome-300" />
                )}
              </div>

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${moduleColor}1A` }}
              >
                {IconComponent ? (
                  <IconComponent className="w-5 h-5" color={moduleColor} />
                ) : (
                  <Box className="w-5 h-5" color={moduleColor} />
                )}
              </div>

              {/* Module name */}
              <div className="mt-3 text-sm font-body font-semibold text-titanium-800">
                {module.name}
              </div>

              {/* Stats grid */}
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <div>
                  <div className="text-[10px] text-titanium-400 font-body uppercase tracking-wider">
                    Patients
                  </div>
                  <div className="text-xs font-data font-semibold text-titanium-700">
                    {formatNumber(module.patients)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-titanium-400 font-body uppercase tracking-wider">
                    Procedures
                  </div>
                  <div className="text-xs font-data font-semibold text-titanium-700">
                    {formatNumber(module.procedures)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-titanium-400 font-body uppercase tracking-wider">
                    Revenue
                  </div>
                  <div className="text-xs font-data font-semibold text-titanium-700">
                    {formatCurrency(module.revenue)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-titanium-400 font-body uppercase tracking-wider">
                    Quality
                  </div>
                  <div className="text-xs font-data font-semibold text-titanium-700 flex items-center">
                    <QualityDot score={module.qualityScore} />
                    {formatPercent(module.qualityScore)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Module Detail Panel */}
      {expandedModule && MODULE_DETAIL_DATA[expandedModule] && (
        <ModuleDetailPanel
          moduleId={expandedModule}
          moduleName={modules.find(m => m.id === expandedModule)?.name || ''}
          data={MODULE_DETAIL_DATA[expandedModule]}
          onClose={() => onModuleClick(expandedModule)}
        />
      )}
    </SectionCard>
  );
};

export default CommandGrid;
