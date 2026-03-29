import React from 'react';
import { Database } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';
import { DataSourceInfo } from '../types';

interface DataSourcesProps {
  sources: DataSourceInfo[];
}

const colorMap: Record<string, { bg: string; text: string }> = {
  'chrome-600': { bg: 'bg-chrome-100', text: 'text-chrome-600' },
  'emerald-600': { bg: 'bg-[#F0F5FA]', text: 'text-[#2C4A60]' },
  'amber-600': { bg: 'bg-[#F0F5FA]', text: 'text-[#6B7280]' },
  'arterial-600': { bg: 'bg-arterial-100', text: 'text-arterial-600' },
};

const DataSources: React.FC<DataSourcesProps> = ({ sources }) => {
  return (
    <SectionCard
      title="Data Sources"
      subtitle="Verified Benchmark Data Providers"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((source, index) => {
          const colors = colorMap[source.iconColor] || colorMap['chrome-600'];

          return (
            <div
              key={source.name}
              className="bg-white rounded-xl border border-chrome-200 p-4"
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}
              >
                <Database className={`w-5 h-5 ${colors.text}`} />
              </div>

              {/* Name */}
              <p className="mt-3 text-sm font-body font-semibold text-titanium-800">
                {source.name}
              </p>

              {/* Type */}
              <p className="text-[10px] font-body uppercase tracking-wider text-titanium-400 mt-0.5">
                {source.type}
              </p>

              {/* Description */}
              <p className="text-xs font-body text-titanium-500 mt-2 line-clamp-2">
                {source.description}
              </p>

              {/* Bottom Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-chrome-100">
                <span className="text-[10px] font-body text-titanium-400">
                  Updated: {source.lastUpdated}
                </span>
                <span className="bg-chrome-50 px-2 py-0.5 rounded-full text-[10px] font-body font-medium text-chrome-700">
                  {source.coverage}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default DataSources;
