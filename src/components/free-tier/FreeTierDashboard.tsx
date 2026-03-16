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
  CLINICAL_TRIALS,
  DATA_SOURCES,
  MARGIN_OPPORTUNITIES,
  CLINICAL_IMPACT,
  POPULATION_HEALTH,
} from './data';
import { UploadedFile } from './types';

// Section imports
import Header from './sections/Header';
import KPIStrip from './sections/KPIStrip';
import FileUploadPanel from './sections/FileUploadPanel';
import OnboardingBanner from './sections/OnboardingBanner';
import QualityBenchmark from './sections/QualityBenchmark';
import CommandGrid from './sections/CommandGrid';
import OpportunityRadar from './sections/OpportunityRadar';
import CareGapFunnels from './sections/CareGapFunnels';
import ReferralLeakage from './sections/ReferralLeakage';
import FinancialBenchmarking from './sections/FinancialBenchmarking';
import DRGProcedureLOS from './sections/DRGProcedureLOS';
import BenchmarkPositioning from './sections/BenchmarkPositioning';
import PopulationImpact from './sections/PopulationImpact';
import TrialsMarketMap from './sections/TrialsMarketMap';
import DataSources from './sections/DataSources';
import PremiumUnlock from './sections/PremiumUnlock';

interface FreeTierDashboardProps {
  backToMain: () => void;
}

const FreeTierDashboard: React.FC<FreeTierDashboardProps> = ({ backToMain }) => {
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const handleFilesUploaded = useCallback((files: File[]) => {
    const newUploadedFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type || file.name.split('.').pop() || 'unknown',
      uploadedAt: new Date(),
    }));
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    setHasUploadedFiles(true);
  }, []);

  const handleClearFiles = useCallback(() => {
    setUploadedFiles([]);
    setHasUploadedFiles(false);
  }, []);

  const handleModuleClick = useCallback((moduleId: string) => {
    setExpandedModule(prev => prev === moduleId ? null : moduleId);
  }, []);

  return (
    <div className="min-h-screen bg-chrome-50 p-6">
      <div className="max-w-[120rem] mx-auto space-y-6">
        {/* 1. Header */}
        <Header hasUploadedFiles={hasUploadedFiles} onBackToMain={backToMain} />

        {/* 2. KPI Strip */}
        <KPIStrip hasUploadedFiles={hasUploadedFiles} kpis={CMS_KPIS} />

        {/* 3. File Upload */}
        <FileUploadPanel
          hasUploadedFiles={hasUploadedFiles}
          uploadedFiles={uploadedFiles}
          onFilesUploaded={handleFilesUploaded}
          onClearFiles={handleClearFiles}
        />

        {/* 4. Onboarding Banner (State A only) */}
        <OnboardingBanner hasUploadedFiles={hasUploadedFiles} />

        {/* 5. Quality Benchmarking */}
        <QualityBenchmark hasUploadedFiles={hasUploadedFiles} benchmarks={QUALITY_BENCHMARKS} />

        {/* 6. Service Line Command Center */}
        <CommandGrid
          modules={MODULE_TILES}
          expandedModule={expandedModule}
          onModuleClick={handleModuleClick}
        />

        {/* 7. Opportunity Radar */}
        <OpportunityRadar opportunities={TOP_OPPORTUNITIES} hasUploadedFiles={hasUploadedFiles} />

        {/* 8. Care Gap Analysis */}
        <CareGapFunnels funnels={CARE_GAP_FUNNELS} hasUploadedFiles={hasUploadedFiles} />

        {/* 9. Referral Leakage (Locked) */}
        <ReferralLeakage hasUploadedFiles={hasUploadedFiles} />

        {/* 10. Financial Benchmarking */}
        <FinancialBenchmarking
          hasUploadedFiles={hasUploadedFiles}
          financialSummary={FINANCIAL_SUMMARY}
          drgData={DRG_TABLE_DATA}
          marginOpportunities={MARGIN_OPPORTUNITIES}
        />

        {/* 11. DRG / Procedure / LOS Charts */}
        <DRGProcedureLOS hasUploadedFiles={hasUploadedFiles} />

        {/* 12. Benchmark Positioning */}
        <BenchmarkPositioning hasUploadedFiles={hasUploadedFiles} positions={BENCHMARK_POSITIONS} />

        {/* 13. Population & Clinical Impact */}
        <PopulationImpact
          hasUploadedFiles={hasUploadedFiles}
          clinicalImpact={CLINICAL_IMPACT}
          populationHealth={POPULATION_HEALTH}
        />

        {/* 14. Clinical Trials & Market Map (Locked) */}
        <TrialsMarketMap hasUploadedFiles={hasUploadedFiles} trials={CLINICAL_TRIALS} />

        {/* 15. Data Sources */}
        <DataSources sources={DATA_SOURCES} />

        {/* 16. Premium Unlock CTA */}
        <PremiumUnlock />
      </div>
    </div>
  );
};

export default FreeTierDashboard;
