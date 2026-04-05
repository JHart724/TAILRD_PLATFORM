import React from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export interface GapCardGap {
  id: string;
  name: string;
  category: string;
  priority: string;
  patientCount: number;
  dollarOpportunity: number;
  tag?: string;
  whyMissed?: string;
  subcategories?: { label: string; count: number }[];
  pharmaceuticalOpportunity?: number;
}

interface GapCardProps {
  gap: GapCardGap;
  isExpanded: boolean;
  onToggle: () => void;
  onView?: () => void;
  categoryColorFn: (category: string) => string;
  priorityColorFn: (priority: string) => string;
  children: React.ReactNode;
}

export default function GapCard({
  gap,
  isExpanded,
  onToggle,
  onView,
  categoryColorFn,
  priorityColorFn,
  children,
}: GapCardProps) {
  const handleToggle = () => {
    if (!isExpanded && onView) {
      onView();
    }
    onToggle();
  };

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl overflow-hidden">
      {/* Gap header */}
      <button
        className="w-full text-left p-5 flex items-start justify-between hover:bg-titanium-50 transition-colors"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={`gap-detail-${gap.id}`}
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColorFn(gap.category)}`}>
              {gap.category}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColorFn(gap.priority)}`}>
              {gap.priority.toUpperCase()} PRIORITY
            </span>
            {gap.tag && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {gap.tag}
              </span>
            )}
          </div>
          <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
          <div className="flex gap-6 mt-2">
            <span className="text-sm text-titanium-600">
              <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
            </span>
            <span className="text-sm text-titanium-600">
              <span className="font-semibold text-[#2C4A60]">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
            </span>
          </div>
          {gap.pharmaceuticalOpportunity && gap.pharmaceuticalOpportunity > 0 && (
            <div className="mt-1" title="Downstream pharmaceutical value. Actual capture depends on health system specialty pharmacy model. Not included in platform totals.">
              <span className="text-xs text-titanium-400">
                + ${(gap.pharmaceuticalOpportunity / 1000000).toFixed(1)}M downstream pharmaceutical value{' '}
                <span className="italic">(specialty pharmacy dependent)</span>
              </span>
            </div>
          )}
          {gap.subcategories && (
            <div className="flex flex-wrap gap-3 mt-2">
              {gap.subcategories.map((sub) => (
                <span key={sub.label} className="text-xs bg-titanium-100 text-titanium-700 px-2 py-1 rounded-lg">
                  {sub.label}: <strong>{sub.count}</strong>
                </span>
              ))}
            </div>
          )}
          {gap.whyMissed && (
            <div className="mt-2 text-xs text-titanium-500 italic flex items-start gap-1.5">
              <Search className="w-3 h-3 text-[#4A6880] flex-shrink-0 mt-0.5" />
              <span>Why standard systems miss this: {gap.whyMissed}</span>
            </div>
          )}
          {gap.category === 'Discovery' && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-semibold text-[#2C4A60]">
                {'\u2B21'} Discovery — Net new patients {'\u00B7'} Never previously identified
              </span>
            </div>
          )}
        </div>
        <div className="ml-4 mt-1 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-titanium-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-titanium-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div id={`gap-detail-${gap.id}`} className="border-t border-titanium-200 p-5 space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}
