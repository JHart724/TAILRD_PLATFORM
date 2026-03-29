import React, { useState, useCallback } from 'react';
import { Clock } from 'lucide-react';

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
  CLINICAL_IMPACT,
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
import AIInsightCards from './sections/AIInsightCards';
import PhysicianVarianceTeaser from './sections/PhysicianVarianceTeaser';
import CompetitorMarketShare from './sections/CompetitorMarketShare';
import { PLATFORM_TOTALS } from '../../data/platformTotals';
import ClinicalTrialEnrollment from './sections/ClinicalTrialEnrollment';
import RegistryEligibility from './sections/RegistryEligibility';

interface FreeTierDashboardProps {
  backToMain?: () => void;
}

const FreeTierDashboard: React.FC<FreeTierDashboardProps> = ({ backToMain }) => {
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Clinical Gap Intelligence</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold" style={{ color: '#2C4A60' }}>
                  {PLATFORM_TOTALS.totalPatients.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500">patients with identified care gaps</span>
                <span className="text-slate-300 mx-1">·</span>
                <span className="text-sm font-semibold" style={{ color: '#1A4A2E' }}>
                  {Object.values(PLATFORM_TOTALS.modules).reduce((s, m) => s + m.gaps, 0)} active detection rules
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Demo data · Representative 12-hospital cardiovascular program · National benchmarks applied
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              {Object.entries(PLATFORM_TOTALS.modules).map(([key, mod]) => (
                <div key={key} className="text-center">
                  <div className="font-semibold text-slate-700">{mod.patients.toLocaleString()}</div>
                  <div className="text-xs uppercase">{key}</div>
                </div>
              ))}
              <div className="text-center border-l border-slate-200 pl-6">
                <div className="font-bold text-slate-800">{PLATFORM_TOTALS.totalPatients.toLocaleString()}</div>
                <div className="text-xs uppercase">Total</div>
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

        {/* 7. Population & Clinical Impact */}
        <PopulationImpact
          hasUploadedFiles={hasUploadedFiles}
          clinicalImpact={CLINICAL_IMPACT}
          populationHealth={POPULATION_HEALTH}
        />

        {/* Pipeline Velocity */}
        <div className="metal-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-titanium-800">Pipeline Velocity</span>
          </div>
          <p className="text-xs text-titanium-600">
            At current referral rates, estimated time to close identified gaps: <span className="font-bold text-red-600">18 months</span>.
            With systematic TAILRD gap closure protocol: <span className="font-bold text-[#2C4A60]">6 months</span>.
          </p>
        </div>

        {/* 8. Revenue Recovery Calculator */}
        <RevenueRecoveryCalculator />

        {/* 9. AI-Detected Insights */}
        <AIInsightCards />

        {/* 10. Care Gap Analysis */}
        <CareGapFunnels funnels={CARE_GAP_FUNNELS} hasUploadedFiles={hasUploadedFiles} />

        {/* 11. Physician Performance Variance */}
        <PhysicianVarianceTeaser />

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

export default FreeTierDashboard;
