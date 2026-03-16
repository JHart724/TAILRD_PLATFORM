import React from 'react';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';

interface BenchmarksPanelProps {
  onBenchmarkClick?: (benchmarkMetric: string) => void;
}

const hfBenchmarks: BenchmarkMetric[] = [
  { metric: 'Quadruple Therapy Rate', ourValue: 68, benchmark: 52, unit: '%', trend: 'up', percentile: 78 },
  { metric: 'CRT Utilization', ourValue: 45, benchmark: 38, unit: '%', trend: 'up', percentile: 72 },
  { metric: 'Target Dose BB', ourValue: 71, benchmark: 65, unit: '%', trend: 'up', percentile: 68 },
  { metric: 'SGLT2i Adoption', ourValue: 64, benchmark: 48, unit: '%', trend: 'up', percentile: 82 },
  { metric: '30-Day Readmission', ourValue: 18, benchmark: 23, unit: '%', trend: 'down', percentile: 71, lowerIsBetter: true },
  { metric: 'Phenotype Detection Rate', ourValue: 12, benchmark: 8, unit: '%', trend: 'up', percentile: 85 },
];

const BenchmarksPanel: React.FC<BenchmarksPanelProps> = ({ onBenchmarkClick }) => (
  <SharedBenchmarksPanel
 benchmarks={hfBenchmarks}
 subtitle="Mount Sinai vs National Percentiles (2025 Data)"
 dataSource="Greene et al. 2024, Lala et al. 2025, ACC/AHA Guidelines"
 lastUpdated="October 2025"
 onBenchmarkClick={onBenchmarkClick}
  />
);

export default BenchmarksPanel;
