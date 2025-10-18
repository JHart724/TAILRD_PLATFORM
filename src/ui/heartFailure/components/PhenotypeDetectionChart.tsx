import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface PhenotypeData {
  name: string;
  prevalenceEst: number;
  detected: number;
  detectionRate: number;
  actionable: number;
  avgCostPerPatient: number;
}

const PhenotypeDetection: React.FC = () => {
  const phenotypes: PhenotypeData[] = [
    {
      name: 'Cardiac Amyloidosis',
      prevalenceEst: 160,
      detected: 35,
      detectionRate: 22,
      actionable: 28,
      avgCostPerPatient: 62500
    },
    {
      name: 'Iron Deficiency',
      prevalenceEst: 500,
      detected: 180,
      detectionRate: 36,
      actionable: 145,
      avgCostPerPatient: 2750
    },
    {
      name: 'Hypertrophic CM',
      prevalenceEst: 80,
      detected: 32,
      detectionRate: 40,
      actionable: 18,
      avgCostPerPatient: 15000
    },
    {
      name: 'Fabry Disease',
      prevalenceEst: 45,
      detected: 8,
      detectionRate: 18,
      actionable: 6,
      avgCostPerPatient: 175000
    },
    {
      name: 'Chagas CM',
      prevalenceEst: 25,
      detected: 3,
      detectionRate: 12,
      actionable: 2,
      avgCostPerPatient: 8000
    },
    {
      name: 'Cardiac Sarcoidosis',
      prevalenceEst: 18,
      detected: 4,
      detectionRate: 22,
      actionable: 3,
      avgCostPerPatient: 12000
    },
    {
      name: 'Tachy-Induced CM',
      prevalenceEst: 95,
      detected: 28,
      detectionRate: 29,
      actionable: 22,
      avgCostPerPatient: 20000
    },
    {
      name: 'Chemo-Induced CM',
      prevalenceEst: 72,
      detected: 18,
      detectionRate: 25,
      actionable: 14,
      avgCostPerPatient: 5000
    },
    {
      name: 'Peripartum CM',
      prevalenceEst: 12,
      detected: 8,
      detectionRate: 67,
      actionable: 6,
      avgCostPerPatient: 8000
    },
    {
      name: 'Non-Compaction CM',
      prevalenceEst: 15,
      detected: 5,
      detectionRate: 33,
      actionable: 4,
      avgCostPerPatient: 10000
    },
    {
      name: 'Autoimmune CM',
      prevalenceEst: 35,
      detected: 9,
      detectionRate: 26,
      actionable: 7,
      avgCostPerPatient: 12000
    },
    {
      name: 'Anderson-Fabry',
      prevalenceEst: 28,
      detected: 5,
      detectionRate: 18,
      actionable: 4,
      avgCostPerPatient: 175000
    }
  ];

  const totalOpportunity = phenotypes.reduce((sum, p) => 
    sum + (p.actionable * p.avgCostPerPatient), 0
  );

  return (
    <div className="bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Beyond-GDMT Phenotype Detection</h3>
          <p className="text-sm text-slate-600 mt-1">12 Targetable Phenotypes in HF Population</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-600">Total Opportunity</div>
          <div className="text-2xl font-bold text-indigo-800">
            ${(totalOpportunity / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {phenotypes.map((phenotype) => {
          const undetected = phenotype.prevalenceEst - phenotype.detected;
          const isHighGap = phenotype.detectionRate < 30;

          return (
            <div 
              key={phenotype.name}
              className={`p-4 rounded-lg border-2 transition-all ${
                isHighGap 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{phenotype.name}</h4>
                  <div className="text-xs text-slate-600 mt-1">
                    Est. Prevalence: {phenotype.prevalenceEst} patients
                  </div>
                </div>
                {isHighGap ? (
                  <AlertCircle className="w-5 h-5 text-red-700" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-teal-700" />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <div className="text-xs text-slate-600">Detected</div>
                  <div className="text-lg font-bold text-slate-900">{phenotype.detected}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Rate</div>
                  <div className={`text-lg font-bold ${isHighGap ? 'text-red-800' : 'text-teal-700'}`}>
                    {phenotype.detectionRate}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Actionable</div>
                  <div className="text-lg font-bold text-indigo-800">{phenotype.actionable}</div>
                </div>
              </div>

              <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div 
                  className={`absolute left-0 top-0 h-full transition-all ${
                    isHighGap ? 'bg-red-700' : 'bg-teal-600'
                  }`}
                  style={{ width: `${phenotype.detectionRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">
                  {undetected} undetected ({Math.round((undetected / phenotype.prevalenceEst) * 100)}% gap)
                </span>
                <span className="font-medium text-indigo-800">
                  ${(phenotype.actionable * phenotype.avgCostPerPatient / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-300">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700" />
            <span className="text-slate-700">High detection gap (&lt;30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-700" />
            <span className="text-slate-700">Acceptable detection (≥30%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhenotypeDetection;
