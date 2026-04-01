import React, { useState } from 'react';
import { TrendingUp, Lock, Sparkles } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

interface InsightCard {
  category: string;
  categoryStyle: string;
  count: string;
  title: string;
  description: string;
  impact: string;
  buttonLabel: string;
  overlayCount: string;
}

const INSIGHTS: InsightCard[] = [
  {
    category: 'Gap',
    categoryStyle: 'bg-[#FAF6E8] text-[#8B6914]',
    count: '287 patients',
    title: 'GDMT Intensification Overdue',
    description:
      'Eligible for medication up-titration with no provider contact in 90+ days',
    impact: '$1.2M quality opportunity',
    buttonLabel: '287 Patients',
    overlayCount: '287 patients',
  },
  {
    category: 'Risk',
    categoryStyle: 'bg-arterial-100 text-arterial-700',
    count: '143 patients',
    title: 'Anticoagulation Gap — AF',
    description:
      'Atrial fibrillation patients with CHA2DS2-VASc >=2 not on anticoagulation therapy',
    impact: '$890K stroke prevention value',
    buttonLabel: '143 Patients',
    overlayCount: '143 patients',
  },
  {
    category: 'Growth',
    categoryStyle: 'bg-chrome-100 text-chrome-700',
    count: '52 patients',
    title: 'Unscheduled TAVR Candidates',
    description:
      'Severe aortic stenosis meeting ACC/AHA criteria for TAVR — no procedure scheduled',
    impact: '$2.7M procedure revenue',
    buttonLabel: '52 Patients',
    overlayCount: '52 patients',
  },
  {
    category: 'Gap',
    categoryStyle: 'bg-[#FAF6E8] text-[#8B6914]',
    count: '89 patients',
    title: 'ICD/CRT Eligibility Unmet',
    description:
      'HF patients with EF <35% meeting device therapy criteria without referral',
    impact: '$1.4M device revenue',
    buttonLabel: '89 Patients',
    overlayCount: '89 patients',
  },
  {
    category: 'Revenue',
    categoryStyle: 'bg-[#F0F5FA] text-[#2C4A60]',
    count: '$1.2M',
    title: 'Undercoded DRG Detected',
    description:
      'Billing analysis identifies documentation gaps causing systematic DRG undercoding across 340 encounters',
    impact: '$1.2M revenue recovery',
    buttonLabel: '340 Encounters',
    overlayCount: '340 encounters',
  },
  {
    category: 'Market',
    categoryStyle: 'bg-slate-100 text-slate-700',
    count: '34%',
    title: 'Referral Leakage Rate',
    description:
      'Estimated share of CV cases originating in your catchment area going to competing health systems',
    impact: '$3.8M market recapture',
    buttonLabel: 'Leakage Report',
    overlayCount: 'the leaking referral sources',
  },
];

const INSIGHT_DETAILS: Record<string, { learnMore: string }> = {
  'GDMT Intensification Overdue': {
    learnMore:
      'Guideline-Directed Medical Therapy (GDMT) for heart failure includes ACE inhibitors/ARBs, beta-blockers, and MRAs — all with Level A evidence for mortality reduction. TAILRD identifies patients with HFrEF diagnosis in your EHR who have not had a medication review or titration event in the last 90 days, flagging them for proactive outreach.',
  },
  'Anticoagulation Gap — AF': {
    learnMore:
      'The CHA2DS2-VASc scoring tool is the ACC/AHA standard for stroke risk stratification in non-valvular AF. Patients scoring >=2 have a >2.2% annual stroke risk and are guideline-indicated for oral anticoagulation. This gap is identified through claims cross-reference with documented AF diagnosis codes in the absence of active anticoagulant prescriptions.',
  },
  'Unscheduled TAVR Candidates': {
    learnMore:
      'Transcatheter Aortic Valve Replacement (TAVR) is indicated for severe symptomatic aortic stenosis across all surgical risk categories per 2021 ACC/AHA guidelines. These 52 patients have echocardiographic findings consistent with severe AS (AVA <1.0 cm2 or mean gradient >40 mmHg) but no TAVR or SAVR procedure scheduled in the next 90 days.',
  },
  'ICD/CRT Eligibility Unmet': {
    learnMore:
      'ACC/AHA Class I indication for ICD implantation applies to HF patients with EF <=35% and NYHA Class II-III symptoms on optimal medical therapy. CRT-D is additionally indicated when QRS duration >=150ms with LBBB morphology. These patients are identified by their most recent documented EF reading without an active device therapy referral or existing device in claims.',
  },
  'Undercoded DRG Detected': {
    learnMore:
      "DRG undercoding occurs when clinical documentation does not capture the full severity of a patient's condition, resulting in a lower-weighted DRG assignment than clinically appropriate. TAILRD's NLP engine scans clinical notes for secondary diagnoses (e.g., malnutrition, acute kidney injury) that were present on admission but not coded.",
  },
  'Referral Leakage Rate': {
    learnMore:
      'Referral leakage is estimated by cross-referencing CMS claims data for patients with primary care attribution in your service area against the performing facility for CV procedures. When procedures are attributed to a competing health system within the same ZIP cluster, they are counted as leaked referrals. The $3.8M opportunity assumes recapture of 30% of estimated leaked cases at your average CV case contribution margin.',
  },
};

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

