import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ZipCodeData {
  zipCode: string;
  patientCount: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  conditionType: string;
}

interface ZipHeatMapProps {
  title: string;
  data: ZipCodeData[];
  onZipClick?: (zipCode: string) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

// Sample NYC ZIP code boundaries (simplified GeoJSON)
const nycZipGeoJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10001" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9897, 40.7505], [-73.9897, 40.7565], [-73.9837, 40.7565], 
          [-73.9837, 40.7505], [-73.9897, 40.7505]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10002" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9837, 40.7505], [-73.9837, 40.7565], [-73.9777, 40.7565],
          [-73.9777, 40.7505], [-73.9837, 40.7505]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10003" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9897, 40.7445], [-73.9897, 40.7505], [-73.9837, 40.7505],
          [-73.9837, 40.7445], [-73.9897, 40.7445]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10009" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9837, 40.7445], [-73.9837, 40.7505], [-73.9777, 40.7505],
          [-73.9777, 40.7445], [-73.9837, 40.7445]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10010" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9957, 40.7385], [-73.9957, 40.7445], [-73.9897, 40.7445],
          [-73.9897, 40.7385], [-73.9957, 40.7385]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10011" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-74.0017, 40.7385], [-74.0017, 40.7445], [-73.9957, 40.7445],
          [-73.9957, 40.7385], [-74.0017, 40.7385]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10012" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-74.0017, 40.7325], [-74.0017, 40.7385], [-73.9957, 40.7385],
          [-73.9957, 40.7325], [-74.0017, 40.7325]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10013" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-74.0077, 40.7265], [-74.0077, 40.7325], [-74.0017, 40.7325],
          [-74.0017, 40.7265], [-74.0077, 40.7265]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10014" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-74.0137, 40.7265], [-74.0137, 40.7325], [-74.0077, 40.7325],
          [-74.0077, 40.7265], [-74.0137, 40.7265]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10016" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9777, 40.7385], [-73.9777, 40.7445], [-73.9717, 40.7445],
          [-73.9717, 40.7385], [-73.9777, 40.7385]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10017" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9717, 40.7505], [-73.9717, 40.7565], [-73.9657, 40.7565],
          [-73.9657, 40.7505], [-73.9717, 40.7505]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10018" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9957, 40.7505], [-73.9957, 40.7565], [-73.9897, 40.7565],
          [-73.9897, 40.7505], [-73.9957, 40.7505]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10019" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9957, 40.7625], [-73.9957, 40.7685], [-73.9897, 40.7685],
          [-73.9897, 40.7625], [-73.9957, 40.7625]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10021" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9597, 40.7685], [-73.9597, 40.7745], [-73.9537, 40.7745],
          [-73.9537, 40.7685], [-73.9597, 40.7685]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10022" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9657, 40.7565], [-73.9657, 40.7625], [-73.9597, 40.7625],
          [-73.9597, 40.7565], [-73.9657, 40.7565]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10023" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9837, 40.7745], [-73.9837, 40.7805], [-73.9777, 40.7805],
          [-73.9777, 40.7745], [-73.9837, 40.7745]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10024" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9837, 40.7805], [-73.9837, 40.7865], [-73.9777, 40.7865],
          [-73.9777, 40.7805], [-73.9837, 40.7805]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10025" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9717, 40.7925], [-73.9717, 40.7985], [-73.9657, 40.7985],
          [-73.9657, 40.7925], [-73.9717, 40.7925]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10026" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9537, 40.7985], [-73.9537, 40.8045], [-73.9477, 40.8045],
          [-73.9477, 40.7985], [-73.9537, 40.7985]
        ]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ZIPCODE: "10027" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-73.9597, 40.8045], [-73.9597, 40.8105], [-73.9537, 40.8105],
          [-73.9537, 40.8045], [-73.9597, 40.8045]
        ]]
      }
    }
  ]
};

const ZipHeatMap: React.FC<ZipHeatMapProps> = ({
  title,
  data,
  onZipClick,
  centerLat = 40.7589,
  centerLng = -73.9851,
  zoom = 12
}) => {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  const getZipData = (zipCode: string): ZipCodeData | undefined => {
    return data.find(item => item.zipCode === zipCode);
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'Low': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'High': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getOpacity = (riskLevel: string): number => {
    switch (riskLevel) {
      case 'High': return 0.8;
      case 'Medium': return 0.6;
      case 'Low': return 0.4;
      default: return 0.2;
    }
  };

  const styleFeature = (feature: any) => {
    const zipCode = feature.properties.ZIPCODE;
    const zipData = getZipData(zipCode);
    
    if (!zipData) {
      return {
        fillColor: '#9CA3AF',
        weight: 1,
        opacity: 1,
        color: '#6B7280',
        fillOpacity: 0.1
      };
    }

    return {
      fillColor: getRiskColor(zipData.riskLevel),
      weight: selectedZip === zipCode ? 3 : 1,
      opacity: 1,
      color: selectedZip === zipCode ? '#1F2937' : '#6B7280',
      fillOpacity: getOpacity(zipData.riskLevel)
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const zipCode = feature.properties.ZIPCODE;
    const zipData = getZipData(zipCode);

    layer.on({
      mouseover: () => {
        setSelectedZip(zipCode);
        layer.setStyle({
          weight: 3,
          color: '#1F2937'
        });
      },
      mouseout: () => {
        setSelectedZip(null);
        layer.setStyle({
          weight: 1,
          color: '#6B7280'
        });
      },
      click: () => {
        if (onZipClick) {
          onZipClick(zipCode);
        }
      }
    });

    if (zipData) {
      layer.bindTooltip(
        `<div class="p-2">
          <div class="font-semibold text-gray-800">ZIP ${zipCode}</div>
          <div class="text-sm text-gray-600 mt-1">
            Patients: <span class="font-medium">${zipData.patientCount}</span>
          </div>
          <div class="text-sm text-gray-600">
            Risk Score: <span class="font-medium">${zipData.riskScore.toFixed(1)}</span>
          </div>
          <div class="text-sm mt-1">
            <span class="px-2 py-1 rounded text-xs font-medium" 
                  style="background-color: ${getRiskColor(zipData.riskLevel)}20; color: ${getRiskColor(zipData.riskLevel)}">
              ${zipData.riskLevel} Risk
            </span>
          </div>
        </div>`,
        { 
          permanent: false,
          sticky: true,
          className: 'custom-tooltip'
        }
      );
    }
  };

  const getRiskCounts = () => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    data.forEach(item => {
      counts[item.riskLevel]++;
    });
    return counts;
  };

  const riskCounts = getRiskCounts();
  const totalPatients = data.reduce((sum, item) => sum + item.patientCount, 0);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
          <div>Total Patients: <span className="font-medium">{totalPatients}</span></div>
          <div>ZIP Codes: <span className="font-medium">{data.length}</span></div>
        </div>
      </div>

      <div className="relative">
        <div style={{ height: '400px', width: '100%' }}>
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={zoom}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={nycZipGeoJSON}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>

        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="font-semibold text-gray-800 mb-3">Risk Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: getRiskColor('Low') }}
                ></div>
                <span className="text-sm text-gray-700">Low Risk</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{riskCounts.Low}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: getRiskColor('Medium') }}
                ></div>
                <span className="text-sm text-gray-700">Medium Risk</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{riskCounts.Medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: getRiskColor('High') }}
                ></div>
                <span className="text-sm text-gray-700">High Risk</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{riskCounts.High}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            Hover over ZIP codes for details
            {onZipClick && <div>Click to view patient list</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZipHeatMap;