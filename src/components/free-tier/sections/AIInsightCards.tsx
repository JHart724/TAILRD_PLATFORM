import React from 'react';
import { TrendingUp, Lock, Sparkles } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

interface InsightCard {
  category: string;
  categoryStyle: string;
  count: string;
  title: string;
  description: string;
  impact: string;
}

const INSIGHTS: InsightCard[] = [
  {
    category: 'Gap',
    categoryStyle: 'bg-amber-100 text-amber-700',
    count: '287 patients',
    title: 'GDMT Intensification Overdue',
    description:
      'Eligible for medication up-titration with no provider contact in 90+ days',
    impact: '$1.2M quality opportunity',
  },
  {
    category: 'Risk',
    categoryStyle: 'bg-arterial-100 text-arterial-700',
    count: '143 patients',
    title: 'Anticoagulation Gap — AF',
    description:
      'Atrial fibrillation patients with CHA₂DS₂-VASc ≥2 not on anticoagulation therapy',
    impact: '$890K stroke prevention value',
  },
  {
    category: 'Growth',
    categoryStyle: 'bg-chrome-100 text-chrome-700',
    count: '52 patients',
    title: 'Unscheduled TAVR Candidates',
    description:
      'Severe aortic stenosis meeting ACC/AHA criteria for TAVR — no procedure scheduled',
    impact: '$2.7M procedure revenue',
  },
  {
    category: 'Gap',
    categoryStyle: 'bg-amber-100 text-amber-700',
    count: '89 patients',
    title: 'ICD/CRT Eligibility Unmet',
    description:
      'HF patients with EF <35% meeting device therapy criteria without referral',
    impact: '$1.4M device revenue',
  },
  {
    category: 'Revenue',
    categoryStyle: 'bg-emerald-100 text-emerald-700',
    count: '$1.2M',
    title: 'Undercoded DRG Detected',
    description:
      'Billing analysis identifies documentation gaps causing systematic DRG undercoding across 340 encounters',
    impact: '$1.2M revenue recovery',
  },
  {
    category: 'Market',
    categoryStyle: 'bg-violet-100 text-violet-700',
    count: '34%',
    title: 'Referral Leakage Rate',
    description:
      'Estimated share of CV cases originating in your catchment area going to competing health systems',
    impact: '$3.8M market recapture',
  },
];

const AIPoweredBadge: React.FC = () => (
  <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
    <Sparkles className="w-3 h-3" />
    AI Powered
  </span>
);

const AIInsightCards: React.FC = () => {
  return (
    <SectionCard
      title="AI-Detected Insights"
      subtitle="Machine learning analysis of your population · Patient details require Premium"
      headerRight={<AIPoweredBadge />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INSIGHTS.map((insight) => (
          <div
            key={insight.title}
            className="bg-white border border-chrome-200 rounded-xl p-4 flex flex-col gap-2"
          >
            {/* Top row: category pill + lock icon */}
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${insight.categoryStyle}`}
              >
                {insight.category}
              </span>
              <Lock className="w-4 h-4 text-chrome-400" />
            </div>

            {/* Count */}
            <p className="text-2xl font-bold font-data text-titanium-800 leading-none">
              {insight.count}
            </p>

            {/* Title */}
            <p className="text-sm font-semibold text-titanium-800 leading-snug">
              {insight.title}
            </p>

            {/* Description */}
            <p className="text-xs text-titanium-500 leading-snug line-clamp-2">
              {insight.description}
            </p>

            {/* Impact */}
            <div className="flex items-center gap-1.5 mt-auto pt-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-bold text-chrome-700">{insight.impact}</span>
            </div>

            {/* View patient list — locked */}
            <button
              type="button"
              disabled
              className="flex items-center gap-1 text-xs text-chrome-500 hover:text-chrome-700 cursor-not-allowed w-fit mt-1 transition-colors"
            >
              <Lock className="w-3 h-3" />
              View Patient List →
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default AIInsightCards;