const AIPoweredBadge: React.FC = () => (
  <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
    <Sparkles className="w-3 h-3" />
    AI Powered
  </span>
);

const AIInsightCards: React.FC = () => {
  const [activeLockedCard, setActiveLockedCard] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <SectionCard
      title="AI-Detected Insights"
      subtitle="Machine learning analysis of your population · Patient details require Premium"
      headerRight={<AIPoweredBadge />}
    >
      {/* Section-level summary */}
      <div className="bg-chrome-50 border border-chrome-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-titanium-700">571 patients identified across 6 AI-detected gaps</span>
        <span className="font-data font-semibold text-[#2C4A60]">Est. $11.2M opportunity</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INSIGHTS.map((insight) => {
          const isLockedOpen = activeLockedCard === insight.title;
          const isLearnMoreOpen = expandedCard === insight.title;
          const details = INSIGHT_DETAILS[insight.title];

          return (
            <div
              key={insight.title}
              className="bg-white border border-chrome-200 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden"
              onClick={() => {
                if (isLockedOpen) setActiveLockedCard(null);
              }}
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
                <TrendingUp className="w-3.5 h-3.5 text-[#2C4A60] flex-shrink-0" />
                <span className="text-sm font-bold text-chrome-700">{insight.impact}</span>
              </div>

              {/* Learn more expandable */}
              {details && (
                <>
                  <button
                    type="button"
                    className="text-[11px] text-chrome-500 hover:text-chrome-700 cursor-pointer w-fit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCard(prev => prev === insight.title ? null : insight.title);
                    }}
                  >
                    {isLearnMoreOpen ? 'Hide ↑' : 'Learn more →'}
                  </button>
                  {isLearnMoreOpen && (
                    <div className="bg-chrome-50 rounded-lg p-3 text-xs text-titanium-500 leading-snug">
                      {details.learnMore}
                    </div>
                  )}
                </>
              )}

              {/* See [N] Patients — Carmona Red CTA */}
              <button
                type="button"
                className="w-full py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity mt-1"
                style={carmonaGradient}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLockedCard(prev => prev === insight.title ? null : insight.title);
                }}
              >
                {isLockedOpen ? 'Hide ↑' : `See ${insight.buttonLabel} \u2192`}
              </button>

              {/* Lock overlay — covers lower portion of card */}
              {isLockedOpen && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-xl z-10 p-4"
                  style={{ background: 'rgba(255,255,255,0.97)', borderTop: '1px solid #E5E7EB' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <Lock className="w-5 h-5 text-titanium-400" />
                    <p className="text-xs text-titanium-600 text-center leading-snug">
                      Connect your EHR to see the {insight.overlayCount} behind this opportunity
                    </p>
                    <button
                      type="button"
                      className="w-full py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                      style={carmonaGradient}
                    >
                      Connect EHR →
                    </button>
                    {/* Ghost patient rows */}
                    <div
                      className="w-full space-y-1.5 mt-1"
                      style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}
                      aria-hidden="true"
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-5 bg-chrome-100 rounded-md" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default AIInsightCards;
