/**
 * SERVICE LINE FREEMIUM - the public-facing freemium marketing surface at `/service-line`.
 *
 * WHAT THIS FILE IS, stated because the previous name hid it. This component was called
 * `FreeTierDashboard`, which named its TIER rather than its SURFACE. The result: a repo-wide search
 * for "service line" missed it (the name says free-tier), and a search for the freemium surface missed
 * it too (the route says service-line). Three consecutive audit passes failed to find this file, and
 * one of them reported "zero matches anywhere in this repo" for content that was sitting here the whole
 * time. Renamed 2026-08-05 under AUDIT-235; the claims-honesty repairs on this surface are AUDIT-233.
 *
 * DUAL-TRACK ARCHITECTURE (operator ruling 2026-08-05 - BOTH surfaces stay):
 *   - THIS FILE is the standalone FREEMIUM MARKETING surface. Demo constants are legitimate here
 *     because it is a prospect-facing demonstration, but every one of them must be LABELLED as such.
 *   - `src/ui/<module>/views/*ServiceLineView.tsx` is the IN-SUITE service-line view tier, one per
 *     clinical module, for authenticated users looking at their own data.
 * They are not duplicates and neither supersedes the other. See `docs/PATH_TO_ROBUST.md` section 1.3.
 *
 * HONESTY RULE FOR THIS SURFACE: a demo number is fine; an UNLABELLED demo number is not, and a claim
 * this platform cannot source is not fine at any label. Anything asserting measured clinical outcomes,
 * product efficacy, or a data source we do not hold has been removed rather than marked - a marked
 * panel implies the capability exists behind a paywall (AUDIT-232 removal rule).
 */
import React, { useState, useCallback } from 'react';

// Data imports
import {
  CMS_KPIS,
  QUALITY_BENCHMARKS,
  MODULE_TILES,
  TOP_OPPORTUNITIES,
  CARE_GAP_FUNNELS,
  DRG_TABLE_DATA,
  FINANCIAL_SUMMARY,
  BENCHMARK_POSITIONS,
  MARGIN_OPPORTUNITIES,
  POPULATION_HEALTH,
} from './data';

// Section imports
import Header from './sections/Header';
import KPIStrip from './sections/KPIStrip';
import QualityBenchmark from './sections/QualityBenchmark';
import CommandGrid from './sections/CommandGrid';
import CareGapFunnels from './sections/CareGapFunnels';
import ReferralLeakage from './sections/ReferralLeakage';
import FinancialBenchmarking from './sections/FinancialBenchmarking';
import DRGProcedureLOS from './sections/DRGProcedureLOS';
import BenchmarkPositioning from './sections/BenchmarkPositioning';
import PopulationImpact from './sections/PopulationImpact';
import PremiumUnlock from './sections/PremiumUnlock';
import RevenueRecoveryCalculator from './sections/RevenueRecoveryCalculator';
import GuidelineInsightCards from './sections/GuidelineInsightCards';
import CompetitorMarketShare from './sections/CompetitorMarketShare';
import { PLATFORM_TOTALS } from '../../data/platformTotals';
import ClinicalTrialEnrollment from './sections/ClinicalTrialEnrollment';
import RegistryEligibility from './sections/RegistryEligibility';

interface ServiceLineFreemiumProps {
  backToMain?: () => void;
}

