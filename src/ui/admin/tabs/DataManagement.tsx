import React from 'react';
import {
  Database,
  HardDrive,
  Calendar,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface HospitalDataStats {
  id: string;
  name: string;
  abbr: string;
  totalPatients: number;
  observations: number;
  gapFlags: number;
  storageUsedMB: number;
  lastUpload: string;
  dataQualityScore: number;
}

const HOSPITAL_DATA: HospitalDataStats[] = [
  {
    id: 'hs-001',
    name: 'Baylor Scott & White',
    abbr: 'BSW',
    totalPatients: 5280,
    observations: 42240,
    gapFlags: 52,
    storageUsedMB: 2840,
    lastUpload: '2026-03-22',
    dataQualityScore: 87,
  },
  {
    id: 'hs-002',
    name: 'Regional Medical Center',
    abbr: 'MSH',
    totalPatients: 3540,
    observations: 28320,
    gapFlags: 38,
    storageUsedMB: 1920,
    lastUpload: '2026-03-21',
    dataQualityScore: 72,
  },
  {
    id: 'hs-003',
    name: 'Mercy Health System',
    abbr: 'MH',
    totalPatients: 1840,
    observations: 11040,
    gapFlags: 14,
    storageUsedMB: 680,
    lastUpload: '2026-03-18',
    dataQualityScore: 45,
  },
];

interface FieldCompleteness {
  field: string;
  bsw: number;
  msh: number;
  mh: number;
}

const FIELD_COMPLETENESS: FieldCompleteness[] = [
  { field: 'LVEF Populated', bsw: 94, msh: 78, mh: 45 },
  { field: 'Medications', bsw: 91, msh: 65, mh: 38 },
  { field: 'Lab Results (BNP)', bsw: 88, msh: 71, mh: 42 },
  { field: 'Procedure Dates', bsw: 96, msh: 82, mh: 55 },
  { field: 'Device Serial Numbers', bsw: 82, msh: 58, mh: 22 },
  { field: 'Follow-up Scheduling', bsw: 78, msh: 61, mh: 35 },
];

const COMPLETENESS_CHART = FIELD_COMPLETENESS.map((f) => ({
  field: f.field,
  BSW: f.bsw,
  MSH: f.msh,
  MH: f.mh,
}));

interface Recommendation {
  hospital: string;
  field: string;
  currentRate: number;
  suggestion: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  { hospital: 'Mercy Health System', field: 'Device Serial Numbers', currentRate: 22, suggestion: 'Implement barcode scanning at device implant to auto-populate serial numbers.' },
  { hospital: 'Mercy Health System', field: 'Medications', currentRate: 38, suggestion: 'Enable EHR integration medication reconciliation feed from pharmacy system.' },
  { hospital: 'Mercy Health System', field: 'LVEF Populated', currentRate: 45, suggestion: 'Map echo lab DICOM structured reports to auto-extract LVEF values.' },
  { hospital: 'Regional Medical', field: 'Device Serial Numbers', currentRate: 58, suggestion: 'Cross-reference implant registry with device tracking module.' },
  { hospital: 'Regional Medical', field: 'Follow-up Scheduling', currentRate: 61, suggestion: 'Integrate follow-up appointment feed from scheduling system.' },
];

// ─── Quality Score Color ─────────────────────────────────────────────────────

function qualityColor(score: number): string {
  if (score >= 80) return '#4A6880';
  if (score >= 60) return '#6B7280';
  return '#7A1A2E';
}

function qualityBg(score: number): string {
  if (score >= 80) return 'bg-green-50 text-green-600';
  if (score >= 60) return 'bg-amber-50 text-amber-600';
  return 'bg-red-100 text-red-800';
}

// ─── Component ───────────────────────────────────────────────────────────────

const DataManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Per-Hospital Data Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {HOSPITAL_DATA.map((h) => (
          <div key={h.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">{h.name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${qualityBg(h.dataQualityScore)}`}>
                {h.dataQualityScore}% Quality
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Patients
                </div>
                <div className="font-semibold text-gray-900">{h.totalPatients.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Observations</div>
                <div className="font-semibold text-gray-900">{h.observations.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Gap Flags</div>
                <div className="font-semibold text-gray-900">{h.gapFlags}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Storage
                </div>
                <div className="font-semibold text-gray-900">
                  {h.storageUsedMB >= 1000
                    ? `${(h.storageUsedMB / 1000).toFixed(1)} GB`
                    : `${h.storageUsedMB} MB`}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              Last upload: {h.lastUpload}
            </div>

            {/* Quality bar */}
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${h.dataQualityScore}%`,
                    backgroundColor: qualityColor(h.dataQualityScore),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Field Completeness Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-red-600" />
          Data Field Completeness by Hospital
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={COMPLETENESS_CHART} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
            <YAxis dataKey="field" type="category" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="BSW" fill="#7A1A2E" barSize={12} radius={[0, 4, 4, 0]} />
            <Bar dataKey="MSH" fill="#2C4A60" barSize={12} radius={[0, 4, 4, 0]} />
            <Bar dataKey="MH" fill="#4A6880" barSize={12} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Field Completeness Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Field Completeness Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Field</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">BSW</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Regional Medical</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Mercy Health System</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_COMPLETENESS.map((f) => (
                <tr key={f.field} className="border-b border-gray-50">
                  <td className="py-3 text-sm text-gray-900">{f.field}</td>
                  {[f.bsw, f.msh, f.mh].map((val, i) => (
                    <td key={i} className="py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          val >= 80 ? 'text-teal-700' : val >= 60 ? 'text-gray-500' : 'text-red-600'
                        }`}
                      >
                        {val >= 80 ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {val}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-gray-500" />
          Improvement Recommendations
        </h3>
        <div className="space-y-3">
          {RECOMMENDATIONS.map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: qualityColor(rec.currentRate) + '20' }}
              >
                <span className="text-xs font-bold" style={{ color: qualityColor(rec.currentRate) }}>
                  {rec.currentRate}%
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {rec.hospital} - {rec.field}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{rec.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
