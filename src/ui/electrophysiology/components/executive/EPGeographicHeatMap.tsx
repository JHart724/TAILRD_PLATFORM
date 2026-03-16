import React, { useState } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface ZipCodeData {
  zip: string;
  patients: number;
  riskScore: number;
  oacRate: number;
  opportunityRevenue: number;
  strokeRate: number;
}

const EPGeographicHeatMap: React.FC = () => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Mock ZIP code data - will be replaced with real API data
  const zipData: ZipCodeData[] = [
 { zip: '60601', patients: 127, riskScore: 4.2, oacRate: 78, opportunityRevenue: 1800000, strokeRate: 2.5 },
 { zip: '60602', patients: 98, riskScore: 3.1, oacRate: 84, opportunityRevenue: 1200000, strokeRate: 1.8 },
 { zip: '60611', patients: 156, riskScore: 5.1, oacRate: 72, opportunityRevenue: 2400000, strokeRate: 3.1 },
 { zip: '60614', patients: 89, riskScore: 2.8, oacRate: 89, opportunityRevenue: 890000, strokeRate: 1.2 },
 { zip: '60622', patients: 134, riskScore: 4.7, oacRate: 76, opportunityRevenue: 1900000, strokeRate: 2.8 },
 { zip: '60647', patients: 112, riskScore: 3.8, oacRate: 81, opportunityRevenue: 1400000, strokeRate: 2.1 },
 { zip: '60657', patients: 76, riskScore: 2.4, oacRate: 92, opportunityRevenue: 680000, strokeRate: 0.9 },
 { zip: '60804', patients: 143, riskScore: 4.9, oacRate: 74, opportunityRevenue: 2100000, strokeRate: 3.0 },
  ];

  const getHeatColor = (riskScore: number) => {
 if (riskScore >= 4.5) return 'bg-medical-red-400';
 if (riskScore >= 3.5) return 'bg-medical-amber-400';
 if (riskScore >= 2.5) return 'bg-titanium-400';
 return 'bg-medical-green-400';
  };

  const getHeatIntensity = (riskScore: number) => {
 const normalized = Math.min(riskScore / 6, 1);
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
 Electrophysiology Geographic Heat Map
 </h2>
 <p className="text-titanium-600">
 ZIP code analysis by stroke risk and anticoagulation opportunity
 </p>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-green-400"></div>
 <span className="text-titanium-600">Low</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-amber-400"></div>
 <span className="text-titanium-600">Medium</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-red-400"></div>
 <span className="text-titanium-600">High</span>
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
 background: `linear-gradient(135deg, ${getHeatIntensity(data.riskScore)}, rgba(248, 249, 250, 0.9))`,
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <MapPin className="w-4 h-4 text-titanium-700" />
 <span className="text-sm font-bold text-titanium-900">{data.zip}</span>
 </div>
 <div className="text-2xl font-bold text-titanium-900 mb-1">
 {toFixed(data.riskScore, 1)}
 </div>
 <div className="text-xs text-titanium-600">
 {data.patients} patients
 </div>
 <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getHeatColor(data.riskScore)}`}></div>
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
 <div className={`px-4 py-2 rounded-lg ${getHeatColor(selectedData.riskScore)} text-white font-bold`}>
 CHA₂DS₂-VASc: {toFixed(selectedData.riskScore, 1)}
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="p-3 bg-white rounded-lg">
 <div className="flex items-center gap-2 mb-1">
 <Users className="w-4 h-4 text-titanium-600" />
 <div className="text-xs text-titanium-600">AF Patients</div>
 </div>
 <div className="text-2xl font-bold text-titanium-900">
 {selectedData.patients}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">OAC Rate</div>
 <div className="text-2xl font-bold text-medical-amber-600">
 {selectedData.oacRate}%
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Opportunity</div>
 <div className="text-2xl font-bold text-medical-green-600">
 {formatCurrency(selectedData.opportunityRevenue)}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Stroke Rate</div>
 <div className="text-2xl font-bold text-medical-red-600">
 {selectedData.strokeRate}%
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Highest Risk ZIP</div>
 <div className="text-xl font-bold text-medical-red-600">
 {zipData.sort((a, b) => b.riskScore - a.riskScore)[0].zip}
 </div>
 <div className="text-sm text-titanium-600">
 CHA₂DS₂-VASc: {toFixed(zipData.sort((a, b) => b.riskScore - a.riskScore)[0].riskScore, 1)}
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
 <div className="text-xs text-titanium-600 mb-1">Total AF Patients</div>
 <div className="text-xl font-bold text-porsche-600">
 {zipData.reduce((sum, z) => sum + z.patients, 0).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Across {zipData.length} ZIP codes</div>
 </div>
 </div>
 </div>
  );
};

export default EPGeographicHeatMap;