import React, { useState } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  DollarSign,
  Gauge,
  Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModuleToggle {
  key: string;
  label: string;
  enabled: boolean;
}

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface HospitalBilling {
  id: string;
  name: string;
  tier: string;
  contractStart: string;
  contractEnd: string;
  mrr: number;
}

interface HospitalRateLimit {
  id: string;
  name: string;
  requestsPerMinute: number;
  uploadsPerDay: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const HOSPITALS = [
  { id: 'hs-001', name: 'Baylor Scott & White' },
  { id: 'hs-002', name: 'Regional Medical' },
  { id: 'hs-003', name: 'Mercy Health System' },
];

const DEFAULT_MODULES: ModuleToggle[] = [
  { key: 'hf', label: 'Heart Failure', enabled: true },
  { key: 'ep', label: 'Electrophysiology', enabled: true },
  { key: 'sh', label: 'Structural Heart', enabled: true },
  { key: 'cad', label: 'Coronary Intervention', enabled: true },
  { key: 'pv', label: 'Peripheral Vascular', enabled: true },
  { key: 'vd', label: 'Valvular Disease', enabled: true },
  { key: 'research', label: 'Clinical Research', enabled: false },
];

const HOSPITAL_MODULE_STATE: Record<string, ModuleToggle[]> = {
  'hs-001': DEFAULT_MODULES.map((m) => ({ ...m, enabled: true })),
  'hs-002': DEFAULT_MODULES.map((m) => ({ ...m, enabled: true })),
  'hs-003': DEFAULT_MODULES.map((m) => ({
    ...m,
    enabled: ['hf', 'cad', 'sh'].includes(m.key),
  })),
};

const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'demo_mode', label: 'Demo Mode', description: 'Enable demo data for presentations', enabled: false },
  { key: 'clinical_trials', label: 'ClinicalTrials.gov Integration', description: 'Show matching clinical trials in patient views', enabled: true },
  { key: 'registry_assist', label: 'Registry Assist', description: 'Automated STS/ACC registry data preparation', enabled: true },
  { key: 'predictive_layer', label: 'Predictive Analytics Layer', description: 'ML-based risk prediction and gap forecasting', enabled: false },
  { key: 'mfa_enforcement', label: 'MFA Enforcement', description: 'Require MFA for all users platform-wide', enabled: true },
];

const BILLING_DATA: HospitalBilling[] = [
  { id: 'hs-001', name: 'Baylor Scott & White', tier: 'Enterprise', contractStart: '2025-06-01', contractEnd: '2026-05-31', mrr: 42000 },
  { id: 'hs-002', name: 'Regional Medical', tier: 'Standard', contractStart: '2025-09-15', contractEnd: '2026-09-14', mrr: 28000 },
  { id: 'hs-003', name: 'Mercy Health System', tier: 'Trial', contractStart: '2026-03-08', contractEnd: '2026-04-07', mrr: 0 },
];

const RATE_LIMITS: HospitalRateLimit[] = [
  { id: 'hs-001', name: 'Baylor Scott & White', requestsPerMinute: 120, uploadsPerDay: 10 },
  { id: 'hs-002', name: 'Regional Medical', requestsPerMinute: 100, uploadsPerDay: 8 },
  { id: 'hs-003', name: 'Mercy Health System', requestsPerMinute: 60, uploadsPerDay: 3 },
];

// ─── Toggle Component ────────────────────────────────────────────────────────

const Toggle: React.FC<{ enabled: boolean; onChange: () => void; label: string }> = ({
  enabled,
  onChange,
  label,
}) => (
  <button
    onClick={onChange}
    className="flex items-center gap-2 group"
    aria-label={`Toggle ${label}`}
  >
    {enabled ? (
      <ToggleRight className="w-8 h-5 text-[#7A1A2E]" />
    ) : (
      <ToggleLeft className="w-8 h-5 text-gray-300 group-hover:text-gray-400" />
    )}
  </button>
);

// ─── Component ───────────────────────────────────────────────────────────────

const PlatformConfiguration: React.FC = () => {
  const [selectedHospital, setSelectedHospital] = useState('hs-001');
  const [modules, setModules] = useState(HOSPITAL_MODULE_STATE);
  const [features, setFeatures] = useState(FEATURE_FLAGS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceDate, setMaintenanceDate] = useState('');

  const toggleModule = (key: string) => {
    setModules((prev) => ({
      ...prev,
      [selectedHospital]: prev[selectedHospital].map((m) =>
        m.key === key ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  const toggleFeature = (key: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Module Toggles */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Module Toggles</h3>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Health System</label>
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
          >
            {HOSPITALS.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(modules[selectedHospital] || DEFAULT_MODULES).map((mod) => (
            <div
              key={mod.key}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50"
            >
              <span className="text-sm text-gray-700">{mod.label}</span>
              <Toggle enabled={mod.enabled} onChange={() => toggleModule(mod.key)} label={mod.label} />
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Feature Flags */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Feature Flags</h3>
        <div className="space-y-3">
          {features.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{flag.label}</div>
                <div className="text-xs text-gray-500">{flag.description}</div>
              </div>
              <Toggle enabled={flag.enabled} onChange={() => toggleFeature(flag.key)} label={flag.label} />
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Maintenance Mode */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Maintenance Mode
        </h3>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`
              relative inline-flex h-10 w-20 items-center rounded-full transition-colors
              ${maintenanceMode ? 'bg-red-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform
                ${maintenanceMode ? 'translate-x-11' : 'translate-x-1'}
              `}
            />
          </button>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {maintenanceMode ? 'MAINTENANCE MODE ACTIVE' : 'Platform is operational'}
            </div>
            <div className="text-xs text-gray-500">
              {maintenanceMode
                ? 'All non-admin users are blocked from accessing the platform'
                : 'Toggle to enable scheduled maintenance window'}
            </div>
          </div>
        </div>
        {maintenanceMode && (
          <div className="mt-4 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="datetime-local"
              value={maintenanceDate}
              onChange={(e) => setMaintenanceDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500">Scheduled end time</span>
          </div>
        )}
      </section>

      {/* Section 4: Rate Limiting */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-gray-500" />
          Rate Limiting
        </h3>
        <div className="space-y-3">
          {RATE_LIMITS.map((rl) => (
            <div key={rl.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
              <span className="text-sm font-medium text-gray-900">{rl.name}</span>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{rl.requestsPerMinute} req/min</span>
                <span className="text-gray-300">|</span>
                <span>{rl.uploadsPerDay} uploads/day</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Billing & Subscription */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-500" />
          Billing & Subscription
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Health System</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Contract Start</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Contract End</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">MRR</th>
              </tr>
            </thead>
            <tbody>
              {BILLING_DATA.map((b) => (
                <tr key={b.id} className="border-b border-gray-50">
                  <td className="py-3 text-sm font-medium text-gray-900">{b.name}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.tier === 'Enterprise'
                          ? 'bg-[#7A1A2E]/10 text-[#7A1A2E]'
                          : b.tier === 'Standard'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-[#F0F5FA] text-[#6B7280]'
                      }`}
                    >
                      {b.tier}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">{b.contractStart}</td>
                  <td className="py-3 text-sm text-gray-600">{b.contractEnd}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900 text-right">
                    {b.mrr > 0 ? `$${b.mrr.toLocaleString()}` : '$0 (Trial)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <div className="text-sm text-gray-500">
            Total MRR:{' '}
            <span className="font-bold text-gray-900">
              ${BILLING_DATA.reduce((sum, b) => sum + b.mrr, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlatformConfiguration;
