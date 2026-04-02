import React, { useState } from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { BenchmarkCard } from '../types';
import { formatValue, getStatusBg } from '../utils';
import { Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface QualityBenchmarkProps {
  hasUploadedFiles: boolean;
  benchmarks: BenchmarkCard[];
}

interface BenchmarkDetail {
  context: string;
  improvementPath: string;
  patientCount: number;
}

const BENCHMARK_DETAILS: Record<string, BenchmarkDetail> = {
  '30-Day Mortality': {
    context: 'Inpatient mortality within 30 days of admission is a key CMS quality measure used in Value-Based Purchasing calculations and public reporting.',
    improvementPath: 'To reach top decile: implement structured rapid response protocols and post-discharge follow-up calls within 72 hours.',
    patientCount: 42,
  },
  'Readmission Rate': {
    context: 'Excess readmissions trigger CMS financial penalties under the Hospital Readmissions Reduction Program (HRRP), directly impacting Medicare reimbursement.',
    improvementPath: 'To reach top decile: deploy transitional care management with nurse navigator follow-up within 7 days of discharge.',
    patientCount: 287,
  },
  'Infection Rate': {
    context: 'Healthcare-associated infection rates affect both patient safety scores and CMS quality bonus payments under VBP.',
    improvementPath: 'To reach top decile: standardize catheter care bundles and implement real-time infection surveillance alerts.',
    patientCount: 28,
  },
  'Patient Satisfaction': {
    context: 'HCAHPS scores directly contribute to CMS Value-Based Purchasing Total Performance Score, affecting up to 2% of Medicare base DRG payments.',
    improvementPath: 'To reach top decile: structured hourly rounding program and bedside shift reporting with patient family involvement.',
    patientCount: 1840,
  },
  'Door-to-Balloon Time': {
    context: 'D2B time is a Tier 1 ACC/AHA STEMI quality metric and is publicly reported on CMS Hospital Compare — critical for MI accreditation.',
    improvementPath: 'To reach top decile: pre-hospital ECG transmission and cath lab activation protocol with <10 minute door-to-activation target.',
    patientCount: 156,
  },
};

const MiniBarComparison: React.FC<{
  yourValue: number;
  nationalAvg: number;
  topDecile: number;
  unit: BenchmarkCard['unit'];
  lowerBetter?: boolean;
}> = ({ yourValue, nationalAvg, topDecile, unit, lowerBetter }) => {
  const maxVal = Math.max(yourValue, nationalAvg, topDecile) * 1.1;
  const bars = [
    { label: 'You', value: yourValue, color: 'bg-chrome-600' },
    { label: 'Nat. Avg', value: nationalAvg, color: 'bg-titanium-300' },
    { label: 'Top 10%', value: topDecile, color: 'bg-chrome-50' },
  ];

  return (
    <div className="space-y-1.5">
      {bars.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[10px] text-titanium-400 w-14 text-right">{label}</span>
          <div className="flex-1 h-3 bg-chrome-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} rounded-full`}
              style={{ width: `${(value / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-data font-semibold text-titanium-700 w-12">
            {formatValue(value, unit)}
          </span>
        </div>
      ))}
    </div>
  );
};

const QualityBenchmark: React.FC<QualityBenchmarkProps> = ({
  hasUploadedFiles,
  benchmarks,
}) => {
  const [peerFilter, setPeerFilter] = useState<'national' | 'regional' | 'similar'>('national');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  return (
    <SectionCard
      title="Quality & Outcomes Benchmarking"
      subtitle="vs. National Averages & Top Decile"
    >
      {/* Peer Filter Toggle */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-chrome-100">
        <span className="text-xs text-titanium-500 font-body mr-1">Compare to:</span>
        {(['national', 'regional', 'similar'] as const).map((filter) => {
          const isActive = peerFilter === filter;
          const isLocked = filter !== 'national';
          const labels = { national: 'National Average', regional: 'Regional Peers', similar: 'Similar Hospitals' };
          return (
            <button
              key={filter}
              onClick={() => !isLocked && setPeerFilter(filter)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-body font-medium transition-colors ${
                isActive
                  ? 'bg-chrome-700 text-white'
                  : isLocked
                  ? 'bg-chrome-50 text-titanium-400 cursor-not-allowed border border-chrome-200'
                  : 'bg-chrome-100 text-titanium-600 hover:bg-chrome-200'
              }`}
            >
              {isLocked && <Lock className="w-3 h-3" />}
              {labels[filter]}
            </button>
          );
        })}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-10 gap-4 items-center pb-3 mb-1">
        <div className="col-span-3 text-xs font-body font-semibold uppercase tracking-wider text-titanium-400">
          Metric
        </div>
        <div className="col-span-2 text-xs font-body font-semibold uppercase tracking-wider text-titanium-400 text-center">
          Your Value
        </div>
        <div className="col-span-2 text-xs font-body font-semibold uppercase tracking-wider text-titanium-400 text-center">
          National Avg
        </div>
        <div className="col-span-2 text-xs font-body font-semibold uppercase tracking-wider text-titanium-400 text-center">
          Top Decile
        </div>
        <div className="col-span-1 text-xs font-body font-semibold uppercase tracking-wider text-titanium-400 text-center">
          Status
        </div>
      </div>

      {/* Benchmark Rows */}
      {benchmarks.map((benchmark) => {
        const yourValue = hasUploadedFiles ? benchmark.stateBValue : benchmark.stateAValue;
        const isExpanded = expandedMetric === benchmark.metric;
        const details = BENCHMARK_DETAILS[benchmark.metric];

        return (
          <div key={benchmark.metric}>
            <div
              className="grid grid-cols-10 gap-4 items-center py-3 border-b border-chrome-100 last:border-b-0 cursor-pointer hover:bg-chrome-50 rounded-lg px-1 -mx-1 transition-colors"
              onClick={() => setExpandedMetric(prev => prev === benchmark.metric ? null : benchmark.metric)}
            >
              {/* Metric Name */}
              <div className="col-span-3 text-sm font-body font-medium text-titanium-700">
                {benchmark.metric}
              </div>

              {/* Your Value */}
              <div className="col-span-2 flex flex-col items-center gap-1">
                <span className="font-data font-semibold text-titanium-800">
                  {formatValue(yourValue, benchmark.unit)}
                </span>
                <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
              </div>

              {/* National Average */}
              <div className="col-span-2 text-center">
                <span className="font-data text-sm text-titanium-600">
                  {formatValue(benchmark.nationalAvg, benchmark.unit)}
                </span>
              </div>

              {/* Top Decile */}
              <div className="col-span-2 text-center">
                <span className="font-data text-sm text-chrome-600 font-medium">
                  {formatValue(benchmark.topDecile, benchmark.unit)}
                </span>
              </div>

              {/* Status Dot + chevron */}
              <div className="col-span-1 flex justify-center items-center gap-1">
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-titanium-400" />
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusBg(benchmark.status)}`} />
                )}
              </div>
            </div>

            {/* Expanded detail panel */}
            {isExpanded && details && (
              <div className="col-span-10 bg-chrome-50 rounded-xl p-4 mb-2 mt-1 text-xs space-y-3">
                {/* Bar comparison */}
                <MiniBarComparison
                  yourValue={yourValue}
                  nationalAvg={benchmark.nationalAvg}
                  topDecile={benchmark.topDecile}
                  unit={benchmark.unit}
                />

                {/* Clinical context */}
                <p className="text-titanium-600 leading-snug">{details.context}</p>

                {/* Improvement path */}
                <p className="text-chrome-700 font-medium leading-snug">{details.improvementPath}</p>

                {/* Locked patient list */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 bg-chrome-100 text-titanium-500 cursor-not-allowed px-3 py-1.5 rounded-lg text-xs"
                  disabled
                >
                  <Lock className="w-3 h-3" />
                  View {details.patientCount} patients in this gap →
                </button>
              </div>
            )}
          </div>
        );
      })}
    </SectionCard>
  );
};

export default QualityBenchmark;
