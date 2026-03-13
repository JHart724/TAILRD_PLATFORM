import React from 'react';
import { TrendingUp } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { Opportunity } from '../types';
import { getPriorityColor } from '../utils';

interface OpportunityRadarProps {
  opportunities: Opportunity[];
  hasUploadedFiles: boolean;
}

function getCategoryStyles(category: string): { bg: string; text: string } {
  switch (category.toLowerCase()) {
    case 'quality':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'growth':
      return { bg: 'bg-chrome-100', text: 'text-chrome-700' };
    default:
      return { bg: 'bg-titanium-100', text: 'text-titanium-700' };
  }
}

function getPriorityLabelColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return 'text-arterial-600';
    case 'medium':
      return 'text-amber-600';
    case 'low':
      return 'text-titanium-500';
  }
}

const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  opportunities,
  hasUploadedFiles,
}) => {
  const topOpportunities = opportunities.slice(0, 4);

  return (
    <SectionCard
      title="Top Opportunities"
      subtitle={
        hasUploadedFiles
          ? 'Based on your verified data'
          : 'Based on CMS benchmarks'
      }
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topOpportunities.map((opportunity, index) => {
          const categoryStyles = getCategoryStyles(opportunity.category);
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-chrome-200 p-4 flex gap-3"
            >
              {/* Left accent bar */}
              <div
                className={`w-1 rounded-full flex-shrink-0 self-stretch ${getPriorityColor(opportunity.priority)}`}
              />

              {/* Content area */}
              <div className="flex-1 min-w-0">
                {/* Top row: category pill + priority label */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-body font-semibold rounded-full px-2 py-0.5 ${categoryStyles.bg} ${categoryStyles.text}`}
                  >
                    {opportunity.category}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-body font-semibold ${getPriorityLabelColor(opportunity.priority)}`}
                  >
                    {opportunity.priority}
                  </span>
                </div>

                {/* Title */}
                <p className="mt-1.5 text-sm font-body font-semibold text-titanium-800">
                  {opportunity.title}
                </p>

                {/* Description */}
                <p className="text-xs text-titanium-500 font-body mt-1 line-clamp-2">
                  {opportunity.description}
                </p>

                {/* Impact */}
                <div className="mt-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-chrome-600" />
                  <span className="text-sm font-data font-bold text-chrome-700">
                    {opportunity.impact}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default OpportunityRadar;
