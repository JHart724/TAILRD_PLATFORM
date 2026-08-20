import React, { useState } from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import type { Provenance } from '../../../types/provenance';

/**
 * OPERATOR RULING 2026-08-05 (AUDIT-233): market intelligence KEEPS its place on the freemium
 * surface, relabelled as a Medicare-derived estimate with an explicit caveat. It is NOT ruled onto
 * the in-suite Service Line tier.
 *
 * Share of CV procedure volume by facility within a service area IS derivable from federal data -
 * the CMS Provider Utilization and Payment PUFs publish per-facility procedure counts, and the
 * NPPES registry supplies the facility identities. That is why this is a relabel and not a
 * removal. The caveat that must travel with it: those files cover MEDICARE volume, so the shares
 * shown are Medicare shares, which diverge from all-payer share wherever a competitor's case mix
 * skews commercial.
 *
 * OUT OF SCOPE by standing operator ruling: commercial market-intelligence vendors (Definitive
 * Healthcare, Trilliant, Clarify, Sg2/Vizient, IQVIA, LexisNexis and similar). Do not propose them.
 * The bars below are DEMO CONSTANTS; the federal pipeline is Phase 3 work, see
 * `docs/PATH_TO_ROBUST.md` section 10.
 */

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #1A3B5C, #2C4A60, #1A3B5C)',
};

interface CompetitorBar {
  share: number;
  name: string;
}

const COMPETITORS: CompetitorBar[] = [
  { share: 28, name: 'Competitor A' },
  { share: 19, name: 'Competitor B' },
  { share: 14, name: 'Competitor C' },
  { share: 5, name: 'Competitor D' },
];

const PREMIUM_FEATURES = [
  'Named competitors and health system affiliations',
  '12-month market share trend by service line',
  'Physician referral network mapping by ZIP code',
  'Growth opportunity scoring and white space analysis',
];

const CompetitorMarketShare: React.FC = () => {
  const [showYourDetail, setShowYourDetail] = useState(false);

  return (
    <SectionCard
      title="Competitive Market Intelligence"
      subtitle="Estimated CV market position - Medicare volume only, not all-payer"
      headerRight={<Badge variant="estimate" label="Medicare-derived estimate" />}
    >
      <p className="text-xs text-titanium-500 mb-4">
        HOW THIS IS DERIVED, and what it cannot tell you. Share is computed from per-facility CV
        procedure counts in the CMS Provider Utilization public-use files, with facility identity
        from NPPES. Those files cover MEDICARE volume only, so every share below is a Medicare
        share - it will diverge from your all-payer position wherever a competitor's case mix skews
        commercial. Competitor names are withheld on this tier; the estimate is not a substitute
        for your own claims data.
      </p>
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
          <p className="text-2xl font-bold font-data text-teal-700">$18.4M</p>
          <p className="text-xs text-titanium-500 mt-1 leading-snug">Estimated Market Opportunity</p>
        </div>
      </div>

      {/* Market share bars */}
      <div className="space-y-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-titanium-400">
          Market Share by System
        </p>

        {/* Your bar — clickable */}
        <div>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setShowYourDetail(prev => !prev)}
          >
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

          {/* Expanded your bar detail */}
          {showYourDetail && (
            <div className="bg-chrome-50 border border-chrome-100 rounded-lg p-3 mt-2 text-xs space-y-1.5 ml-44">
              <p className="text-titanium-600">Service areas: Primary (12 ZIPs), Secondary (8 ZIPs)</p>
              <p className="text-titanium-600">YoY change: <span className="text-teal-700 font-semibold">+2.1%</span> vs prior year</p>
              <p className="text-titanium-600">Strongest segment: <span className="font-semibold text-titanium-700">Heart Failure (41% share)</span></p>
              <div className="flex items-center gap-1.5 text-titanium-400">
                <Lock className="w-3 h-3" />
                <span>Competitor breakdown by service line requires Premium</span>
              </div>
            </div>
          )}
        </div>

        {/* Competitor bars */}
        {COMPETITORS.map((comp, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-medium text-titanium-700 w-44 flex-shrink-0">
              {comp.name}
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
            <p className="text-sm font-semibold text-white">Reveal Your Competitive Landscape</p>
            <p className="text-xs text-titanium-400 mt-0.5">
              See named health systems, market trends, and referral network maps
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

// AUDIT-208 provenance declaration. States where THIS surface's data comes from, so that
// "is this figure database-derived" has a mechanical answer instead of requiring someone to know.
export const PROVENANCE: Provenance = 'estimate';
