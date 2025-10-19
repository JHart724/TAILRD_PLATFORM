import React, { useState } from 'react';
import { Pill, Target, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface GDMTPillarData {
  pillar: 'ARNi' | 'Beta-Blocker' | 'SGLT2i' | 'MRA';
  currentRate: number;
  targetRate: number;
  patientsOptimal: number;
  patientsSuboptimal: number;
  patientsAbsent: number;
  avgTimeToTarget: number;
  costSavings: number;
  commonBarriers: string[];
  preferredAgents: { name: string; usage: number }[];
}

const GDMTAnalyticsDashboard: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<GDMTPillarData['pillar'] | null>('ARNi');

  // Mock GDMT data - will be replaced with real API data
  const gdmtData: GDMTPillarData[] = [
    {
      pillar: 'ARNi',
      currentRate: 68.4,
      targetRate: 85.0,
      patientsOptimal: 156,
      patientsSuboptimal: 89,
      patientsAbsent: 98,
      avgTimeToTarget: 45,
      costSavings: 4200000,
      commonBarriers: ['Hypotension', 'Hyperkalemia', 'Angioedema history'],
      preferredAgents: [
        { name: 'Sacubitril/Valsartan', usage: 78.2 },
        { name: 'Enalapril', usage: 21.8 },
      ],
    },
    {
      pillar: 'Beta-Blocker',
      currentRate: 82.1,
      targetRate: 90.0,
      patientsOptimal: 187,
      patientsSuboptimal: 134,
      patientsAbsent: 22,
      avgTimeToTarget: 28,
      costSavings: 2800000,
      commonBarriers: ['Bradycardia', 'Fatigue', 'COPD'],
      preferredAgents: [
        { name: 'Carvedilol', usage: 54.3 },
        { name: 'Metoprolol Succinate', usage: 31.7 },
        { name: 'Bisoprolol', usage: 14.0 },
      ],
    },
    {
      pillar: 'SGLT2i',
      currentRate: 34.7,
      targetRate: 75.0,
      patientsOptimal: 78,
      patientsSuboptimal: 45,
      patientsAbsent: 220,
      avgTimeToTarget: 67,
      costSavings: 6700000,
      commonBarriers: ['Genital infections', 'DKA risk', 'eGFR <30'],
      preferredAgents: [
        { name: 'Dapagliflozin', usage: 42.1 },
        { name: 'Empagliflozin', usage: 38.9 },
        { name: 'Sotagliflozin', usage: 19.0 },
      ],
    },
    {
      pillar: 'MRA',
      currentRate: 71.3,
      targetRate: 85.0,
      patientsOptimal: 167,
      patientsSuboptimal: 98,
      patientsAbsent: 78,
      avgTimeToTarget: 52,
      costSavings: 3400000,
      commonBarriers: ['Hyperkalemia', 'Renal dysfunction', 'Gynecomastia'],
      preferredAgents: [
        { name: 'Spironolactone', usage: 64.2 },
        { name: 'Eplerenone', usage: 35.8 },
      ],
    },
  ];

  const selectedData = gdmtData.find(d => d.pillar === selectedPillar);
  
  const getPillarColor = (pillar: GDMTPillarData['pillar']) => {
    const colors = {
      'ARNi': 'medical-blue',
      'Beta-Blocker': 'medical-green',
      'SGLT2i': 'medical-amber',
      'MRA': 'steel',
    };
    return colors[pillar];
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return 'bg-medical-green-500';
    if (percentage >= 70) return 'bg-medical-amber-500';
    return 'bg-medical-red-500';
  };

  const totalPatients = gdmtData.reduce((sum, d) => 
    sum + d.patientsOptimal + d.patientsSuboptimal + d.patientsAbsent, 0) / 4;

  const overallOptimization = gdmtData.reduce((sum, d) => sum + d.currentRate, 0) / 4;

  return (
    <div className="retina-card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            GDMT Analytics Dashboard
          </h2>
          <p className="text-steel-600">
            Guideline-directed medical therapy optimization by pillar
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Overall Optimization</div>
          <div className="text-3xl font-bold text-steel-900 font-sf">
            {overallOptimization.toFixed(1)}%
          </div>
          <div className="text-sm text-steel-600">
            {Math.round(totalPatients)} patients
          </div>
        </div>
      </div>

      {/* GDMT Pillar Tabs */}
      <div className="flex gap-2 mb-6">
        {gdmtData.map((pillar) => {
          const colorClass = getPillarColor(pillar.pillar);
          return (
            <button
              key={pillar.pillar}
              onClick={() => setSelectedPillar(
                selectedPillar === pillar.pillar ? null : pillar.pillar
              )}
              className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedPillar === pillar.pillar
                  ? `border-${colorClass}-400 bg-${colorClass}-50 shadow-retina-3`
                  : 'border-steel-200 hover:border-steel-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pill className={`w-5 h-5 text-${colorClass}-600`} />
                  <span className="font-semibold text-steel-900">{pillar.pillar}</span>
                </div>
                <div className={`text-sm font-bold text-${colorClass}-600`}>
                  {pillar.currentRate.toFixed(1)}%
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-steel-100 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(pillar.currentRate, pillar.targetRate)}`}
                  style={{ width: `${(pillar.currentRate / pillar.targetRate) * 100}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-steel-600">
                Target: {pillar.targetRate}% • Gap: {(pillar.targetRate - pillar.currentRate).toFixed(1)}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Pillar Detailed Analysis */}
      {selectedData && (
        <div className="space-y-6">
          {/* Pillar Header */}
          <div className={`p-6 rounded-xl bg-${getPillarColor(selectedData.pillar)}-50 border-2 border-${getPillarColor(selectedData.pillar)}-200`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-steel-900 font-sf">
                  {selectedData.pillar} Deep Dive
                </h3>
                <p className="text-steel-600">Current optimization and improvement opportunities</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-steel-600 mb-1">Cost Savings Opportunity</div>
                <div className="text-2xl font-bold text-medical-green-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(selectedData.costSavings)}
                </div>
              </div>
            </div>

            {/* Patient Distribution */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-medical-green-600">
                  {selectedData.patientsOptimal}
                </div>
                <div className="text-xs text-steel-600 mt-1">Optimal Therapy</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-medical-amber-600">
                  {selectedData.patientsSuboptimal}
                </div>
                <div className="text-xs text-steel-600 mt-1">Suboptimal Dose</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-medical-red-600">
                  {selectedData.patientsAbsent}
                </div>
                <div className="text-xs text-steel-600 mt-1">Not Prescribed</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-steel-600" />
                  <div className="text-2xl font-bold text-steel-900">
                    {selectedData.avgTimeToTarget}
                  </div>
                </div>
                <div className="text-xs text-steel-600">Days to Target</div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Common Barriers */}
            <div className="p-4 bg-white rounded-xl border border-steel-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-medical-red-600" />
                <h4 className="font-semibold text-steel-900">Common Barriers</h4>
              </div>
              <div className="space-y-2">
                {selectedData.commonBarriers.map((barrier, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-medical-red-50 rounded-lg"
                  >
                    <span className="text-sm text-steel-800">{barrier}</span>
                    <span className="text-xs text-medical-red-600 font-semibold">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Agents */}
            <div className="p-4 bg-white rounded-xl border border-steel-200">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-medical-blue-600" />
                <h4 className="font-semibold text-steel-900">Preferred Agents</h4>
              </div>
              <div className="space-y-3">
                {selectedData.preferredAgents.map((agent, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-steel-800">
                        {agent.name}
                      </span>
                      <span className="text-sm font-bold text-medical-blue-600">
                        {agent.usage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-steel-100 rounded-full h-2">
                      <div
                        className="h-2 bg-medical-blue-500 rounded-full"
                        style={{ width: `${agent.usage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-steel-200">
        <div>
          <div className="text-sm text-steel-600 mb-1">Highest Opportunity</div>
          <div className="text-lg font-bold text-medical-amber-600">
            {gdmtData.sort((a, b) => (b.targetRate - b.currentRate) - (a.targetRate - a.currentRate))[0].pillar}
          </div>
          <div className="text-sm text-steel-600">
            {(gdmtData.sort((a, b) => (b.targetRate - b.currentRate) - (a.targetRate - a.currentRate))[0].targetRate - 
              gdmtData.sort((a, b) => (b.targetRate - b.currentRate) - (a.targetRate - a.currentRate))[0].currentRate).toFixed(1)}% gap to target
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Best Performing</div>
          <div className="text-lg font-bold text-medical-green-600">
            {gdmtData.sort((a, b) => b.currentRate - a.currentRate)[0].pillar}
          </div>
          <div className="text-sm text-steel-600">
            {gdmtData.sort((a, b) => b.currentRate - a.currentRate)[0].currentRate.toFixed(1)}% current rate
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Total Cost Savings</div>
          <div className="text-lg font-bold text-steel-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(gdmtData.reduce((sum, d) => sum + d.costSavings, 0))}
          </div>
          <div className="text-sm text-steel-600">Annual opportunity</div>
        </div>
      </div>
    </div>
  );
};

export default GDMTAnalyticsDashboard;