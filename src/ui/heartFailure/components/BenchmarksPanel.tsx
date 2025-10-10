import React from "react";

interface BenchmarksPanelProps {
  data: {
    sinai_quadruple_therapy: number;
    national_quadruple_therapy: number;
    sinai_device_utilization: number;
    national_device_utilization: number;
    sinai_phenotype_detection: number;
    national_phenotype_detection: number;
    sinai_readmission_rate: number;
    national_readmission_rate: number;
  } | null;
}

const BenchmarksPanel: React.FC<BenchmarksPanelProps> = ({ data }) => {
  if (!data) return null;

  const benchmarks = [
    {
      label: "Quadruple Therapy",
      sinai: data.sinai_quadruple_therapy,
      national: data.national_quadruple_therapy,
      higherIsBetter: true,
    },
    {
      label: "Device Utilization",
      sinai: data.sinai_device_utilization,
      national: data.national_device_utilization,
      higherIsBetter: true,
    },
    {
      label: "Phenotype Detection",
      sinai: data.sinai_phenotype_detection,
      national: data.national_phenotype_detection,
      higherIsBetter: true,
    },
    {
      label: "30-Day Readmissions",
      sinai: data.sinai_readmission_rate,
      national: data.national_readmission_rate,
      higherIsBetter: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
      <div className="space-y-6">
        {benchmarks.map((benchmark) => {
          const isOutperforming = benchmark.higherIsBetter
            ? benchmark.sinai > benchmark.national
            : benchmark.sinai < benchmark.national;
          const delta = Math.abs(benchmark.sinai - benchmark.national);

          return (
            <div key={benchmark.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{benchmark.label}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOutperforming ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {isOutperforming ? "↗ Above" : "↘ Below"} National
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">Mount Sinai</div>
                  <div className="text-2xl font-bold text-blue-900">{benchmark.sinai.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="text-xs text-slate-600 mb-1">National</div>
                  <div className="text-2xl font-bold text-slate-700">{benchmark.national.toFixed(1)}%</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-2 text-center">{delta.toFixed(1)}% difference</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BenchmarksPanel;
