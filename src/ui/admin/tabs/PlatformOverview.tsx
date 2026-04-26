import React from 'react';
import {
  Building2,
  Users,
  Heart,
  AlertTriangle,
  Upload,
  Server,
  Activity,
  LogIn,
  FileText,
  CheckCircle,
  UserPlus,
  Shield,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAdminDashboard, useAdminHospitals } from '../../../hooks/useAdminData';

// ─── KPI card layout (labels are constant; values come from /api/admin/dashboard) ──
// Default values render as "—" when API data is absent so labels never flip mid-load.

const KPI_LAYOUT = [
  { key: 'totalHealthSystems', label: 'Total Health Systems', icon: Building2, color: '#7A1A2E' },
  { key: 'activeUsers', label: 'Active Users', icon: Users, color: '#2C4A60' },
  { key: 'totalPatients', label: 'Total Patients', icon: Heart, color: '#2C4A60' },
  { key: 'unacknowledgedAlerts', label: 'Unacknowledged Alerts', icon: AlertTriangle, color: '#8B6914' },
  { key: 'webhookEvents24h', label: 'Webhook Events (24h)', icon: Upload, color: '#2C4A60' },
  { key: 'platformStatus', label: 'Platform Status', icon: Server, color: '#059669' },
] as const;

// ─── Activity Feed ───────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'login' | 'upload' | 'gap_action' | 'invite' | 'config' | 'export';
  user: string;
  hospital: string;
  description: string;
}

const ACTIVITY_FEED: ActivityEvent[] = [
  { id: 'e01', timestamp: '2 min ago', type: 'login', user: 'Dr. Sarah Chen', hospital: 'BSW', description: 'Signed in to Care Team view' },
  { id: 'e02', timestamp: '8 min ago', type: 'gap_action', user: 'Dr. James Wilson', hospital: 'Main Campus', description: 'Resolved 3 HF gaps for patient cohort' },
  { id: 'e03', timestamp: '15 min ago', type: 'upload', user: 'Admin Thompson', hospital: 'BSW', description: 'Uploaded Q1 2026 patient registry (1,240 records)' },
  { id: 'e04', timestamp: '22 min ago', type: 'login', user: 'Dr. Maria Rodriguez', hospital: 'Mercy Health System', description: 'Signed in to Executive view' },
  { id: 'e05', timestamp: '35 min ago', type: 'gap_action', user: 'NM Lisa Park', hospital: 'Main Campus', description: 'Flagged 5 EP patients for device follow-up' },
  { id: 'e06', timestamp: '1 hr ago', type: 'invite', user: 'Admin Johnson', hospital: 'Mercy Health System', description: 'Invited dr.kumar@mercyhealth.org as Physician' },
  { id: 'e07', timestamp: '1.5 hrs ago', type: 'export', user: 'QD Martinez', hospital: 'BSW', description: 'Exported Structural Heart quarterly report' },
  { id: 'e08', timestamp: '2 hrs ago', type: 'login', user: 'Dr. Ahmed Patel', hospital: 'BSW', description: 'Signed in to Service Line view' },
  { id: 'e09', timestamp: '2.5 hrs ago', type: 'gap_action', user: 'Dr. Emily Foster', hospital: 'Main Campus', description: 'Acknowledged 8 CAD documentation gaps' },
  { id: 'e10', timestamp: '3 hrs ago', type: 'upload', user: 'Admin Chen', hospital: 'Main Campus', description: 'Uploaded device registry update (890 records)' },
  { id: 'e11', timestamp: '4 hrs ago', type: 'config', user: 'Platform Admin', hospital: 'TAILRD', description: 'Updated Mercy Health System module access' },
  { id: 'e12', timestamp: '5 hrs ago', type: 'login', user: 'Dr. Robert Kim', hospital: 'Mercy Health System', description: 'Signed in to Care Team view' },
  { id: 'e13', timestamp: '6 hrs ago', type: 'gap_action', user: 'Dr. Sarah Chen', hospital: 'BSW', description: 'Closed 12 Valvular Disease follow-up gaps' },
  { id: 'e14', timestamp: '8 hrs ago', type: 'export', user: 'Analyst Davis', hospital: 'Main Campus', description: 'Exported full platform analytics CSV' },
  { id: 'e15', timestamp: '12 hrs ago', type: 'upload', user: 'Admin Thompson', hospital: 'BSW', description: 'Uploaded peripheral vascular outcomes data' },
];

const ACTIVITY_ICON_MAP: Record<ActivityEvent['type'], React.ElementType> = {
  login: LogIn,
  upload: Upload,
  gap_action: CheckCircle,
  invite: UserPlus,
  config: Shield,
  export: FileText,
};

const ACTIVITY_COLOR_MAP: Record<ActivityEvent['type'], string> = {
  login: '#2C4A60',
  upload: '#2C4A60',
  gap_action: '#2C4A60',
  invite: '#636D80',
  config: '#7A1A2E',
  export: '#4A6880',
};

// ─── Health System Status ────────────────────────────────────────────────────
// Fallback only when /api/admin/hospitals is unreachable.

interface HealthSystemRow {
  id: string;
  name: string;
  status: 'Active' | 'Trial' | 'Inactive';
  tier: string;
  users: number;
  patients: number;
  location: string;
}

const FALLBACK_HEALTH_SYSTEMS: HealthSystemRow[] = [
  { id: 'fallback-bsw', name: 'Baylor Scott & White', status: 'Active', tier: 'Enterprise', users: 4, patients: 5280, location: 'Temple, TX' },
  { id: 'fallback-mch', name: 'Main Campus Health System', status: 'Active', tier: 'Standard', users: 5, patients: 3540, location: 'Dallas, TX' },
  { id: 'fallback-mh', name: 'Mercy Health System', status: 'Trial', tier: 'Trial', users: 3, patients: 1840, location: 'Houston, TX' },
];

function mapApiHospital(h: Record<string, any>): HealthSystemRow {
  const tier = String(h.subscriptionTier ?? '').toLowerCase();
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Standard';
  const city = h.city ? String(h.city) : '';
  const state = h.state ? String(h.state) : '';
  const location = [city, state].filter(Boolean).join(', ') || '—';
  return {
    id: String(h.id ?? ''),
    name: String(h.name ?? 'Unnamed health system'),
    status: h.subscriptionActive ? (tier === 'trial' ? 'Trial' : 'Active') : 'Inactive',
    tier: tierLabel,
    users: Number(h._count?.users ?? 0),
    patients: Number(h._count?.patients ?? h.patientCount ?? 0),
    location,
  };
}

// ─── Chart Data ──────────────────────────────────────────────────────────────
// Placeholder shape until /api/admin/god/dau and /uploads endpoints land.
// Values are derived deterministically from the index so every page load
// (and every GodView response) renders the same series — CLAUDE.md §14
// forbids Math.random in production code.

const DAU_DATA = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  return {
    day: `Mar ${day}`,
    BSW: 2 + (i % 3),
    MSH: 2 + (i % 4),
    MH: 1 + (i % 2),
  };
});

const UPLOAD_DATA = Array.from({ length: 12 }, (_, i) => {
  const weekNum = i + 1;
  return {
    week: `W${weekNum}`,
    uploads: 3 + ((i * 3) % 8),
  };
});

// ─── Component ───────────────────────────────────────────────────────────────

const PlatformOverview: React.FC = () => {
  const { data: dashboard, loading } = useAdminDashboard();
  const { data: apiHospitals } = useAdminHospitals();

  // KPI values keyed off the layout above. Missing values render as "—" so the
  // label set is stable whether the dashboard endpoint has loaded or not.
  const KPI_VALUES: Record<string, string> = dashboard ? {
    totalHealthSystems: String(dashboard.totalHospitals),
    activeUsers: String(dashboard.activeUsers),
    totalPatients: dashboard.totalPatients.toLocaleString(),
    unacknowledgedAlerts: String(dashboard.unacknowledgedAlerts),
    webhookEvents24h: String(dashboard.recentWebhookEvents),
    platformStatus: 'Online',
  } : {
    totalHealthSystems: '—',
    activeUsers: '—',
    totalPatients: '—',
    unacknowledgedAlerts: '—',
    webhookEvents24h: '—',
    platformStatus: loading ? 'Checking…' : 'Unknown',
  };

  // Real hospitals when API data has loaded, deterministic fallback otherwise.
  const healthSystems: HealthSystemRow[] = apiHospitals && apiHospitals.length > 0
    ? apiHospitals.map(mapApiHospital)
    : FALLBACK_HEALTH_SYSTEMS;

  return (
    <div className="space-y-6">
      {loading && <div className="text-sm text-gray-500 animate-pulse">Loading live data...</div>}
      {dashboard && <div className="text-xs text-emerald-600 font-medium">Live data from backend API</div>}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_LAYOUT.map((kpi) => {
          const Icon = kpi.icon;
          const value = KPI_VALUES[kpi.key] ?? '—';
          return (
            <div
              key={kpi.key}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: kpi.color + '15' }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Active Users (30 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={DAU_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="BSW" stroke="#7A1A2E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MSH" stroke="#2C4A60" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MH" stroke="#2C4A60" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Uploads Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Data Uploads (12 Weeks)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={UPLOAD_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="uploads" fill="#7A1A2E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Health System Status + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health System Cards */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Health System Status</h3>
          {healthSystems.map((hs) => (
            <div key={hs.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-gray-900">{hs.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    hs.status === 'Active'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {hs.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>
                  <span className="block text-gray-900 font-medium">{hs.tier}</span>
                  Tier
                </div>
                <div>
                  <span className="block text-gray-900 font-medium">{hs.users}</span>
                  Users
                </div>
                <div>
                  <span className="block text-gray-900 font-medium">{hs.patients.toLocaleString()}</span>
                  Patients
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">{hs.location}</div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            <Activity className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
            {ACTIVITY_FEED.map((event) => {
              const Icon = ACTIVITY_ICON_MAP[event.type];
              const color = ACTIVITY_COLOR_MAP[event.type];
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: color + '15' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{event.user}</span>
                      <span className="text-gray-400 mx-1">-</span>
                      <span className="text-gray-500">{event.description}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{event.timestamp}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {event.hospital}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformOverview;
