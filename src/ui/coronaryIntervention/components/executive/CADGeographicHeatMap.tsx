import React, { useState } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface ZipCodeData {
  zip: string;
  patients: number;
  riskScore: number;
  gdmtRate: number;
  opportunityRevenue: number;
  miRate: number;
}

const CADGeographicHeatMap: React.FC = () => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Mock ZIP code data - will be replaced with real API data
  const zipData: ZipCodeData[] = [
 { zip: '60601', patients: 234, riskScore: 7.8, gdmtRate: 42, opportunityRevenue: 3200000, miRate: 12.5 },
 { zip: '60602', patients: 189, riskScore: 6.4, gdmtRate: 58, opportunityRevenue: 2400000, miRate: 9.2 },
 { zip: '60611', patients: 298, riskScore: 8.9, gdmtRate: 38, opportunityRevenue: 4100000, miRate: 15.8 },
 { zip: '60614', patients: 167, riskScore: 5.6, gdmtRate: 67, opportunityRevenue: 1800000, miRate: 7.1 },
 { zip: '60622', patients: 245, riskScore: 8.2, gdmtRate: 44, opportunityRevenue: 3600000, miRate: 13.4 },
 { zip: '60647', patients: 201, riskScore: 7.1, gdmtRate: 52, opportunityRevenue: 2800000, miRate: 10.6 },
 { zip: '60657', patients: 134, riskScore: 4.8, gdmtRate: 72, opportunityRevenue: 1500000, miRate: 5.8 },
 { zip: '60804', patients: 278, riskScore: 8.6, gdmtRate: 40, opportunityRevenue: 3900000, miRate: 14.7 },
  ];

  const getHeatColor = (riskScore: number) => {
 if (riskScore >= 8.0) return 'bg-medical-red-400';
 if (riskScore >= 6.5) return 'bg-medical-amber-400';
 if (riskScore >= 5.0) return 'bg-titanium-400';
 return 'bg-medical-green-400';
  };

  const getHeatIntensity = (riskScore: number) => {
 const normalized = Math.min(riskScore / 10, 1);
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
 Coronary Care Geographic Heat Map
 </h2>
 <p className="text-titanium-600">
 ZIP code analysis by CAD risk and intervention opportunity
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
 CAD Risk: {toFixed(selectedData.riskScore, 1)}
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="p-3 bg-white rounded-lg">
 <div className="flex items-center gap-2 mb-1">
 <Users className="w-4 h-4 text-titanium-600" />
 <div className="text-xs text-titanium-600">CAD Patients</div>
 </div>
 <div className="text-2xl font-bold text-titanium-900">
 {selectedData.patients}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">GDMT Rate</div>
 <div className="text-2xl font-bold text-medical-amber-600">
 {selectedData.gdmtRate}%
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">Opportunity</div>
 <div className="text-2xl font-bold text-medical-green-600">
 {formatCurrency(selectedData.opportunityRevenue)}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg">
 <div className="text-xs text-titanium-600 mb-1">MI Rate</div>
 <div className="text-2xl font-bold text-medical-red-600">
 {selectedData.miRate}%
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
 CAD Risk: {toFixed(zipData.sort((a, b) => b.riskScore - a.riskScore)[0].riskScore, 1)}
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
 <div className="text-xs text-titanium-600 mb-1">Total CAD Patients</div>
 <div className="text-xl font-bold text-porsche-600">
 {zipData.reduce((sum, z) => sum + z.patients, 0).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Across {zipData.length} ZIP codes</div>
 </div>
 </div>
 </div>
  );
};

export default CADGeographicHeatMap;