const ServiceLineFreemium: React.FC<ServiceLineFreemiumProps> = ({ backToMain }) => {
  const hasUploadedFiles = false;
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const handleModuleClick = useCallback((moduleId: string) => {
    setExpandedModule(prev => prev === moduleId ? null : moduleId);
  }, []);

  return (
    <div className="min-h-screen bg-chrome-50 p-6">
      <div className="max-w-[120rem] mx-auto space-y-6">
        {/* Header */}
        <Header hasUploadedFiles={false} onBackToMain={backToMain} />

        {/* Clinical Gap Intelligence Summary */}
        <div
          className="rounded-xl border border-slate-200 p-6 shadow-sm"
          style={{
            background: 'linear-gradient(to right, #ffffff, #f8fafc)',
            borderLeft: '3px solid #2C4A60',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#2C4A60', letterSpacing: '0.08em' }}>Clinical Gap Intelligence</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold" style={{ color: '#2C4A60' }}>
                  {PLATFORM_TOTALS.totalPatients.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500">patients with identified care gaps</span>
                <span className="text-slate-300 mx-1">·</span>
                <span className="text-sm font-semibold" style={{ color: '#1A4A2E' }}>
                  {Object.values(PLATFORM_TOTALS.modules).reduce((s, m) => s + m.gaps, 0)} gap findings in this dataset
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Demo dataset &middot; Representative 12-hospital cardiovascular program &middot; Both
                figures are computed from the same six module gap arrays, so they cannot disagree
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              {Object.entries(PLATFORM_TOTALS.modules).map(([key, mod]) => {
                const moduleHex: Record<string, string> = {
                  hf: '#B91C1C', ep: '#6D28D9', cad: '#C2410C',
                  sh: '#0E7490', vd: '#1D4ED8', pv: '#065F46',
                };
                const color = moduleHex[key] || '#2C4A60';
                return (
                  <div key={key} className="text-center">
                    <div className="font-bold" style={{ color }}>{mod.patients.toLocaleString()}</div>
                    <div className="text-xs uppercase text-slate-400">{key}</div>
                  </div>
                );
              })}
              <div className="text-center border-l border-slate-200 pl-6">
                <div className="font-bold" style={{ color: '#2C4A60' }}>{PLATFORM_TOTALS.totalPatients.toLocaleString()}</div>
                <div className="text-xs uppercase text-slate-400">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Row */}
        <KPIStrip hasUploadedFiles={hasUploadedFiles} kpis={CMS_KPIS} />

        {/* 3. Service Line Command Center */}
        <CommandGrid
          modules={MODULE_TILES}
          expandedModule={expandedModule}
          onModuleClick={handleModuleClick}
        />

        {/* 4. Quality & Outcomes Benchmarking */}
        <QualityBenchmark hasUploadedFiles={hasUploadedFiles} benchmarks={QUALITY_BENCHMARKS} />

        {/* 5. Competitive Market Intelligence */}
        <CompetitorMarketShare />

        {/* 6. Financial Benchmarking */}
        <FinancialBenchmarking
          hasUploadedFiles={hasUploadedFiles}
          financialSummary={FINANCIAL_SUMMARY}
          drgData={DRG_TABLE_DATA}
          marginOpportunities={MARGIN_OPPORTUNITIES}
        />

        {/* 6b. Benchmark Positioning */}
        <BenchmarkPositioning hasUploadedFiles={hasUploadedFiles} positions={BENCHMARK_POSITIONS} />

        {/* 7. Population Health */}
        <PopulationImpact
          hasUploadedFiles={hasUploadedFiles}
          populationHealth={POPULATION_HEALTH}
        />

        {/*
          Pipeline Velocity was REMOVED 2026-08-05 (AUDIT-233). It read: "At current referral
          rates, estimated time to close identified gaps: 18 months. With systematic TAILRD gap
          closure protocol: 6 months." That is a PRODUCT EFFICACY claim - a specific 3x speedup
          attributed to using this software. There is no trial, no cohort, no before/after
          measurement behind either number, and no source that could produce them. Like the
          attributed clinical outcomes, an efficacy claim is not something a demo label can
          rescue, so it is removed rather than marked.
        */}
        {/* 8. Revenue Recovery Calculator */}
        <RevenueRecoveryCalculator />

        {/* 9. Guideline-Based Insights */}
        <GuidelineInsightCards />

        {/* 10. Care Gap Analysis */}
        <CareGapFunnels funnels={CARE_GAP_FUNNELS} hasUploadedFiles={hasUploadedFiles} />

        {/*
          11. Physician Performance Variance was REMOVED 2026-08-05 (AUDIT-233, operator ruling).
          `PhysicianVarianceTeaser.tsx` is DELETED, not disabled. It rendered:
            - "2.4x performance gap detected between your top and bottom quartile physicians" -
              a measured variance this platform has never computed;
            - "47 physicians in your panel" - a headcount for a prospect whose roster we do not have;
            - "Coaching opportunity: Structured peer review and protocol adherence program" plus
              "View coaching plan" - an implied capability to judge which named clinicians underperform;
            - quartile splits (GDMT 84% vs 51%, readmission 10.2% vs 18.7%, LOS 4.1d vs 6.8d);
            - and FIVE FABRICATED NAMED PHYSICIANS with quality scores (Dr. A. Marchetti 91/9.8/3.9d/96
              through Dr. T. Nguyen 48/19.2/7.1d/61), CSS-blurred but present in source and in the DOM.

          OPERATOR RULING 2026-08-05, and why this is a delete rather than a lock: the fabricated named
          physicians are THE SAME CLASS as the fabricated patients removed under AUDIT-232 - invented
          attribution about identifiable-shaped people. A blur is a style, not a redaction. The
          Medicare-PUF-sourced successor lives in `docs/PATH_TO_ROBUST.md` section 10 as a Phase 3 plan,
          NOT on the screen as a locked panel, because a locked panel asserts the capability is real and
          merely paywalled.

          The ADVERT for this panel - the `Physician Coaching` tile in `PremiumUnlock.tsx` - is removed
          in the same pass. The first pass removed only the advert and left the panel rendering, which
          is why this note is explicit that BOTH sites are gone.
        */}

        {/* 12. DRG Volume & Reimbursement */}
        <DRGProcedureLOS hasUploadedFiles={hasUploadedFiles} />

        {/* 13. Referral Leakage Analysis */}
        <ReferralLeakage hasUploadedFiles={hasUploadedFiles} />

        {/* 14. Clinical Trial Enrollment */}
        <ClinicalTrialEnrollment />

        {/* 15. Registry Eligibility */}
        <RegistryEligibility />

        {/* 16. Upgrade CTA */}
        <PremiumUnlock />
      </div>
    </div>
  );
};

export default ServiceLineFreemium;
