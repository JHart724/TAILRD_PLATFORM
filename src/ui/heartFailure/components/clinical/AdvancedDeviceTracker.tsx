import React, { useState } from 'react';
import { Activity, Heart, Zap, Monitor, TrendingUp, AlertTriangle, DollarSign, Users } from 'lucide-react';

interface DeviceData {
  id: string;
  name: string;
  eligiblePercent: string;
  nationalUtilization: string;
  currentUtilization: number;
  avgReimbursement: string;
  strategicValue: string;
  citation: string;
  eligiblePatients: number;
  utilizedPatients: number;
  revenueGap: number;
  category: 'device' | 'procedure' | 'diagnostic' | 'therapy';
}

const DEVICE_INTERVENTIONS: DeviceData[] = [
  {
    id: 'iv-iron',
    name: 'IV Iron Therapy',
    eligiblePercent: '~50%',
    nationalUtilization: '~5-10%',
    currentUtilization: 12,
    avgReimbursement: '$2,000-$3,500',
    strategicValue: 'Improves QoL; outpatient, 340B-eligible',
    citation: 'Yeo et al., ESC HF 2020',
    eligiblePatients: 623,
    utilizedPatients: 67,
    revenueGap: 1390000,
    category: 'therapy'
  },
  {
    id: 'icd',
    name: 'ICD',
    eligiblePercent: '~30-35%',
    nationalUtilization: '~25-30%',
    currentUtilization: 28,
    avgReimbursement: '$25,000-$40,000',
    strategicValue: 'Prevents SCD; enables follow-up clinic revenue',
    citation: 'SCD-HeFT, NEJM 2005',
    eligiblePatients: 435,
    utilizedPatients: 122,
    revenueGap: 10407500,
    category: 'device'
  },
  {
    id: 'crt-d',
    name: 'CRT / CRT-D',
    eligiblePercent: '~10-15%',
    nationalUtilization: '~50-60%',
    currentUtilization: 58,
    avgReimbursement: '$30,000-$45,000',
    strategicValue: 'Reduces hospitalization; EP procedure volume',
    citation: 'COMPANION, NEJM 2004',
    eligiblePatients: 187,
    utilizedPatients: 108,
    revenueGap: 2962500,
    category: 'device'
  },
  {
    id: 'cardiomems',
    name: 'CardioMEMS',
    eligiblePercent: '~15-25%',
    nationalUtilization: '<10%',
    currentUtilization: 8,
    avgReimbursement: '$18,000-$22,000',
    strategicValue: 'Remote monitoring, RPM revenue; CMS aligned',
    citation: 'Desai et al., JACC 2017',
    eligiblePatients: 311,
    utilizedPatients: 25,
    revenueGap: 5716000,
    category: 'device'
  },
  {
    id: 'mitraclip',
    name: 'MitraClip (TEER)',
    eligiblePercent: '~5-10%',
    nationalUtilization: '<2%',
    currentUtilization: 3,
    avgReimbursement: '$30,000-$45,000',
    strategicValue: 'Reduces readmissions; fits COAPT trial population',
    citation: 'Stone et al., NEJM 2018',
    eligiblePatients: 93,
    utilizedPatients: 3,
    revenueGap: 3375000,
    category: 'procedure'
  },
  {
    id: 'tavr',
    name: 'TAVR',
    eligiblePercent: '~5%',
    nationalUtilization: '~70-80%',
    currentUtilization: 76,
    avgReimbursement: '$40,000-$60,000',
    strategicValue: 'Expanding indications; high reimbursement',
    citation: 'Lindman et al., JACC 2020',
    eligiblePatients: 62,
    utilizedPatients: 47,
    revenueGap: 750000,
    category: 'procedure'
  },
  {
    id: 'af-ablation',
    name: 'AF Ablation',
    eligiblePercent: '~20-30%',
    nationalUtilization: '~5-10%',
    currentUtilization: 9,
    avgReimbursement: '$15,000-$25,000',
    strategicValue: 'Improves EF and survival; drives EP revenue',
    citation: 'CASTLE-AF, NEJM 2018',
    eligiblePatients: 374,
    utilizedPatients: 34,
    revenueGap: 6800000,
    category: 'procedure'
  },
  {
    id: 'lvad',
    name: 'LVAD',
    eligiblePercent: '~1-2%',
    nationalUtilization: '~30-50%',
    currentUtilization: 42,
    avgReimbursement: '$150,000-$250,000',
    strategicValue: 'End-stage therapy; transplant/Destination therapy pathway',
    citation: 'REMATCH, NEJM 2001',
    eligiblePatients: 25,
    utilizedPatients: 10,
    revenueGap: 3000000,
    category: 'device'
  },
  {
    id: 'bat',
    name: 'BAT (Baroreflex Activation)',
    eligiblePercent: '~1%',
    nationalUtilization: '<1%',
    currentUtilization: 0.5,
    avgReimbursement: '$20,000-$30,000',
    strategicValue: 'Non-pharma option; possible outpatient billing stream',
    citation: 'BeAT-HF Trial, JCF 2020; EJHF 2022',
    eligiblePatients: 12,
    utilizedPatients: 0,
    revenueGap: 300000,
    category: 'device'
  },
  {
    id: 'ilr',
    name: 'ILR (Loop Recorder)',
    eligiblePercent: '~2-3%',
    nationalUtilization: 'Unknown',
    currentUtilization: 15,
    avgReimbursement: '$7,000-$10,000',
    strategicValue: 'Arrhythmia diagnostics; supports RPM revenue',
    citation: 'AHA HF Guidelines 2022; Curr Cardiol Rev 2023',
    eligiblePatients: 37,
    utilizedPatients: 6,
    revenueGap: 263500,
    category: 'diagnostic'
  },
  {
    id: 'advanced-imaging',
    name: 'Advanced Imaging (MRI, PET)',
    eligiblePercent: '~15%',
    nationalUtilization: 'Variable',
    currentUtilization: 22,
    avgReimbursement: '$2,000-$5,000',
    strategicValue: 'Amyloid/sarcoid/viability dx; leverages existing infrastructure',
    citation: 'JACC HF Imaging 2021; AHA Guidelines 2022',
    eligiblePatients: 187,
    utilizedPatients: 41,
    revenueGap: 511000,
    category: 'diagnostic'
  },
  {
    id: 'genetic-testing',
    name: 'Genetic Testing & Counseling',
    eligiblePercent: '~2-3%',
    nationalUtilization: '<5%',
    currentUtilization: 3,
    avgReimbursement: '$1,000-$5,000',
    strategicValue: 'Precision medicine, family screening; outpatient reimbursable',
    citation: 'AHA Genetics 2020; HFSA 2023',
    eligiblePatients: 37,
    utilizedPatients: 1,
    revenueGap: 108000,
    category: 'diagnostic'
  }
];

const AdvancedDeviceTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'revenue' | 'utilization'>('gap');

  const filteredDevices = DEVICE_INTERVENTIONS
    .filter(device => selectedCategory === 'all' || device.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'gap':
          return (b.eligiblePatients - b.utilizedPatients) - (a.eligiblePatients - a.utilizedPatients);
        case 'revenue':
          return b.revenueGap - a.revenueGap;
        case 'utilization':
          return a.currentUtilization - b.currentUtilization;
        default:
          return 0;
      }
    });

  const totalEligible = DEVICE_INTERVENTIONS.reduce((sum, d) => sum + d.eligiblePatients, 0);
  const totalUtilized = DEVICE_INTERVENTIONS.reduce((sum, d) => sum + d.utilizedPatients, 0);
  const totalRevenueGap = DEVICE_INTERVENTIONS.reduce((sum, d) => sum + d.revenueGap, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'device': return <Heart className="w-5 h-5" />;
      case 'procedure': return <Activity className="w-5 h-5" />;
      case 'diagnostic': return <Monitor className="w-5 h-5" />;
      case 'therapy': return <Zap className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'device': return 'text-deep-blue-600 bg-deep-blue-50 border-deep-blue-200';
      case 'procedure': return 'text-deep-red-600 bg-deep-red-50 border-deep-red-200';
      case 'diagnostic': return 'text-deep-green-600 bg-deep-green-50 border-deep-green-200';
      case 'therapy': return 'text-deep-amber-600 bg-deep-amber-50 border-deep-amber-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 10) return 'text-deep-red-600 bg-deep-red-50';
    if (utilization < 30) return 'text-deep-amber-600 bg-deep-amber-50';
    if (utilization < 50) return 'text-deep-blue-600 bg-deep-blue-50';
    return 'text-deep-green-600 bg-deep-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="retina-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-medical-blue-500" />
          <div>
            <h2 className="text-3xl font-bold text-steel-900 font-sf">Advanced Device & Intervention Tracker</h2>
            <p className="text-steel-600">Underutilized procedures with high clinical and financial impact</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-medical-blue-600 font-sf">{totalEligible}</div>
            <div className="text-sm text-medical-blue-700">Total Eligible Patients</div>
          </div>
          <div className="p-4 bg-deep-green-50 border border-deep-green-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-green-600 font-sf">{totalUtilized}</div>
            <div className="text-sm text-deep-green-700">Currently Receiving</div>
          </div>
          <div className="p-4 bg-deep-amber-50 border border-deep-amber-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-amber-600 font-sf">{Math.round((totalUtilized/totalEligible)*100)}%</div>
            <div className="text-sm text-deep-amber-700">Overall Utilization</div>
          </div>
          <div className="p-4 bg-deep-red-50 border border-deep-red-200 rounded-lg">
            <div className="text-2xl font-bold text-deep-red-600 font-sf">${(totalRevenueGap / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-deep-red-700">Revenue Opportunity</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="device">Devices</option>
            <option value="procedure">Procedures</option>
            <option value="diagnostic">Diagnostics</option>
            <option value="therapy">Therapies</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'gap' | 'revenue' | 'utilization')}
            className="px-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="gap">Sort by Patient Gap</option>
            <option value="revenue">Sort by Revenue Gap</option>
            <option value="utilization">Sort by Utilization</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="retina-card p-6 hover:shadow-retina-3 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-steel-900 mb-2">{device.name}</h3>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(device.category)}`}>
                  {getCategoryIcon(device.category)}
                  {device.category.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Utilization Progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-steel-700">Current Utilization</span>
                <span className={`text-sm font-bold px-2 py-1 rounded ${getUtilizationColor(device.currentUtilization)}`}>
                  {device.currentUtilization}%
                </span>
              </div>
              <div className="w-full bg-steel-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    device.currentUtilization < 10 ? 'bg-deep-red-500' :
                    device.currentUtilization < 30 ? 'bg-deep-amber-500' :
                    device.currentUtilization < 50 ? 'bg-deep-blue-500' : 'bg-deep-green-500'
                  }`}
                  style={{ width: `${Math.min(device.currentUtilization, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-steel-600 mt-1">
                National: {device.nationalUtilization}
              </div>
            </div>

            {/* Patient Numbers */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-steel-50 rounded">
                <div className="font-bold text-steel-900">{device.eligiblePatients}</div>
                <div className="text-xs text-steel-600">Eligible</div>
              </div>
              <div className="text-center p-2 bg-deep-green-50 rounded">
                <div className="font-bold text-deep-green-600">{device.utilizedPatients}</div>
                <div className="text-xs text-deep-green-700">Current</div>
              </div>
              <div className="text-center p-2 bg-deep-red-50 rounded">
                <div className="font-bold text-deep-red-600">{device.eligiblePatients - device.utilizedPatients}</div>
                <div className="text-xs text-deep-red-700">Gap</div>
              </div>
            </div>

            {/* Clinical Info */}
            <div className="space-y-2 mb-4">
              <div>
                <div className="text-xs font-semibold text-steel-700">Eligibility</div>
                <div className="text-xs text-steel-600">{device.eligiblePercent}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-steel-700">Reimbursement</div>
                <div className="text-xs text-steel-600">{device.avgReimbursement}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-steel-700">Strategic Value</div>
                <div className="text-xs text-steel-600">{device.strategicValue}</div>
              </div>
            </div>

            {/* Revenue Impact */}
            <div className="flex items-center justify-between p-3 bg-medical-green-50 border border-medical-green-200 rounded-lg mb-4">
              <div>
                <div className="text-sm font-semibold text-medical-green-800">Revenue Gap</div>
                <div className="text-xs text-medical-green-600">{device.citation}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-medical-green-700">
                  ${device.revenueGap >= 1000000 ? `${(device.revenueGap / 1000000).toFixed(1)}M` : `${(device.revenueGap / 1000).toFixed(0)}K`}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-medical-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-medical-blue-600 transition-colors">
                Screen Patients
              </button>
              <button className="px-3 py-2 border border-steel-300 text-steel-700 text-sm font-semibold rounded-lg hover:bg-steel-50 transition-colors">
                Guidelines
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic Insights Panel */}
      <div className="retina-card p-6">
        <h3 className="text-xl font-bold text-steel-900 mb-4">Strategic Insights</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border-2 border-deep-red-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-deep-red-600 mb-2" />
            <div className="text-sm font-semibold text-deep-red-800">Highest Gap</div>
            <div className="text-lg font-bold text-deep-red-600">ICD Implants</div>
            <div className="text-xs text-deep-red-600">313 patients underutilized</div>
          </div>
          <div className="p-4 border-2 border-medical-green-200 rounded-lg">
            <DollarSign className="w-6 h-6 text-medical-green-600 mb-2" />
            <div className="text-sm font-semibold text-medical-green-800">Revenue Leader</div>
            <div className="text-lg font-bold text-medical-green-600">$10.4M</div>
            <div className="text-xs text-medical-green-600">ICD program expansion</div>
          </div>
          <div className="p-4 border-2 border-deep-blue-200 rounded-lg">
            <TrendingUp className="w-6 h-6 text-deep-blue-600 mb-2" />
            <div className="text-sm font-semibold text-deep-blue-800">Quick Win</div>
            <div className="text-lg font-bold text-deep-blue-600">IV Iron</div>
            <div className="text-xs text-deep-blue-600">Low complexity, high volume</div>
          </div>
          <div className="p-4 border-2 border-deep-amber-200 rounded-lg">
            <Users className="w-6 h-6 text-deep-amber-600 mb-2" />
            <div className="text-sm font-semibold text-deep-amber-800">Population Impact</div>
            <div className="text-lg font-bold text-deep-amber-600">2,191</div>
            <div className="text-xs text-deep-amber-600">Total underutilized patients</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDeviceTracker;