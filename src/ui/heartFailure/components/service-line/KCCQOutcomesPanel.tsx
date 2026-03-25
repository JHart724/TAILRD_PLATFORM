import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, AlertTriangle, Activity, Zap } from 'lucide-react';

// ============================================================
// KCCQ OUTCOMES PANEL
// Kansas City Cardiomyopathy Questionnaire — Heart Failure PRO Tracking
// ============================================================

const domainData = [
  { domain: 'Physical Limitation', score: 41.2 },
  { domain: 'Symptom Frequency', score: 44.8 },
  { domain: 'Quality of Life', score: 38.6 },
  { domain: 'Social Limitation', score: 43.1 },
  { domain: 'Overall Summary', score: 47.3 },
];

const KCCQOutcomesPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="metal-card p-6">
        <div className="flex items-start gap-3 mb-1">
          <Activity className="w-6 h-6 text-medical-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">KCCQ Outcomes Tracking</h3>
            <p className="text-sm text-titanium-500 mt-0.5">
              Kansas City Cardiomyopathy Questionnaire — validated patient-reported outcome,
              Dr. John Spertus (UMKC)
            </p>
            <div className="flex items-center gap-2 mt-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-600 font-medium">Auto-calculated from EHR data &middot; No manual entry required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-titanium-500" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Mean KCCQ Overall Score
            </span>
          </div>
          <div className="text-3xl font-bold text-titanium-900">47.3</div>
          <div className="text-xs text-titanium-500 mt-1">Population average — below intervention threshold</div>
        </div>

        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Mean Change — Actioned Patients
            </span>
          </div>
          <div className="text-3xl font-bold text-green-700">+14.2 pts</div>
          <div className="text-xs text-titanium-500 mt-1">at 90 days post-intervention</div>
        </div>

        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-titanium-500" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Patients Below Threshold (&lt;60)
            </span>
          </div>
          <div className="text-3xl font-bold text-titanium-900">312</div>
          <div className="text-xs text-titanium-500 mt-1">patients — intervention recommended</div>
        </div>

        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Patients Showing Decline
            </span>
          </div>
          <div className="text-3xl font-bold text-red-700">48</div>
          <div className="text-xs text-titanium-500 mt-1">patients — KCCQ declined &ge;5 pts</div>
        </div>
      </div>

      {/* Domain Bar Chart */}
      <div className="metal-card p-6">
        <h4 className="font-semibold text-titanium-800 mb-1">KCCQ Domain Scores — Population Mean</h4>
        <p className="text-xs text-titanium-500 mb-4">
          Scores 0–100 | Dashed blue line = Intervention Threshold (60) | Dashed orange line = Severe
          Impairment (45)
        </p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={domainData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="domain"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${value ?? ''}`, 'KCCQ Score']}
              />
              <ReferenceLine
                y={60}
                stroke="#3b82f6"
                strokeDasharray="6 3"
                label={{ value: 'Intervention Threshold', position: 'right', fontSize: 10, fill: '#3b82f6' }}
              />
              <ReferenceLine
                y={45}
                stroke="#f97316"
                strokeDasharray="6 3"
                label={{ value: 'Severe Impairment', position: 'right', fontSize: 10, fill: '#f97316' }}
              />
              <Bar
                dataKey="score"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default KCCQOutcomesPanel;
