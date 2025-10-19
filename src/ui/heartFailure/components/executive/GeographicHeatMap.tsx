import React, { useState } from 'react';
import { MapPin, TrendingUp, Users } from 'lucide-react';

interface ZipCodeData {
  zip: string;
  patients: number;
  riskScore: number;
  gdmtRate: number;
  opportunityRevenue: number;
  readmissionRate: number;
}

const GeographicHeatMap: React.FC = () => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // Mock ZIP code data - will be replaced with real API data
  const zipData: ZipCodeData[] = [
    { zip: '60601', patients: 187, riskScore: 8.2, gdmtRate: 34, opportunityRevenue: 2800000, readmissionRate: 18.5 },
    { zip: '60602', patients: 142, riskScore: 7.1, gdmtRate: 41, opportunityRevenue: 1900000, readmissionRate: 15.2 },
    { zip: '60611', patients: 203, riskScore: 9.1, gdmtRate: 28, opportunityRevenue: 3600000, readmissionRate: 21.3 },
    { zip: '60614', patients: 156, riskScore: 6.4, gdmtRate: 47, opportunityRevenue: 1400000, readmissionRate: 12.8 },
    { zip: '60622', patients: 178, riskScore: 8.7, gdmtRate: 31, opportunityRevenue: 2900000, readmissionRate: 19.7 },
    { zip: '60647', patients: 134, riskScore: 7.8, gdmtRate: 38, opportunityRevenue: 2100000, readmissionRate: 16.4 },
    { zip: '60657', patients: 119, riskScore: 5.9, gdmtRate: 52, opportunityRevenue: 980000, readmissionRate: 10.1 },
    { zip: '60804', patients: 167, riskScore: 8.9, gdmtRate: 29, opportunityRevenue: 3200000, readmissionRate: 20.2 },
  ];

  const getHeatColor = (riskScore: number) => {
    if (riskScore >= 8.5) return 'bg-medical-red-400';
    if (riskScore >= 7.0) return 'bg-medical-amber-400';
    if (riskScore >= 6.0) return 'bg-steel-400';
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
    <div className="retina-card p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Geographic Risk Heat Map
          </h2>
          <p className="text-steel-600">
            ZIP code analysis by risk score and opportunity
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-medical-green-400"></div>
            <span className="text-steel-600">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-medical-amber-400"></div>
            <span className="text-steel-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-medical-red-400"></div>
            <span className="text-steel-600">High</span>
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
                ? 'border-medical-blue-400 shadow-retina-3'
                : 'border-transparent hover:border-steel-300'
            }`}
            style={{
              background: `linear-gradient(135deg, ${getHeatIntensity(data.riskScore)}, rgba(248, 249, 250, 0.9))`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-steel-700" />
              <span className="text-sm font-bold text-steel-900">{data.zip}</span>
            </div>
            <div className="text-2xl font-bold text-steel-900 mb-1">
              {data.riskScore.toFixed(1)}
            </div>
            <div className="text-xs text-steel-600">
              {data.patients} patients
            </div>
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getHeatColor(data.riskScore)}`}></div>
          </button>
        ))}
      </div>

      {/* Selected ZIP Details */}
      {selectedData && (
        <div className="p-6 bg-medical-blue-50/50 rounded-xl border-2 border-medical-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-steel-600 mb-1">ZIP Code</div>
              <div className="text-3xl font-bold text-steel-900 font-sf">
                {selectedData.zip}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg ${getHeatColor(selectedData.riskScore)} text-white font-bold`}>
              Risk: {selectedData.riskScore.toFixed(1)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-steel-600" />
                <div className="text-xs text-steel-600">Patients</div>
              </div>
              <div className="text-2xl font-bold text-steel-900">
                {selectedData.patients}
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <div className="text-xs text-steel-600 mb-1">GDMT Rate</div>
              <div className="text-2xl font-bold text-medical-amber-600">
                {selectedData.gdmtRate}%
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <div className="text-xs text-steel-600 mb-1">Opportunity</div>
              <div className="text-2xl font-bold text-medical-green-600">
                {formatCurrency(selectedData.opportunityRevenue)}
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <div className="text-xs text-steel-600 mb-1">Readmit Rate</div>
              <div className="text-2xl font-bold text-medical-red-600">
                {selectedData.readmissionRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-steel-200">
        <div>
          <div className="text-xs text-steel-600 mb-1">Highest Risk ZIP</div>
          <div className="text-xl font-bold text-medical-red-600">
            {zipData.sort((a, b) => b.riskScore - a.riskScore)[0].zip}
          </div>
          <div className="text-sm text-steel-600">
            Risk Score: {zipData.sort((a, b) => b.riskScore - a.riskScore)[0].riskScore.toFixed(1)}
          </div>
        </div>

        <div>
          <div className="text-xs text-steel-600 mb-1">Largest Opportunity</div>
          <div className="text-xl font-bold text-steel-700">
            {zipData.sort((a, b) => b.opportunityRevenue - a.opportunityRevenue)[0].zip}
          </div>
          <div className="text-sm text-steel-600">
            {formatCurrency(zipData.sort((a, b) => b.opportunityRevenue - a.opportunityRevenue)[0].opportunityRevenue)}
          </div>
        </div>

        <div>
          <div className="text-xs text-steel-600 mb-1">Total Patients</div>
          <div className="text-xl font-bold text-medical-blue-600">
            {zipData.reduce((sum, z) => sum + z.patients, 0).toLocaleString()}
          </div>
          <div className="text-sm text-steel-600">Across {zipData.length} ZIP codes</div>
        </div>
      </div>
    </div>
  );
};

export default GeographicHeatMap;