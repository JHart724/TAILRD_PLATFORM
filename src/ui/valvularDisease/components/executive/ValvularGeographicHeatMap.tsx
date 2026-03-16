import React, { useState } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface ZipCodeData {
  zip: string;
  patients: number;
  severityScore: number;
  interventionRate: number;
  opportunityRevenue: number;
  mortalityRate: number;
}

const ValvularGeographicHeatMap: React.FC = () => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Mock ZIP code data - will be replaced with real API data
  const zipData: ZipCodeData[] = [
 { zip: '60601', patients: 178, severityScore: 7.8, interventionRate: 42, opportunityRevenue: 3800000, mortalityRate: 11.4 },
 { zip: '60602', patients: 134, severityScore: 6.2, interventionRate: 58, opportunityRevenue: 2600000, mortalityRate: 8.7 },
 { zip: '60611', patients: 234, severityScore: 8.9, interventionRate: 35, opportunityRevenue: 4900000, mortalityRate: 14.2 },
 { zip: '60614', patients: 98, severityScore: 5.1, interventionRate: 72, opportunityRevenue: 1900000, mortalityRate: 6.8 },
 { zip: '60622', patients: 156, severityScore: 8.4, interventionRate: 38, opportunityRevenue: 3400000, mortalityRate: 12.8 },
 { zip: '60647', patients: 145, severityScore: 6.8, interventionRate: 52, opportunityRevenue: 2800000, mortalityRate: 9.6 },
 { zip: '60657', patients: 89, severityScore: 4.6, interventionRate: 78, opportunityRevenue: 1600000, mortalityRate: 5.2 },
 { zip: '60804', patients: 189, severityScore: 8.6, interventionRate: 34, opportunityRevenue: 4200000, mortalityRate: 13.7 },
  ];

  const getHeatColor = (severityScore: number) => {
 if (severityScore >= 8.0) return 'bg-medical-red-400';
 if (severityScore >= 6.5) return 'bg-medical-amber-400';
 if (severityScore >= 5.0) return 'bg-titanium-400';
 return 'bg-medical-green-400';
  };

  const getHeatIntensity = (severityScore: number) => {
 const normalized = Math.min(severityScore / 10, 1);
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
 Valvular Disease Geographic Heat Map
 </h2>
 <p className="text-titanium-600">
 ZIP code analysis by valve disease severity and intervention opportunity
 </p>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-green-400"></div>
 <span className="text-titanium-600">Mild</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-amber-400"></div>
 <span className="text-titanium-600">Moderate</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-full bg-medical-red-400"></div>
 <span className="text-titanium-600">Severe</span>
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
 background: `linear-gradient(135deg, ${getHeatIntensity(data.severityScore)}, rgba(248, 249, 250, 0.9))`,
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <MapPin className="w-4 h-4 text-titanium-700" />
 <span className="text-sm font-bold text-titanium-900">{data.zip}</span>
 </div>
 <div className="text-2xl font-bold text-titanium-900 mb-1">
 {toFixed(data.severityScore, 1)}
 </div>
 <div className="text-xs text-titanium-600">
 {data.patients} patients
 </div>
 <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getHeatColor(data.severityScore)}`}></div>
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
 <div className={`px-4 py-2 rounded-lg ${getHeatColor(selectedData.severityScore)} text-white font-bold`}>
 Severity: {toFixed(selectedData.severityScore, 1)}
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="p-3 bg-white rounded-lg">
 <div className="flex items-center gap-2 mb-1">
 <Users className="w-4 h-4 text-titanium-600" />
 <div className="text-xs text-titanium-600">Valve Patients</div>
 </div>
 <div className="text-2xl font-bold text-titanium-900">
 {selectedData.patients}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Intervention Rate</div>
 <div className="text-2xl font-bold text-medical-amber-600">
 {selectedData.interventionRate}%
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Opportunity</div>
 <div className="text-2xl font-bold text-medical-green-600">
 {formatCurrency(selectedData.opportunityRevenue)}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Mortality Rate</div>
 <div className="text-2xl font-bold text-medical-red-600">
 {selectedData.mortalityRate}%
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Highest Severity ZIP</div>
 <div className="text-xl font-bold text-medical-red-600">
 {zipData.sort((a, b) => b.severityScore - a.severityScore)[0].zip}
 </div>
 <div className="text-sm text-titanium-600">
 Severity: {toFixed(zipData.sort((a, b) => b.severityScore - a.severityScore)[0].severityScore, 1)}
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
 <div className="text-xs text-titanium-600 mb-1">Total Valve Patients</div>
 <div className="text-xl font-bold text-porsche-600">
 {zipData.reduce((sum, z) => sum + z.patients, 0).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Across {zipData.length} ZIP codes</div>
 </div>
 </div>
 </div>
  );
};

export default ValvularGeographicHeatMap;