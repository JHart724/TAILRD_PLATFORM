import React, { useState } from 'react';
import { useAdminDashboard } from '../../../hooks/useAdminData';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Monitor,
  Globe,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const SECURITY_SUMMARY: Record<string, number> = {
  failedLogins: 3,
  suspiciousIPs: 1,
  phiRejections: 0,
};

interface FailedLogin {
  id: string;
  email: string;
  ip: string;
  timestamp: string;
  reason: string;
}

const FAILED_LOGINS: FailedLogin[] = [
  { id: 'fl-1', email: 'unknown@external.com', ip: '203.0.113.42', timestamp: '2026-03-22 03:14:22', reason: 'Invalid credentials' },
  { id: 'fl-2', email: 'sarah.chen@bswhealth.med', ip: '10.0.1.42', timestamp: '2026-03-21 08:45:11', reason: 'Wrong password (1/5)' },
  { id: 'fl-3', email: 'admin@test.com', ip: '198.51.100.77', timestamp: '2026-03-20 22:30:05', reason: 'Account not found' },
];

interface ActiveSession {
  id: string;
  user: string;
  hospital: string;
  ip: string;
  startedAt: string;
  lastActivity: string;
}

const ACTIVE_SESSIONS: ActiveSession[] = [
  { id: 'as-1', user: 'Sarah Chen', hospital: 'BSW', ip: '10.0.1.42', startedAt: '2026-03-22 08:15', lastActivity: '2 min ago' },
  { id: 'as-2', user: 'James Wilson', hospital: 'Main Campus', ip: '172.16.5.88', startedAt: '2026-03-22 08:45', lastActivity: '5 min ago' },
  { id: 'as-3', user: 'Maria Rodriguez', hospital: 'Mercy Health System', ip: '192.168.10.12', startedAt: '2026-03-22 06:20', lastActivity: '15 min ago' },
  { id: 'as-4', user: 'Platform Admin', hospital: 'TAILRD', ip: '10.0.0.1', startedAt: '2026-03-22 09:00', lastActivity: 'Now' },
];

const MFA_DATA = [
  { name: 'MFA Enabled', value: 7, color: '#2C4A60' },
  { name: 'MFA Disabled', value: 5, color: '#6B7280' },
];

const IP_ALLOWLIST = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
];

// ─── Component ───────────────────────────────────────────────────────────────

const AuditSecurity: React.FC = () => {
  const { data: dashboard } = useAdminDashboard();
  const [allowlist, setAllowlist] = useState(IP_ALLOWLIST);
  const [newIp, setNewIp] = useState('');

  // Override mock security summary with real alert count when available
  if (dashboard) {
    SECURITY_SUMMARY.openAlerts = dashboard.unacknowledgedAlerts;
  }

  const addIp = () => {
    if (newIp && !allowlist.includes(newIp)) {
      setAllowlist([...allowlist, newIp]);
      setNewIp('');
    }
  };

  const removeIp = (ip: string) => {
    setAllowlist(allowlist.filter((i) => i !== ip));
  };

  return (
    <div className="space-y-6">
      {/* Security Events Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ShieldX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{SECURITY_SUMMARY.failedLogins}</div>
              <div className="text-xs text-gray-500">Failed Logins (24h)</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-chrome-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{SECURITY_SUMMARY.suspiciousIPs}</div>
              <div className="text-xs text-gray-500">Suspicious IPs</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-titanium-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{SECURITY_SUMMARY.phiRejections}</div>
              <div className="text-xs text-gray-500">PHI Access Rejections</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Login Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Failed Login Attempts
          </h3>
          <div className="space-y-2">
            {FAILED_LOGINS.map((fl) => (
              <div key={fl.id} className="flex items-start justify-between py-2 px-3 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{fl.email}</div>
                  <div className="text-xs text-gray-500">
                    {fl.timestamp} - <span className="text-red-600">{fl.reason}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-400">{fl.ip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MFA Status Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">MFA Status Overview</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={MFA_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {MFA_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {MFA_DATA.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-gray-700">
                    {d.name}: <span className="font-semibold">{d.value}</span>
                  </span>
                </div>
              ))}
              <div className="text-xs text-gray-400 mt-2">
                {Math.round((MFA_DATA[0].value / (MFA_DATA[0].value + MFA_DATA[1].value)) * 100)}% adoption rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <Monitor className="w-4 h-4 text-blue-500" />
          Active Sessions ({ACTIVE_SESSIONS.length})
        </h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Hospital</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">IP</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Started</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Last Activity</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVE_SESSIONS.map((session) => (
              <tr key={session.id} className="border-b border-gray-50">
                <td className="py-3 text-sm font-medium text-gray-900">{session.user}</td>
                <td className="py-3 text-sm text-gray-600">{session.hospital}</td>
                <td className="py-3 text-sm font-mono text-gray-500">{session.ip}</td>
                <td className="py-3 text-sm text-gray-500">{session.startedAt}</td>
                <td className="py-3 text-sm text-gray-500">{session.lastActivity}</td>
                <td className="py-3 text-right">
                  <button className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    Terminate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IP Allowlist */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-gray-500" />
          IP Allowlist (Super Admin Access)
        </h3>
        <div className="space-y-2 mb-4">
          {allowlist.map((ip) => (
            <div
              key={ip}
              className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="text-sm font-mono text-gray-700">{ip}</span>
              <button
                onClick={() => removeIp(ip)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="e.g., 203.0.113.0/24"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && addIp()}
          />
          <button
            onClick={addIp}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#7A1A2E' }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditSecurity;
