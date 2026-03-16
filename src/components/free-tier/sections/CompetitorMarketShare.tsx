import React from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

interface CompetitorBar {
  share: number;
  blurredName: string;
}

const COMPETITORS: CompetitorBar[] = [
  { share: 28, blurredName: '███████ Health' },
  { share: 19, blurredName: '██████████ Medical Center' },
  { share: 14, blurredName: '████████ Regional' },
  { share: 5, blurredName: '██████ Community' },
];

const PREMIUM_FEATURES = [
  'Competitor names and system affiliations revealed',
  'Real-time market share trend analysis (12-month)',
  'Physician referral network mapping',
  'Growth opportunity scoring by ZIP code',
];

const CompetitorMarketShare: React.FC = () => {
  const maxShare = 34; // your share is the max visible bar reference

  return (
    <SectionCard
      title="Competitive Market Intelligence"
      subtitle="CV service line market position in your primary service area"
    >
      {/* Top stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-chrome-50 border border-chrome-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-data text-chrome-700">34%</p>
          <p className="text-xs text-titanium-500 mt-1 leading-snug">Your Market Share</p>
        </div>
        <div className="bg-chrome-50 border border-chrome-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-data text-titanium-800">4</p>
          <p className="text-xs text-titanium-500 mt-1 leading-snug">Competitors Identified</p>
        </div>
        <div className="bg-chrome-50 border border-chrome-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-data text-emerald-600">$18.4M</p>
          <p className="text-xs text-titanium-500 mt-1 leading-snug">Estimated Market Opportunity</p>
        </div>
      </div>

      {/* Market share bars */}
      <div className="space-y-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-titanium-400">
          Market Share by System
        </p>

        {/* Your bar — fully visible */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-titanium-700 w-44 flex-shrink-0">
            Your Health System
          </span>
          <div className="flex-1 h-7 bg-chrome-100 rounded-md overflow-hidden">
            <div
              className="h-full bg-chrome-600 rounded-md flex items-center pl-2"
              style={{ width: `${(34 / 34) * 100}%` }}
            >
              <span className="text-[11px] font-bold text-white">34%</span>
            </div>
          </div>
          <span className="text-sm font-data font-semibold text-chrome-700 w-8 text-right">
            34%
          </span>
        </div>

        {/* Competitor bars */}
        {COMPETITORS.map((comp, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Blurred competitor name */}
            <span
              className="text-sm font-medium text-titanium-700 w-44 flex-shrink-0"
              style={{ filter: 'blur(5px)', userSelect: 'none' }}
              aria-hidden="true"
            >
              {comp.blurredName}
            </span>
            <div className="flex-1 h-7 bg-chrome-100 rounded-md overflow-hidden">
              <div
                className="h-full bg-chrome-300 rounded-md flex items-center pl-2"
                style={{ width: `${(comp.share / 34) * 100}%` }}
              >
                {comp.share >= 14 && (
                  <span className="text-[11px] font-bold text-chrome-700">{comp.share}%</span>
                )}
              </div>
            </div>
            <span className="text-sm font-data text-titanium-600 w-8 text-right">
              {comp.share}%
            </span>
          </div>
        ))}
      </div>

      {/* Premium lock card */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#1F2937' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Premium Market Intelligence</p>
            <p className="text-xs text-titanium-400 mt-0.5">
              Unlock the full competitive landscape for your service area
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-5">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-titanium-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-titanium-400 leading-snug">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
          style={carmonaGradient}
        >
          Unlock Market Intelligence
        </button>
      </div>
    </SectionCard>
  );
};

export default CompetitorMarketShare;
