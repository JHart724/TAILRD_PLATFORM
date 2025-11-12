import React, { useState } from 'react';
import { X, Users, Heart, AlertTriangle } from 'lucide-react';

interface ZIPData {
  zip: string;
  name: string;
  coordinates: [number, number][];
  patients: number;
  riskScore: number;
  admissions: number;
  gdmtRate: number;
}

const zipData: ZIPData[] = [
  {
    zip: '10001',
    name: 'Chelsea/Flatiron',
    coordinates: [
      [40.7505, -73.9934],
      [40.7489, -73.9856],
      [40.7439, -73.9876],
      [40.7455, -73.9954]
    ],
    patients: 234,
    riskScore: 7.2,
    admissions: 28,
    gdmtRate: 68
  },
  {
    zip: '10003',
    name: 'East Village',
    coordinates: [
      [40.7328, -73.9903],
      [40.7328, -73.9825],
      [40.7278, -73.9825],
      [40.7278, -73.9903]
    ],
    patients: 198,
    riskScore: 8.5,
    admissions: 35,
    gdmtRate: 52
  },
  {
    zip: '10021',
    name: 'Upper East Side',
    coordinates: [
      [40.7736, -73.9566],
      [40.7736, -73.9488],
      [40.7686, -73.9488],
      [40.7686, -73.9566]
    ],
    patients: 312,
    riskScore: 6.1,
    admissions: 18,
    gdmtRate: 78
  },
  {
    zip: '10025',
    name: 'Upper West Side',
    coordinates: [
      [40.7936, -73.9736],
      [40.7936, -73.9658],
      [40.7886, -73.9658],
      [40.7886, -73.9736]
    ],
    patients: 287,
    riskScore: 5.8,
    admissions: 22,
    gdmtRate: 82
  },
  {
    zip: '10029',
    name: 'East Harlem',
    coordinates: [
      [40.7936, -73.9436],
      [40.7936, -73.9358],
      [40.7886, -73.9358],
      [40.7886, -73.9436]
    ],
    patients: 456,
    riskScore: 9.3,
    admissions: 67,
    gdmtRate: 41
  },
  {
    zip: '10035',
    name: 'East Harlem South',
    coordinates: [
      [40.7886, -73.9436],
      [40.7886, -73.9358],
      [40.7836, -73.9358],
      [40.7836, -73.9436]
    ],
    patients: 398,
    riskScore: 8.9,
    admissions: 58,
    gdmtRate: 45
  },
  {
    zip: '10128',
    name: 'Carnegie Hill',
    coordinates: [
      [40.7836, -73.9566],
      [40.7836, -73.9488],
      [40.7786, -73.9488],
      [40.7786, -73.9566]
    ],
    patients: 167,
    riskScore: 5.2,
    admissions: 12,
    gdmtRate: 85
  },
  {
    zip: '10065',
    name: 'Upper East Side East',
    coordinates: [
      [40.7686, -73.9566],
      [40.7686, -73.9488],
      [40.7636, -73.9488],
      [40.7636, -73.9566]
    ],
    patients: 223,
    riskScore: 6.8,
    admissions: 25,
    gdmtRate: 71
  }
];

const getRiskColor = (riskScore: number) => {
  if (riskScore >= 8.5) return '#dc2626'; // red-600
  if (riskScore >= 7.0) return '#ea580c'; // orange-600
  if (riskScore >= 6.0) return '#d97706'; // amber-600
  if (riskScore >= 5.0) return '#65a30d'; // lime-600
  return '#16a34a'; // green-600
};

const getRiskLabel = (riskScore: number) => {
  if (riskScore >= 8.5) return 'Very High Risk';
  if (riskScore >= 7.0) return 'High Risk';
  if (riskScore >= 6.0) return 'Moderate Risk';
  if (riskScore >= 5.0) return 'Low Risk';
  return 'Very Low Risk';
};

export const HFGeographicHeatMap: React.FC = () => {
  const [selectedZIP, setSelectedZIP] = useState<ZIPData | null>(null);
  const [hoveredZIP, setHoveredZIP] = useState<ZIPData | null>(null);

  return (
    <>
      <div className="relative">
        <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-100">
          <svg width="100%" height="100%" viewBox="0 0 800 600" className="w-full h-full">
            {/* NYC Map Background */}
            <rect width="800" height="600" fill="#f0f9ff" />
            
            {/* Simplified NYC Borough Shapes */}
            <g>
              {/* Manhattan simplified */}
              <polygon 
                points="300,150 320,150 330,200 340,250 345,300 340,350 330,400 320,450 300,480 280,450 270,400 265,350 270,300 275,250 285,200 295,150"
                fill="#e0f2fe" 
                stroke="#0284c7" 
                strokeWidth="1"
              />
              
              {/* Brooklyn simplified */}
              <polygon 
                points="340,350 360,360 400,380 450,400 480,420 470,450 440,470 400,480 360,470 340,450"
                fill="#f0f9ff" 
                stroke="#0284c7" 
                strokeWidth="1"
              />
              
              {/* Queens simplified */}
              <polygon 
                points="360,200 400,210 450,230 480,250 500,280 490,320 460,340 420,350 380,340 360,320"
                fill="#f0f9ff" 
                stroke="#0284c7" 
                strokeWidth="1"
              />
            </g>
            
            {/* ZIP Code Areas */}
            {zipData.map((zip, index) => {
              const baseX = 280 + (index % 3) * 60;
              const baseY = 180 + Math.floor(index / 3) * 80;
              
              return (
                <g key={zip.zip}>
                  <polygon
                    points={`${baseX},${baseY} ${baseX + 50},${baseY} ${baseX + 55},${baseY + 60} ${baseX + 5},${baseY + 65}`}
                    fill={getRiskColor(zip.riskScore)}
                    fillOpacity="0.8"
                    stroke={getRiskColor(zip.riskScore)}
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:opacity-90"
                    onClick={() => setSelectedZIP(zip)}
                    onMouseEnter={() => setHoveredZIP(zip)}
                    onMouseLeave={() => setHoveredZIP(null)}
                  />
                  
                  {/* ZIP Code Label */}
                  <text 
                    x={baseX + 25} 
                    y={baseY + 30} 
                    textAnchor="middle" 
                    className="text-xs font-semibold fill-white pointer-events-none"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {zip.zip}
                  </text>
                  
                  {/* Patient Count */}
                  <text 
                    x={baseX + 25} 
                    y={baseY + 45} 
                    textAnchor="middle" 
                    className="text-xs fill-white pointer-events-none"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {zip.patients} pts
                  </text>
                </g>
              );
            })}
            
            {/* Title */}
            <text x="400" y="30" textAnchor="middle" className="text-lg font-bold fill-gray-700">
              NYC Heart Failure Patient Distribution
            </text>
          </svg>
        </div>

        {/* Hover overlay */}
        {hoveredZIP && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-[1000]">
            <div className="text-lg font-semibold text-gray-900">
              {hoveredZIP.name}
            </div>
            <div className="text-sm text-gray-600">
              ZIP: {hoveredZIP.zip}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Patients:</span>
                <span className="font-medium">{hoveredZIP.patients}</span>
              </div>
              <div className="flex justify-between">
                <span>Risk Score:</span>
                <span 
                  className="font-medium px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: getRiskColor(hoveredZIP.riskScore) }}
                >
                  {hoveredZIP.riskScore} - {getRiskLabel(hoveredZIP.riskScore)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>30-day Admits:</span>
                <span className="font-medium">{hoveredZIP.admissions}</span>
              </div>
              <div className="flex justify-between">
                <span>GDMT Rate:</span>
                <span className="font-medium">{hoveredZIP.gdmtRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Risk Score:</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16a34a' }}></div>
              <span className="text-xs text-gray-600">Low (5.0-5.9)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#65a30d' }}></div>
              <span className="text-xs text-gray-600">Moderate (6.0-6.9)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d97706' }}></div>
              <span className="text-xs text-gray-600">High (7.0-8.4)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
              <span className="text-xs text-gray-600">Very High (8.5+)</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Total Patients: {zipData.reduce((sum, zip) => sum + zip.patients, 0)}
        </div>
      </div>

      {/* Modal */}
      {selectedZIP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedZIP.name}
                </h2>
                <p className="text-gray-600">ZIP Code: {selectedZIP.zip}</p>
              </div>
              <button
                onClick={() => setSelectedZIP(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Total Patients</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{selectedZIP.patients}</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800">30-Day Admissions</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{selectedZIP.admissions}</div>
                <div className="text-xs text-red-600 mt-1">
                  {((selectedZIP.admissions / selectedZIP.patients) * 100).toFixed(1)}% of patients
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center mb-2">
                  <Heart className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">GDMT Optimized</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{selectedZIP.gdmtRate}%</div>
                <div className="text-xs text-green-600 mt-1">
                  {Math.round((selectedZIP.gdmtRate / 100) * selectedZIP.patients)} patients
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                <span 
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: getRiskColor(selectedZIP.riskScore) }}
                >
                  {getRiskLabel(selectedZIP.riskScore)}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {selectedZIP.riskScore} / 10
              </div>
              <p className="text-sm text-gray-600">
                Composite risk score based on patient acuity, social determinants, 
                readmission history, and medication adherence.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Patient Population Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600">High-Risk Patients</div>
                  <div className="text-xl font-bold text-red-600">
                    {Math.round(selectedZIP.patients * 0.23)}
                  </div>
                  <div className="text-xs text-gray-500">23% of population</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Device Candidates</div>
                  <div className="text-xl font-bold text-purple-600">
                    {Math.round(selectedZIP.patients * 0.12)}
                  </div>
                  <div className="text-xs text-gray-500">12% eligible</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Medication Gaps</div>
                  <div className="text-xl font-bold text-orange-600">
                    {Math.round(selectedZIP.patients * ((100 - selectedZIP.gdmtRate) / 100))}
                  </div>
                  <div className="text-xs text-gray-500">Sub-optimal GDMT</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Revenue Opportunity</div>
                  <div className="text-xl font-bold text-green-600">
                    ${(selectedZIP.patients * 2.8).toLocaleString()}K
                  </div>
                  <div className="text-xs text-gray-500">Annual potential</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Click on other ZIP codes on the map to compare populations and identify 
                intervention opportunities across different neighborhoods.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};