import React from 'react';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';

interface SHBenchmarksPanelProps {
  onBenchmarkClick?: (benchmarkMetric: string) => void;
}

const shBenchmarks: BenchmarkMetric[] = [
  { metric: 'Quadruple Therapy Rate', ourValue: 68, benchmark: 52, unit: '%', trend: 'up', percentile: 78 },
  { metric: 'TAVR Utilization', ourValue: 45, benchmark: 38, unit: '%', trend: 'up', percentile: 72 },
  { metric: 'Target Dose Medical Management', ourValue: 71, benchmark: 65, unit: '%', trend: 'up', percentile: 68 },
  { metric: 'TAVR Referral Adoption', ourValue: 64, benchmark: 48, unit: '%', trend: 'up', percentile: 82 },
  { metric: '30-Day Readmission', ourValue: 18, benchmark: 23, unit: '%', trend: 'down', percentile: 71, lowerIsBetter: true },
  { metric: 'Phenotype Detection Rate', ourValue: 12, benchmark: 8, unit: '%', trend: 'up', percentile: 85 },
];

const SHBenchmarksPanel: React.FC<SHBenchmarksPanelProps> = ({ onBenchmarkClick }) => (
  <SharedBenchmarksPanel
 benchmarks={shBenchmarks}
 subtitle="Your System vs National Percentiles (2025 Data)"
 dataSource="Greene et al. 2024, Lala et al. 2025, ACC/AHA Guidelines"
 lastUpdated="October 2025"
 onBenchmarkClick={onBenchmarkClick}
  />
);

export default SHBenchmarksPanel;
