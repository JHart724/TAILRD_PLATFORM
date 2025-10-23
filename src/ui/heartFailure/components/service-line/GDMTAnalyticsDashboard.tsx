import React, { useState } from 'react';
import { Pill, Target, Heart, Users, Stethoscope, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface GDMTData {
  pillar: string;
  currentRate: number;
  targetRate: number;
  patientCount: number;
  avgTitration: number;
  primaryBarrier: string;
  recentTrend: number;
}

interface GDMTByPillarsData {
  pillars: number;
  patients: number;
  percentage: number;
  mortalityReduction: number;
  hfHospReduction: number;
  avgCost: number;
}

interface GDMTByHFTypeData {
  type: 'HFrEF' | 'HFpEF' | 'HFmrEF';
  patients: number;
  gdmtEligible: number;
  fourPillarRate: number;
  avgPillars: number;
  primaryBarrier: string;
  outcomeBenefit: number;
}

interface GDMTByProviderData {
  provider: string;
  specialty: string;
  patients: number;
  gdmtScore: number;
  fourPillarRate: number;
  avgTimeToOptimal: number;
  topPillarGap: string;
  improvementTrend: number;
}

type AnalyticsView = 'pillars-summary' | 'hf-type' | 'providers' | 'pillars-detail';

const GDMTAnalyticsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<AnalyticsView>('pillars-summary');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  const gdmtData: GDMTData[] = [
    {
      pillar: 'ACE-I/ARB/ARNI',
      currentRate: 84.2,
      targetRate: 90,
      patientCount: 892,
      avgTitration: 67.8,
      primaryBarrier: 'Renal function monitoring',
      recentTrend: 2.3,
    },
    {
      pillar: 'Beta Blockers',
      currentRate: 78.5,
      targetRate: 85,
      patientCount: 831,
      avgTitration: 72.1,
      primaryBarrier: 'Symptomatic hypotension',
      recentTrend: 1.8,
    },
    {
      pillar: 'MRA',
      currentRate: 62.1,
      targetRate: 75,
      patientCount: 658,
      avgTitration: 58.9,
      primaryBarrier: 'Hyperkalemia concerns',
      recentTrend: 3.7,
    },
    {
      pillar: 'SGLT2i',
      currentRate: 45.8,
      targetRate: 70,
      patientCount: 485,
      avgTitration: 89.2,
      primaryBarrier: 'Cost and prior authorization',
      recentTrend: 8.4,
    },
  ];

  const gdmtByPillars: GDMTByPillarsData[] = [
    {
      pillars: 0,
      patients: 89,
      percentage: 7.1,
      mortalityReduction: 0,
      hfHospReduction: 0,
      avgCost: 12400,
    },
    {
      pillars: 1,
      patients: 247,
      percentage: 19.8,
      mortalityReduction: 15,
      hfHospReduction: 18,
      avgCost: 9800,
    },
    {
      pillars: 2,
      patients: 398,
      percentage: 31.9,
      mortalityReduction: 32,
      hfHospReduction: 38,
      avgCost: 8200,
    },
    {
      pillars: 3,
      patients: 341,
      percentage: 27.3,
      mortalityReduction: 48,
      hfHospReduction: 55,
      avgCost: 7100,
    },
    {
      pillars: 4,
      patients: 172,
      percentage: 13.8,
      mortalityReduction: 67,
      hfHospReduction: 72,
      avgCost: 6200,
    },
  ];

  const gdmtByHFType: GDMTByHFTypeData[] = [
    {
      type: 'HFrEF',
      patients: 847,
      gdmtEligible: 789,
      fourPillarRate: 18.2,
      avgPillars: 2.4,
      primaryBarrier: 'Medication intolerance',
      outcomeBenefit: 42,
    },
    {
      type: 'HFpEF',
      patients: 298,
      gdmtEligible: 267,
      fourPillarRate: 8.9,
      avgPillars: 1.8,
      primaryBarrier: 'Limited evidence base',
      outcomeBenefit: 18,
    },
    {
      type: 'HFmrEF',
      patients: 102,
      gdmtEligible: 91,
      fourPillarRate: 12.1,
      avgPillars: 2.1,
      primaryBarrier: 'Treatment uncertainty',
      outcomeBenefit: 28,
    },
  ];

  const gdmtByProvider: GDMTByProviderData[] = [
    {
      provider: 'Dr. Sarah Williams',
      specialty: 'Cardiology',
      patients: 89,
      gdmtScore: 92.1,
      fourPillarRate: 42.2,
      avgTimeToOptimal: 3.2,
      topPillarGap: 'SGLT2i',
      improvementTrend: 8.4,
    },
    {
      provider: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      patients: 76,
      gdmtScore: 88.7,
      fourPillarRate: 38.9,
      avgTimeToOptimal: 4.1,
      topPillarGap: 'MRA',
      improvementTrend: 5.2,
    },
    {
      provider: 'Dr. Jennifer Martinez',
      specialty: 'Internal Medicine',
      patients: 124,
      gdmtScore: 67.3,
      fourPillarRate: 18.5,
      avgTimeToOptimal: 8.7,
      topPillarGap: 'SGLT2i',
      improvementTrend: 12.1,
    },
    {
      provider: 'Dr. Robert Johnson',
      specialty: 'Family Medicine',
      patients: 98,
      gdmtScore: 45.8,
      fourPillarRate: 8.2,
      avgTimeToOptimal: 12.4,
      topPillarGap: 'Beta Blockers',
      improvementTrend: 2.8,
    },
    {
      provider: 'Dr. Lisa Thompson',
      specialty: 'Internal Medicine',
      patients: 87,
      gdmtScore: 72.4,
      fourPillarRate: 24.1,
      avgTimeToOptimal: 6.9,
      topPillarGap: 'ACE-I/ARB',
      improvementTrend: 7.3,
    },
  ];

  const getPillarColor = (pillar: string) => {
    const colorMap: { [key: string]: string } = {
      'ACE-I/ARB/ARNI': 'blue',
      'Beta Blockers': 'green',
      'MRA': 'yellow',
      'SGLT2i': 'purple',
    };
    return colorMap[pillar] || 'gray';
  };

  const selectedData = selectedPillar ? gdmtData.find(d => d.pillar === selectedPillar) : null;

  const tabs = [
    {
      id: 'pillars-summary' as AnalyticsView,
      label: 'By # of Pillars',
      icon: Target,
      description: 'Optimization distribution',
    },
    {
      id: 'hf-type' as AnalyticsView,
      label: 'By HF Type',
      icon: Heart,
      description: 'HFrEF/HFpEF/HFmrEF breakdown',
    },
    {
      id: 'providers' as AnalyticsView,
      label: 'By Provider',
      icon: Stethoscope,
      description: 'Individual physician performance',
    },
    {
      id: 'pillars-detail' as AnalyticsView,
      label: 'Pillar Details',
      icon: Pill,
      description: 'Individual therapy deep dive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with KPIs */}
      <div className="retina-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">GDMT Analytics Dashboard</h2>
            <p className="text-steel-600">Essential 4-pillar therapy optimization insights</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-medical-blue-600">68.4%</div>
              <div className="text-sm text-steel-600">Overall GDMT Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">13.8%</div>
              <div className="text-sm text-steel-600">4-Pillar Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">2.3</div>
              <div className="text-sm text-steel-600">Avg Pillars</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  activeView === tab.id
                    ? 'border-medical-blue-400 bg-medical-blue-50'
                    : 'border-steel-200 hover:border-steel-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <IconComponent className={`w-4 h-4 ${
                    activeView === tab.id ? 'text-medical-blue-600' : 'text-steel-600'
                  }`} />
                  <div className="text-left">
                    <div className={`font-semibold text-sm ${
                      activeView === tab.id ? 'text-medical-blue-900' : 'text-steel-900'
                    }`}>
                      {tab.label}
                    </div>
                    <div className={`text-xs ${
                      activeView === tab.id ? 'text-medical-blue-700' : 'text-steel-600'
                    }`}>
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* By # of Pillars View */}
      {activeView === 'pillars-summary' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-medical-blue-600" />
              <h3 className="text-xl font-bold text-steel-900">GDMT by Number of Pillars</h3>
            </div>
            
            <div className="space-y-4">
              {gdmtByPillars.map((data) => (
                <div key={data.pillars} className="p-4 rounded-lg border border-steel-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                        data.pillars === 0 ? 'bg-red-500' :
                        data.pillars === 1 ? 'bg-orange-500' :
                        data.pillars === 2 ? 'bg-yellow-500' :
                        data.pillars === 3 ? 'bg-green-500' : 'bg-emerald-600'
                      }`}>
                        {data.pillars}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">
                          {data.pillars} Pillar{data.pillars !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-steel-600">
                          {data.patients} patients ({data.percentage}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">
                          {data.mortalityReduction}%
                        </div>
                        <div className="text-xs text-steel-600">Mortality ↓</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {data.hfHospReduction}%
                        </div>
                        <div className="text-xs text-steel-600">HF Hosp ↓</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          ${data.avgCost.toLocaleString()}
                        </div>
                        <div className="text-xs text-steel-600">Avg Cost</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By HF Type View */}
      {activeView === 'hf-type' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-6 h-6 text-medical-blue-600" />
              <h3 className="text-xl font-bold text-steel-900">GDMT by Heart Failure Type</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {gdmtByHFType.map((data) => (
                <div key={data.type} className="p-6 rounded-lg border-2 border-steel-200 hover:shadow-lg transition-all">
                  <div className="text-center mb-4">
                    <div className={`text-2xl font-bold mb-2 ${
                      data.type === 'HFrEF' ? 'text-red-600' :
                      data.type === 'HFpEF' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {data.type}
                    </div>
                    <div className="text-steel-600 text-sm">
                      {data.patients} total patients
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-steel-600">GDMT Eligible:</span>
                      <span className="font-semibold">{data.gdmtEligible}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">4-Pillar Rate:</span>
                      <span className="font-semibold text-emerald-600">{data.fourPillarRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Avg Pillars:</span>
                      <span className="font-semibold">{data.avgPillars}</span>
                    </div>
                    <div className="pt-2 border-t border-steel-200">
                      <div className="text-xs text-steel-600 mb-1">Primary Barrier:</div>
                      <div className="text-sm font-medium text-steel-800">{data.primaryBarrier}</div>
                    </div>
                    <div className="text-center pt-2">
                      <div className="text-lg font-bold text-medical-blue-600">
                        {data.outcomeBenefit}%
                      </div>
                      <div className="text-xs text-steel-600">Expected Benefit</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By Provider View */}
      {activeView === 'providers' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Stethoscope className="w-6 h-6 text-medical-blue-600" />
              <h3 className="text-xl font-bold text-steel-900">GDMT by Provider Performance</h3>
            </div>
            
            <div className="space-y-4">
              {gdmtByProvider.map((provider, index) => (
                <div key={provider.provider} className="p-4 rounded-lg border border-steel-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-emerald-600' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-red-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{provider.provider}</div>
                        <div className="text-sm text-steel-600">{provider.specialty} • {provider.patients} patients</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-medical-blue-600">
                          {provider.gdmtScore}
                        </div>
                        <div className="text-xs text-steel-600">GDMT Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">
                          {provider.fourPillarRate}%
                        </div>
                        <div className="text-xs text-steel-600">4-Pillar Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {provider.avgTimeToOptimal}mo
                        </div>
                        <div className="text-xs text-steel-600">Time to Optimal</div>
                      </div>
                      <div className="text-center">
                        <div className={`flex items-center gap-1 ${
                          provider.improvementTrend > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {provider.improvementTrend > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="text-sm font-bold">
                            {Math.abs(provider.improvementTrend)}%
                          </span>
                        </div>
                        <div className="text-xs text-steel-600">Trend</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pillar Details View */}
      {activeView === 'pillars-detail' && (
        <div className="space-y-6">
          <div className="retina-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Pill className="w-6 h-6 text-medical-blue-600" />
              <h3 className="text-xl font-bold text-steel-900">Individual Pillar Deep Dive</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {gdmtData.map((pillar) => {
                const colorClass = getPillarColor(pillar.pillar);
                return (
                  <button
                    key={pillar.pillar}
                    onClick={() => setSelectedPillar(
                      selectedPillar === pillar.pillar ? null : pillar.pillar
                    )}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPillar === pillar.pillar
                        ? `border-${colorClass}-400 bg-${colorClass}-50 shadow-lg`
                        : 'border-steel-200 hover:border-steel-300 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm ${
                        selectedPillar === pillar.pillar ? `text-${colorClass}-900` : 'text-steel-900'
                      }`}>
                        {pillar.pillar}
                      </span>
                      <div className={`flex items-center gap-1 ${
                        pillar.recentTrend > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {pillar.recentTrend > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-xs font-bold">
                          {Math.abs(pillar.recentTrend)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold mb-1">{pillar.currentRate}%</div>
                    <div className="text-xs text-steel-600">
                      {pillar.patientCount} patients
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedData && (
              <div className="space-y-6">
                <div className={`p-6 rounded-xl bg-${getPillarColor(selectedData.pillar)}-50 border-2 border-${getPillarColor(selectedData.pillar)}-200`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-steel-900">{selectedData.pillar}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-steel-600">Target:</span>
                      <span className="font-bold text-emerald-600">{selectedData.targetRate}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-medical-blue-600 mb-1">
                        {selectedData.currentRate}%
                      </div>
                      <div className="text-steel-600">Current Rate</div>
                      <div className="text-sm text-steel-500">
                        {selectedData.patientCount} patients
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {selectedData.avgTitration}%
                      </div>
                      <div className="text-steel-600">Avg Titration</div>
                      <div className="text-sm text-steel-500">
                        to target dose
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-1 ${
                        selectedData.recentTrend > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {selectedData.recentTrend > 0 ? '+' : ''}{selectedData.recentTrend}%
                      </div>
                      <div className="text-steel-600">Recent Trend</div>
                      <div className="text-sm text-steel-500">
                        last 3 months
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="font-semibold text-steel-900">Primary Barrier</span>
                    </div>
                    <div className="text-steel-700">{selectedData.primaryBarrier}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GDMTAnalyticsDashboard;