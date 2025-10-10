import React from "react";

interface PhenotypeDetectionChartProps {
  data: Array<{
    name: string;
    prevalence_est: number;
    detected: number;
    detection_rate: number;
  }> | null;
}

const PhenotypeDetectionChart: React.FC<PhenotypeDetectionChartProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((phenotype) => {
          const getDetectionColor = (rate: number): string => {
            if (rate >= 50) return "bg-emerald-500";
            if (rate >= 30) return "bg-blue-500";
            if (rate >= 20) return "bg-amber-500";
            return "bg-rose-500";
          };

          return (
            <div key={phenotype.name} className="border border-slate-200 rounded-xl p-4">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-slate-900 mb-1">{phenotype.name}</h4>
                <div className="text-xs text-slate-500">Estimated prevalence: {phenotype.prevalence_est} patients</div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-slate-600">Detected</span>
                  <span className="text-2xl font-bold text-slate-900">{phenotype.detected}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`${getDetectionColor(phenotype.detection_rate)} h-full rounded-full transition-all duration-500`} style={{ width: `${phenotype.detection_rate}%` }} />
                </div>
              </div>

              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                  phenotype.detection_rate >= 50 ? "bg-emerald-100 text-emerald-700" :
                  phenotype.detection_rate >= 30 ? "bg-blue-100 text-blue-700" :
                  phenotype.detection_rate >= 20 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                }`}>
                  {phenotype.detection_rate.toFixed(1)}% detected
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhenotypeDetectionChart;
