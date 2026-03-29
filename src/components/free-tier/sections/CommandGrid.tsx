import React from 'react';
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
  return (
    <SectionCard title="Service Line Command Center" subtitle="6 Cardiovascular Modules">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {modules.map((module) => {
          const IconComponent = iconMap[module.icon];

          return (
            <div
              key={module.id}
              onClick={() => onModuleClick(module.id)}
              className={`bg-white rounded-xl border shadow-chrome-card p-4 cursor-pointer hover:border-chrome-400 hover:shadow-lg transition-all duration-200 relative ${
                expandedModule === module.id
                  ? 'border-chrome-500 ring-2 ring-chrome-200 shadow-lg'
                  : 'border-chrome-200'
              }`}
            >
              {/* Expand indicator */}
              <div className="absolute top-2 right-2">
                {expandedModule === module.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-chrome-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-chrome-300" />
                )}
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-chrome-50 flex items-center justify-center">
                {IconComponent ? (
                  <IconComponent className="w-5 h-5 text-chrome-600" />
                ) : (
                  <Box className="w-5 h-5 text-chrome-600" />
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
