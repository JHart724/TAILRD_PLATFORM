import React, { useState } from 'react';
import { User, TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';

interface ProviderData {
  id: string;
  name: string;
  title: string;
  patients: number;
  gdmtOptimal: number;
  gdmtRate: number;
  readmissionRate: number;
  lvefImprovement: number;
  qualityScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  specialtyFocus: string[];
  caseComplexity: 'low' | 'medium' | 'high';
}

const ProviderScorecard: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof ProviderData>('qualityScore');

  // Mock provider data - will be replaced with real API data
  const providerData: ProviderData[] = [
    {
      id: 'DR001',
      name: 'Dr. Sarah Rivera',
      title: 'Interventional Cardiologist',
      patients: 187,
      gdmtOptimal: 142,
      gdmtRate: 75.9,
      readmissionRate: 8.2,
      lvefImprovement: 12.4,
      qualityScore: 94.2,
      trend: 'up',
      trendValue: 5.2,
      specialtyFocus: ['Complex PCI', 'Structural Heart'],
      caseComplexity: 'high',
    },
    {
      id: 'DR002',
      name: 'Dr. Michael Chen',
      title: 'Heart Failure Specialist',
      patients: 234,
      gdmtOptimal: 167,
      gdmtRate: 71.4,
      readmissionRate: 9.1,
      lvefImprovement: 14.7,
      qualityScore: 91.8,
      trend: 'up',
      trendValue: 3.1,
      specialtyFocus: ['Advanced HF', 'LVAD'],
      caseComplexity: 'high',
    },
    {
      id: 'DR003',
      name: 'Dr. Amanda Foster',
      title: 'General Cardiologist',
      patients: 156,
      gdmtOptimal: 98,
      gdmtRate: 62.8,
      readmissionRate: 11.7,
      lvefImprovement: 8.9,
      qualityScore: 82.4,
      trend: 'down',
      trendValue: -2.8,
      specialtyFocus: ['Preventive Cardiology'],
      caseComplexity: 'medium',
    },
    {
      id: 'DR004',
      name: 'Dr. James Park',
      title: 'Electrophysiologist',
      patients: 98,
      gdmtOptimal: 71,
      gdmtRate: 72.4,
      readmissionRate: 7.8,
      lvefImprovement: 11.2,
      qualityScore: 88.9,
      trend: 'up',
      trendValue: 4.7,
      specialtyFocus: ['Device Therapy', 'Arrhythmias'],
      caseComplexity: 'high',
    },
    {
      id: 'DR005',
      name: 'Dr. Lisa Martinez',
      title: 'Heart Failure Specialist',
      patients: 203,
      gdmtOptimal: 154,
      gdmtRate: 75.9,
      readmissionRate: 8.9,
      lvefImprovement: 13.1,
      qualityScore: 92.7,
      trend: 'stable',
      trendValue: 0.2,
      specialtyFocus: ['Transplant', 'Advanced HF'],
      caseComplexity: 'high',
    },
  ];

  const sortedProviders = [...providerData].sort((a, b) => {
    if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
      return (b[sortBy] as number) - (a[sortBy] as number);
    }
    return 0;
  });

  const getPerformanceColor = (value: number, type: 'rate' | 'readmission' | 'quality') => {
    if (type === 'readmission') {
      if (value <= 8) return 'text-medical-green-600 bg-medical-green-50';
      if (value <= 12) return 'text-medical-amber-600 bg-medical-amber-50';
      return 'text-medical-red-600 bg-medical-red-50';
    }
    
    if (type === 'quality') {
      if (value >= 90) return 'text-medical-green-600 bg-medical-green-50';
      if (value >= 80) return 'text-medical-amber-600 bg-medical-amber-50';
      return 'text-medical-red-600 bg-medical-red-50';
    }
    
    // Default for rates
    if (value >= 70) return 'text-medical-green-600 bg-medical-green-50';
    if (value >= 60) return 'text-medical-amber-600 bg-medical-amber-50';
    return 'text-medical-red-600 bg-medical-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-medical-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-medical-red-600" />;
      default:
        return <div className="w-4 h-4 bg-steel-400 rounded-full"></div>;
    }
  };

  const selectedProviderData = providerData.find(p => p.id === selectedProvider);

  return (
    <div className="retina-card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Provider Performance Scorecard
          </h2>
          <p className="text-steel-600">
            GDMT adoption and quality metrics by physician
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as keyof ProviderData)}
            className="px-3 py-2 border border-steel-300 rounded-lg text-sm bg-white"
          >
            <option value="qualityScore">Quality Score</option>
            <option value="gdmtRate">GDMT Rate</option>
            <option value="patients">Patient Volume</option>
            <option value="readmissionRate">Readmission Rate</option>
          </select>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {sortedProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setSelectedProvider(
              selectedProvider === provider.id ? null : provider.id
            )}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              selectedProvider === provider.id
                ? 'border-medical-blue-400 shadow-retina-3 bg-medical-blue-50/30'
                : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2'
            }`}
          >
            {/* Provider Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-medical-blue-100">
                  <User className="w-5 h-5 text-medical-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-steel-900">{provider.name}</div>
                  <div className="text-sm text-steel-600">{provider.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(provider.trend)}
                <span className={`text-sm font-semibold ${
                  provider.trend === 'up' ? 'text-medical-green-600' :
                  provider.trend === 'down' ? 'text-medical-red-600' : 'text-steel-600'
                }`}>
                  {provider.trend !== 'stable' && (provider.trendValue > 0 ? '+' : '')}{provider.trendValue}%
                </span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-steel-50">
                <div className="text-2xl font-bold text-steel-900">{provider.patients}</div>
                <div className="text-xs text-steel-600">Patients</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.gdmtRate, 'rate')}`}>
                <div className="text-2xl font-bold">{provider.gdmtRate.toFixed(1)}%</div>
                <div className="text-xs">GDMT Rate</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.readmissionRate, 'readmission')}`}>
                <div className="text-2xl font-bold">{provider.readmissionRate.toFixed(1)}%</div>
                <div className="text-xs">Readmit Rate</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${getPerformanceColor(provider.qualityScore, 'quality')}`}>
                <div className="text-2xl font-bold">{provider.qualityScore.toFixed(0)}</div>
                <div className="text-xs">Quality Score</div>
              </div>
            </div>

            {/* Specialty Focus */}
            <div className="mt-3 flex flex-wrap gap-1">
              {provider.specialtyFocus.map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-steel-100 text-steel-700 rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Provider Detailed View */}
      {selectedProviderData && (
        <div className="p-6 bg-medical-blue-50/50 rounded-xl border-2 border-medical-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-steel-900 font-sf">
                {selectedProviderData.name}
              </h3>
              <p className="text-steel-600">{selectedProviderData.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-medical-blue-600" />
              <span className="text-lg font-bold text-medical-blue-600">
                Rank #{sortedProviders.findIndex(p => p.id === selectedProviderData.id) + 1}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">Total Patients</div>
              <div className="text-3xl font-bold text-steel-900">{selectedProviderData.patients}</div>
              <div className="text-sm text-steel-600 mt-1">
                {selectedProviderData.gdmtOptimal} on optimal GDMT
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">GDMT Adoption</div>
              <div className="text-3xl font-bold text-medical-blue-600">
                {selectedProviderData.gdmtRate.toFixed(1)}%
              </div>
              <div className="text-sm text-steel-600 mt-1">
                vs {(sortedProviders.reduce((sum, p) => sum + p.gdmtRate, 0) / sortedProviders.length).toFixed(1)}% avg
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">LVEF Improvement</div>
              <div className="text-3xl font-bold text-medical-green-600">
                +{selectedProviderData.lvefImprovement.toFixed(1)}%
              </div>
              <div className="text-sm text-steel-600 mt-1">
                Average increase
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-1">Case Complexity</div>
              <div className={`text-2xl font-bold ${
                selectedProviderData.caseComplexity === 'high' ? 'text-medical-red-600' :
                selectedProviderData.caseComplexity === 'medium' ? 'text-medical-amber-600' :
                'text-medical-green-600'
              }`}>
                {selectedProviderData.caseComplexity.toUpperCase()}
              </div>
              <div className="text-sm text-steel-600 mt-1">
                Risk-adjusted
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-steel-200">
        <div>
          <div className="text-sm text-steel-600 mb-1">Top Performer</div>
          <div className="text-lg font-bold text-medical-green-600">
            {sortedProviders[0].name}
          </div>
          <div className="text-sm text-steel-600">
            {sortedProviders[0].qualityScore.toFixed(1)} Quality Score
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Average GDMT Rate</div>
          <div className="text-lg font-bold text-steel-900">
            {(sortedProviders.reduce((sum, p) => sum + p.gdmtRate, 0) / sortedProviders.length).toFixed(1)}%
          </div>
          <div className="text-sm text-steel-600">
            Across {sortedProviders.length} providers
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Total Patients</div>
          <div className="text-lg font-bold text-medical-blue-600">
            {sortedProviders.reduce((sum, p) => sum + p.patients, 0)}
          </div>
          <div className="text-sm text-steel-600">
            Heart failure patients
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderScorecard;