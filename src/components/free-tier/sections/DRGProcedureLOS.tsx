import React from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------- Inline data ----------

const drgVolumeData = [
  { name: 'DRG 291', volume: 1240, label: 'HF w MCC' },
  { name: 'DRG 292', volume: 890, label: 'HF w CC' },
  { name: 'DRG 247', volume: 680, label: 'PCI w/o MCC' },
  { name: 'DRG 246', volume: 420, label: 'PCI w MCC' },
  { name: 'DRG 273', volume: 340, label: 'Ablation' },
  { name: 'DRG 216', volume: 180, label: 'Valve w/o Cath' },
  { name: 'DRG 233', volume: 120, label: 'CABG w Cath' },
  { name: 'DRG 228', volume: 95, label: 'Cardiothoracic' },
];

const procedureData = [
  { name: 'Diagnostic Cath', count: 2840 },
  { name: 'PCI', count: 1100 },
  { name: 'Ablation', count: 680 },
  { name: 'Device Implant', count: 520 },
  { name: 'TAVR/SAVR', count: 340 },
  { name: 'CABG', count: 240 },
];

const losData = [
  { day: 1, facility: 5, national: 8 },
  { day: 2, facility: 15, national: 18 },
  { day: 3, facility: 28, national: 25 },
  { day: 4, facility: 22, national: 20 },
  { day: 5, facility: 15, national: 14 },
  { day: 6, facility: 8, national: 8 },
  { day: 7, facility: 4, national: 4 },
  { day: 8, facility: 2, national: 2 },
  { day: 9, facility: 1, national: 1 },
];

// ---------- Props ----------

interface DRGProcedureLOSProps {
  hasUploadedFiles: boolean;
}

// ---------- Component ----------

const DRGProcedureLOS: React.FC<DRGProcedureLOSProps> = ({ hasUploadedFiles }) => {
  return (
    <SectionCard
      title="DRG / Procedure / Length of Stay"
      subtitle={hasUploadedFiles ? 'Your Facility Data' : 'CMS National Estimates'}
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Column 1: DRG Volume ---- */}
        <div>
          <p className="text-sm font-body font-semibold text-titanium-700 mb-3">
            Top DRGs by Volume
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={drgVolumeData}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DDE6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10, fill: '#636D80', fontFamily: 'DM Sans' }}
                width={80}
              />
              <Tooltip
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }}
              />
              <Bar
                dataKey="volume"
                fill="#3D6F94"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Column 2: Procedure Mix ---- */}
        <div>
          <p className="text-sm font-body font-semibold text-titanium-700 mb-3">
            Procedure Mix by Category
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={procedureData}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DDE6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#636D80', fontFamily: 'DM Sans' }}
                width={80}
              />
              <Tooltip
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }}
              />
              <Bar
                dataKey="count"
                fill="#5A8AB0"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Column 3: LOS Distribution ---- */}
        <div>
          <p className="text-sm font-body font-semibold text-titanium-700 mb-3">
            Length of Stay Distribution
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={losData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D8DDE6" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
                label={{
                  value: 'Days',
                  position: 'bottom',
                  offset: -5,
                  style: { fontSize: 10, fill: '#8D96A8' },
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#636D80', fontFamily: 'IBM Plex Mono' }}
                label={{
                  value: '% of Patients',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: '#8D96A8' },
                }}
              />
              <Tooltip
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="facility"
                stroke="#3D6F94"
                strokeWidth={2}
                dot={{ fill: '#3D6F94', r: 3 }}
                name="Your Facility"
              />
              <Line
                type="monotone"
                dataKey="national"
                stroke="#B8C9D9"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="National Avg"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Custom legend */}
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: '#3D6F94' }}
              />
              <span className="text-xs font-body text-titanium-600">
                Your Facility
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="2" className="inline-block">
                <line
                  x1="0"
                  y1="1"
                  x2="16"
                  y2="1"
                  stroke="#B8C9D9"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="text-xs font-body text-titanium-600">
                National Avg
              </span>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default DRGProcedureLOS;
