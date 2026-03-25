import React from 'react';
import { FileText, Beaker, TrendingUp, Clock, CheckCircle, Users, FlaskConical, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// ── Inline Data ──────────────────────────────────────────────────────────────

const registryKPIs = [
  { label: 'Cases Auto-Populated This Month', value: '159', icon: FileText, color: 'border-l-[#2E3440]' },
  { label: 'Average Auto-Fill Rate', value: '80%', icon: TrendingUp, color: 'border-l-emerald-500' },
  { label: 'Abstraction Hours Saved', value: '212', icon: Clock, color: 'border-l-blue-500' },
  { label: 'Submission-Ready Cases', value: '117', icon: CheckCircle, color: 'border-l-amber-500' },
];

const registries = [
  {
    name: 'CathPCI',
    casesPerMonth: 52,
    autoFillRate: 85,
    pending: 8,
    submitted: 44,
    targetLow: 80,
    targetHigh: 95,
    color: '#2E3440',
  },
  {
    name: 'TVT',
    casesPerMonth: 31,
    autoFillRate: 78,
    pending: 6,
    submitted: 25,
    targetLow: 75,
    targetHigh: 90,
    color: '#4C566A',
  },
  {
    name: 'ICD Registry',
    casesPerMonth: 44,
    autoFillRate: 82,
    pending: 9,
    submitted: 35,
    targetLow: 78,
    targetHigh: 92,
    color: '#5E81AC',
  },
  {
    name: 'GWTG-HF',
    casesPerMonth: 32,
    autoFillRate: 74,
    pending: 11,
    submitted: 21,
    targetLow: 72,
    targetHigh: 88,
    color: '#81A1C1',
  },
];

const chartData = registries.map((r) => ({
  name: r.name,
  autoFillRate: r.autoFillRate,
  targetLow: r.targetLow,
  targetHigh: r.targetHigh,
}));

const trialKPIs = [
  { label: 'Patients Screened', value: '284', icon: Users, color: 'border-l-[#2E3440]' },
  { label: 'Eligible Identified', value: '156', icon: CheckCircle, color: 'border-l-emerald-500' },
  { label: 'Active Trials', value: '14', icon: FlaskConical, color: 'border-l-blue-500' },
  { label: 'Industry-Sponsored', value: '9', icon: AlertTriangle, color: 'border-l-amber-500' },
];

const trials = [
  { name: 'HELIOS-B Extension', sponsor: 'Alnylam', type: 'Industry' as const, eligible: 127, phase: 'Phase 3', status: 'Enrolling' },
  { name: 'OCEAN(a) - Olpasiran', sponsor: 'Amgen', type: 'Industry' as const, eligible: 312, phase: 'Phase 3', status: 'Enrolling' },
  { name: 'ORION-4 - Inclisiran', sponsor: 'Novartis', type: 'Industry' as const, eligible: 234, phase: 'Phase 3', status: 'Enrolling' },
  { name: 'HEART-FID', sponsor: 'AHA/NIH', type: 'Investigator' as const, eligible: 287, phase: 'Phase 3', status: 'Enrolling' },
  { name: 'GUIDE-HF 2', sponsor: 'Abbott', type: 'Industry' as const, eligible: 253, phase: 'Phase 4', status: 'Enrolling' },
];

// ── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-titanium-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-titanium-800 mb-1">{label}</p>
      <p className="text-titanium-600">Auto-Fill Rate: <span className="font-medium text-titanium-800">{d.autoFillRate}%</span></p>
      <p className="text-titanium-600">Target Range: <span className="font-medium text-titanium-800">{d.targetLow}% - {d.targetHigh}%</span></p>
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

const ResearchExecutiveView: React.FC = () => {
  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* ── Page Heading ─────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-titanium-900 flex items-center gap-2">
          <FlaskConical className="w-7 h-7 text-[#2E3440]" />
          Research Performance Dashboard
        </h1>
        <p className="text-titanium-500 mt-1">Registry automation and trial eligibility at a glance</p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 - Registry Performance
         ══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-titanium-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#2E3440]" />
          Registry Automation
        </h2>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {registryKPIs.map((kpi) => (
            <div
              key={kpi.label}
              className={`metal-card bg-white border border-titanium-200 rounded-2xl p-4 border-l-4 ${kpi.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4 text-titanium-400" />
                <span className="text-xs font-medium text-titanium-500 uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-titanium-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Registry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {registries.map((reg) => {
            const pct = Math.min(reg.autoFillRate, 100);
            const inTarget = reg.autoFillRate >= reg.targetLow && reg.autoFillRate <= reg.targetHigh;
            const aboveTarget = reg.autoFillRate > reg.targetHigh;

            return (
              <div
                key={reg.name}
                className="metal-card bg-white border border-titanium-200 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-titanium-800">{reg.name}</h3>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      aboveTarget
                        ? 'bg-emerald-100 text-emerald-700'
                        : inTarget
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {aboveTarget ? 'Above Target' : inTarget ? 'On Target' : 'Below Target'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-titanium-600">
                  <div className="flex justify-between">
                    <span>Cases / Month</span>
                    <span className="font-medium text-titanium-800">{reg.casesPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-Fill Rate</span>
                    <span className="font-medium text-titanium-800">{reg.autoFillRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium text-titanium-800">{reg.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitted</span>
                    <span className="font-medium text-titanium-800">{reg.submitted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Range</span>
                    <span className="font-medium text-titanium-800">{reg.targetLow}% - {reg.targetHigh}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-titanium-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: reg.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-Fill Rate Chart */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-titanium-700 mb-4">Auto-Fill Rate vs Target Range</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4C566A' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#4C566A' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="autoFillRate" fill="#2E3440" radius={[6, 6, 0, 0]} />
                {/* Reference lines for each registry target range */}
                {registries.map((r) => (
                  <React.Fragment key={r.name}>
                    <ReferenceLine y={r.targetLow} stroke="#A3BE8C" strokeDasharray="4 4" strokeWidth={1.5} />
                    <ReferenceLine y={r.targetHigh} stroke="#A3BE8C" strokeDasharray="4 4" strokeWidth={1.5} />
                  </React.Fragment>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 - Trial Eligibility
         ══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-titanium-800 mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-[#2E3440]" />
          Trial Eligibility Screening
        </h2>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {trialKPIs.map((kpi) => (
            <div
              key={kpi.label}
              className={`metal-card bg-white border border-titanium-200 rounded-2xl p-4 border-l-4 ${kpi.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4 text-titanium-400" />
                <span className="text-xs font-medium text-titanium-500 uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-titanium-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Top 5 Trials Table */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-titanium-700 mb-4">Top 5 Active Trials</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-titanium-200">
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Trial</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Sponsor</th>
                  <th className="text-right py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Eligible Patients</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Phase</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((trial) => (
                  <tr key={trial.name} className="border-b border-titanium-100 hover:bg-titanium-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-titanium-800">{trial.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-titanium-700">{trial.sponsor}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            trial.type === 'Industry'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {trial.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-titanium-800">{trial.eligible.toLocaleString()}</td>
                    <td className="py-3 px-4 text-titanium-600">{trial.phase}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {trial.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclosure Note */}
        <div className="flex items-start gap-2 text-xs text-titanium-500 bg-titanium-50 border border-titanium-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <span>
            Industry-sponsored trials flagged. Eligibility screening is automated — enrollment decisions require PI review.
          </span>
        </div>
      </section>
    </div>
  );
};

export default ResearchExecutiveView;
