import React, { useState } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface ZipCodeData {
  zip: string;
  patients: number;
  abiScore: number;
  interventionRate: number;
  opportunityRevenue: number;
  amputationRate: number;
}

const PADGeographicHeatMap: React.FC = () => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Mock ZIP code data - will be replaced with real API data
  const zipData: ZipCodeData[] = [
 { zip: '60601', patients: 189, abiScore: 0.65, interventionRate: 38, opportunityRevenue: 2100000, amputationRate: 8.2 },
 { zip: '60602', patients: 143, abiScore: 0.72, interventionRate: 52, opportunityRevenue: 1500000, amputationRate: 5.8 },
 { zip: '60611', patients: 267, abiScore: 0.58, interventionRate: 31, opportunityRevenue: 3200000, amputationRate: 11.4 },
 { zip: '60614', patients: 134, abiScore: 0.78, interventionRate: 64, opportunityRevenue: 980000, amputationRate: 4.1 },
 { zip: '60622', patients: 198, abiScore: 0.62, interventionRate: 42, opportunityRevenue: 2400000, amputationRate: 9.6 },
 { zip: '60647', patients: 156, abiScore: 0.69, interventionRate: 48, opportunityRevenue: 1800000, amputationRate: 6.7 },
 { zip: '60657', patients: 112, abiScore: 0.81, interventionRate: 71, opportunityRevenue: 720000, amputationRate: 2.9 },
 { zip: '60804', patients: 234, abiScore: 0.59, interventionRate: 34, opportunityRevenue: 2800000, amputationRate: 10.8 },
  ];

  const getHeatColor = (abiScore: number) => {
 if (abiScore <= 0.60) return 'bg-medical-red-400';
 if (abiScore <= 0.70) return 'bg-chrome-50';
 if (abiScore <= 0.80) return 'bg-titanium-400';
 return 'bg-chrome-50';
  };

  const getHeatIntensity = (abiScore: number) => {
 const normalized = Math.min((1 - abiScore), 1);
 return `rgba(239, 68, 68, ${normalized * 0.8})`;
  };

  const formatCurrency = (value: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 notation: 'compact',
 compactDisplay: 'short',
 }).format(value);
  };

  const selectedData = zipData.find(z => z.zip === selectedZip);

  return (
 <div className="metal-card p-8">
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 PAD Geographic Heat Map
 </h2>
 <p className="text-titanium-600">
 ZIP code analysis by ankle-brachial index and intervention opportunity
 </p>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-chrome-50"></div>
 <span className="text-titanium-600">Normal</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-chrome-50"></div>
 <span className="text-titanium-600">Mild PAD</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-red-400"></div>
 <span className="text-titanium-600">Severe PAD</span>
 </div>
 </div>
 </div>

 {/* Heat Map Grid */}
 <div className="grid grid-cols-4 gap-3 mb-6">
 {zipData.map((data) => (
 <button
 key={data.zip}
 onClick={() => setSelectedZip(selectedZip === data.zip ? null : data.zip)}
 className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
 selectedZip === data.zip
 ? 'border-porsche-400 shadow-chrome-elevated'
 : 'border-transparent hover:border-titanium-300'
 }`}
 style={{
 background: `linear-gradient(135deg, ${getHeatIntensity(data.abiScore)}, rgba(248, 249, 250, 0.9))`,
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <MapPin className="w-4 h-4 text-titanium-700" />
 <span className="text-sm font-bold text-titanium-900">{data.zip}</span>
 </div>
 <div className="text-2xl font-bold text-titanium-900 mb-1">
 {toFixed(data.abiScore, 2)}
 </div>
 <div className="text-xs text-titanium-600">
 {data.patients} patients
 </div>
 <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getHeatColor(data.abiScore)}`}></div>
 </button>
 ))}
 </div>

 {/* Selected ZIP Details */}
 {selectedData && (
 <div className="p-6 bg-porsche-50/50 rounded-xl border-2 border-porsche-200">
 <div className="flex items-center justify-between mb-4">
 <div>
 <div className="text-sm text-titanium-600 mb-1">ZIP Code</div>
 <div className="text-3xl font-bold text-titanium-900 font-sf">
 {selectedData.zip}
 </div>
 </div>
 <div className={`px-4 py-2 rounded-lg ${getHeatColor(selectedData.abiScore)} text-white font-bold`}>
 ABI: {toFixed(selectedData.abiScore, 2)}
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="p-3 bg-white rounded-lg">
 <div className="flex items-center gap-2 mb-1">
 <Users className="w-4 h-4 text-titanium-600" />
 <div className="text-xs text-titanium-600">PAD Patients</div>
 </div>
 <div className="text-2xl font-bold text-titanium-900">
 {selectedData.patients}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Intervention Rate</div>
 <div className="text-2xl font-bold text-gray-500">
 {selectedData.interventionRate}%
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Opportunity</div>
 <div className="text-2xl font-bold text-teal-700">
 {formatCurrency(selectedData.opportunityRevenue)}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Amputation Rate</div>
 <div className="text-2xl font-bold text-medical-red-600">
 {selectedData.amputationRate}%
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Lowest ABI ZIP</div>
 <div className="text-xl font-bold text-medical-red-600">
 {zipData.sort((a, b) => a.abiScore - b.abiScore)[0].zip}
 </div>
 <div className="text-sm text-titanium-600">
 ABI: {toFixed(zipData.sort((a, b) => a.abiScore - b.abiScore)[0].abiScore, 2)}
 </div>
 </div>

 <div>
 <div className="text-xs text-titanium-600 mb-1">Largest Opportunity</div>
 <div className="text-xl font-bold text-titanium-700">
 {zipData.sort((a, b) => b.opportunityRevenue - a.opportunityRevenue)[0].zip}
 </div>
 <div className="text-sm text-titanium-600">
 {formatCurrency(zipData.sort((a, b) => b.opportunityRevenue - a.opportunityRevenue)[0].opportunityRevenue)}
 </div>
 </div>

 <div>
 <div className="text-xs text-titanium-600 mb-1">Total PAD Patients</div>
 <div className="text-xl font-bold text-porsche-600">
 {zipData.reduce((sum, z) => sum + z.patients, 0).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Across {zipData.length} ZIP codes</div>
 </div>
 </div>
 </div>
  );
};

export default PADGeographicHeatMap;