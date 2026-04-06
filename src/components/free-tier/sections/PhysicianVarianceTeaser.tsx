import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

interface QuartileMetric {
  label: string;
  top: string;
  bottom: string;
}

const QUARTILE_METRICS: QuartileMetric[] = [
  { label: 'GDMT Compliance', top: '84%', bottom: '51%' },
  { label: '30-Day Readmission', top: '10.2%', bottom: '18.7%' },
  { label: 'Avg Length of Stay', top: '4.1 days', bottom: '6.8 days' },
];

const BLURRED_ROWS = [
  { name: 'Dr. A. Marchetti', gdmt: '91%', readmit: '9.8%', los: '3.9d', score: '96', dot: '●' },
  { name: 'Dr. K. Okonkwo', gdmt: '87%', readmit: '10.5%', los: '4.2d', score: '93', dot: '●' },
  { name: 'Dr. S. Patel', gdmt: '76%', readmit: '12.1%', los: '4.8d', score: '88', dot: '●' },
  { name: 'Dr. R. Villarreal', gdmt: '61%', readmit: '15.3%', los: '5.9d', score: '74', dot: '●' },
  { name: 'Dr. T. Nguyen', gdmt: '48%', readmit: '19.2%', los: '7.1d', score: '61', dot: '●' },
];

const PhysicianVarianceTeaser: React.FC = () => {
  const [expandedQuartile, setExpandedQuartile] = useState<'top' | 'bottom' | null>(null);

  return (
    <SectionCard
      title="Physician Performance Variance"
      subtitle="Quality and utilization patterns across your CV physician panel"
    >
      {/* Alert banner */}
      <div className="mb-5 bg-chrome-50 border border-titanium-300 rounded-xl p-4">
        <p className="text-sm text-gray-500 leading-snug">
          <span className="font-semibold">⚡ 2.4× performance gap detected</span> between your top
          and bottom quartile physicians across GDMT compliance, readmission rate, and length of
          stay.
        </p>
      </div>

      {/* Quartile comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Top quartile */}
        <div
          className="bg-chrome-50 border border-titanium-300 rounded-xl p-4 cursor-pointer"
          onClick={() => setExpandedQuartile(prev => prev === 'top' ? null : 'top')}
        >
          <p className="text-sm font-semibold text-teal-700 mb-3">Top Quartile</p>
          <div className="space-y-2">
            {QUARTILE_METRICS.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-xs text-titanium-500">{m.label}</span>
                <span className="text-sm font-bold font-data text-teal-700">{m.top}</span>
              </div>
            ))}
          </div>

          {/* Expanded top quartile panel */}
          {expandedQuartile === 'top' && (
            <div className="border-t border-titanium-300 pt-3 mt-3 text-xs text-teal-700 space-y-1">
              <p>Common traits: Regular GDMT reviews, structured care protocols, MDT weekly rounds</p>
              <div className="flex items-center gap-1.5 cursor-not-allowed text-teal-700">
                <Lock className="w-3 h-3" />
                <span>View top physicians →</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom quartile */}
        <div
          className="bg-arterial-50 border border-arterial-200 rounded-xl p-4 cursor-pointer"
          onClick={() => setExpandedQuartile(prev => prev === 'bottom' ? null : 'bottom')}
        >
          <p className="text-sm font-semibold text-arterial-700 mb-3">Bottom Quartile</p>
          <div className="space-y-2">
            {QUARTILE_METRICS.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-xs text-titanium-500">{m.label}</span>
                <span className="text-sm font-bold font-data text-arterial-600">{m.bottom}</span>
              </div>
            ))}
          </div>

          {/* Expanded bottom quartile panel */}
          {expandedQuartile === 'bottom' && (
            <div className="border-t border-arterial-200 pt-3 mt-3 text-xs text-arterial-700 space-y-1">
              <p>Coaching opportunity: Structured peer review and protocol adherence program</p>
              <div className="flex items-center gap-1.5 cursor-not-allowed text-arterial-600">
                <Lock className="w-3 h-3" />
                <span>View coaching plan →</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blurred table with lock overlay */}
      <div className="relative rounded-xl border border-chrome-200 overflow-hidden">
        {/* Table header — visible */}
        <div className="bg-chrome-50 border-b border-chrome-200">
          <table className="w-full">
            <thead>
              <tr>
                {['Physician', 'GDMT %', 'Readmission', 'LOS', 'Quality Score', 'Status'].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left text-xs font-semibold uppercase tracking-wider text-titanium-500 px-4 py-2.5"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
          </table>
        </div>

        {/* Blurred rows */}
        <div
          style={{ filter: 'blur(8px)', userSelect: 'none', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <table className="w-full">
            <tbody>
              {BLURRED_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-chrome-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-titanium-700 font-medium w-40">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-sm font-data text-titanium-700">{row.gdmt}</td>
                  <td className="px-4 py-3 text-sm font-data text-titanium-700">{row.readmit}</td>
                  <td className="px-4 py-3 text-sm font-data text-titanium-700">{row.los}</td>
                  <td className="px-4 py-3 text-sm font-data text-titanium-700">{row.score}</td>
                  <td className="px-4 py-3 text-sm text-teal-700">{row.dot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <Lock className="w-8 h-8 text-titanium-400" />
            <p className="text-sm font-semibold text-titanium-600">
              47 physicians in your panel
            </p>
            <p className="text-xs text-titanium-500 max-w-xs leading-snug">
              Upgrade to see individual physician performance, outlier detection, and coaching
              recommendations
            </p>
            <button
              type="button"
              className="mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
              style={carmonaGradient}
            >
              Unlock Physician Analytics →
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default PhysicianVarianceTeaser;
