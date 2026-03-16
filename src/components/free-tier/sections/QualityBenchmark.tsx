import React, { useState } from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { BenchmarkCard } from '../types';
import { formatValue, getStatusBg } from '../utils';
import { Lock } from 'lucide-react';

interface QualityBenchmarkProps {
  hasUploadedFiles: boolean;
  benchmarks: BenchmarkCard[];
}

const QualityBenchmark: React.FC<QualityBenchmarkProps> = ({
  hasUploadedFiles,
  benchmarks,
}) => {
  const [peerFilter, setPeerFilter] = useState<'national' | 'regional' | 'similar'>('national');

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
      {benchmarks.map((benchmark, index) => {
        const yourValue = hasUploadedFiles ? benchmark.stateBValue : benchmark.stateAValue;
        return (
          <div
            key={benchmark.metric}
            className="grid grid-cols-10 gap-4 items-center py-3 border-b border-chrome-100 last:border-b-0"
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

            {/* Status Dot */}
            <div className="col-span-1 flex justify-center">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusBg(benchmark.status)}`} />
            </div>
          </div>
        );
      })}
    </SectionCard>
  );
};

export default QualityBenchmark;
