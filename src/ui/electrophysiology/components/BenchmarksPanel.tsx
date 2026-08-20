import React from 'react';
import SharedBenchmarksPanel, { BenchmarkMetric } from '../../../components/shared/SharedBenchmarksPanel';
import type { Provenance } from '../../../types/provenance';

interface BenchmarksPanelProps {
  onBenchmarkClick?: (benchmarkMetric: string) => void;
  benchmarks?: BenchmarkMetric[];
  dataSource?: string;
  lastUpdated?: string;
}

const epDefaultBenchmarks: BenchmarkMetric[] = [
  { metric: 'AF Ablation Success', ourValue: 95, benchmark: 88, unit: '%', trend: 'up', percentile: 82 },
  { metric: 'LAAC Device Success', ourValue: 97, benchmark: 95, unit: '%', trend: 'up', percentile: 88 },
  { metric: 'Pacemaker Complications', ourValue: 2.1, benchmark: 3.2, unit: '%', trend: 'down', percentile: 78, lowerIsBetter: true },
  { metric: 'ICD Appropriate Therapy', ourValue: 18, benchmark: 15, unit: '%', trend: 'up', percentile: 72 },
  { metric: 'Lead Extraction Success', ourValue: 96, benchmark: 91, unit: '%', trend: 'up', percentile: 85 },
  { metric: 'CRT Response Rate', ourValue: 78, benchmark: 65, unit: '%', trend: 'up', percentile: 89 },
];

const BenchmarksPanel: React.FC<BenchmarksPanelProps> = ({
  onBenchmarkClick, benchmarks: customBenchmarks, dataSource, lastUpdated,
}) => (
  <SharedBenchmarksPanel
 benchmarks={customBenchmarks || epDefaultBenchmarks}
 subtitle="Your System vs National Percentiles (2025 Data)"
 dataSource={dataSource || 'HRS/EHRA Guidelines, Calkins et al. 2024, Kusumoto et al. 2025'}
 lastUpdated={lastUpdated || 'October 2025'}
 onBenchmarkClick={onBenchmarkClick}
  />
);

export default BenchmarksPanel;

// AUDIT-208 provenance declaration. States where THIS surface's data comes from, so that
// "is this figure database-derived" has a mechanical answer instead of requiring someone to know.
export const PROVENANCE: Provenance = 'demo';
