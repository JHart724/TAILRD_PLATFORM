import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  X,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hospital: string;
  hospitalId: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
  mfaEnabled: boolean;
}

interface LoginEntry {
  timestamp: string;
  ip: string;
  success: boolean;
}

interface ActionEntry {
  timestamp: string;
  action: string;
  detail: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const USERS: AdminUser[] = [
  // BSW (4 users)
  { id: 'u-001', email: 'sarah.chen@bswhealth.med', firstName: 'Sarah', lastName: 'Chen', role: 'Hospital Admin', hospital: 'BSW', hospitalId: 'hs-001', status: 'Active', lastLogin: '2026-03-22 08:15', mfaEnabled: true },
  { id: 'u-002', email: 'ahmed.patel@bswhealth.med', firstName: 'Ahmed', lastName: 'Patel', role: 'Physician', hospital: 'BSW', hospitalId: 'hs-001', status: 'Active', lastLogin: '2026-03-22 07:30', mfaEnabled: true },
  { id: 'u-003', email: 'maria.garcia@bswhealth.med', firstName: 'Maria', lastName: 'Garcia', role: 'Quality Director', hospital: 'BSW', hospitalId: 'hs-001', status: 'Active', lastLogin: '2026-03-21 16:45', mfaEnabled: false },
  { id: 'u-004', email: 'james.thompson@bswhealth.med', firstName: 'James', lastName: 'Thompson', role: 'Analyst', hospital: 'BSW', hospitalId: 'hs-001', status: 'Active', lastLogin: '2026-03-20 14:20', mfaEnabled: true },
  // Regional Medical (5 users)
  { id: 'u-005', email: 'rachel.kim@regionalmed.org', firstName: 'Rachel', lastName: 'Kim', role: 'Hospital Admin', hospital: 'Regional Medical', hospitalId: 'hs-002', status: 'Active', lastLogin: '2026-03-22 09:00', mfaEnabled: true },
  { id: 'u-006', email: 'james.wilson@regionalmed.org', firstName: 'James', lastName: 'Wilson', role: 'Physician', hospital: 'Regional Medical', hospitalId: 'hs-002', status: 'Active', lastLogin: '2026-03-22 08:45', mfaEnabled: true },
  { id: 'u-007', email: 'lisa.park@regionalmed.org', firstName: 'Lisa', lastName: 'Park', role: 'Nurse Manager', hospital: 'Regional Medical', hospitalId: 'hs-002', status: 'Active', lastLogin: '2026-03-22 07:55', mfaEnabled: false },
  { id: 'u-008', email: 'emily.foster@regionalmed.org', firstName: 'Emily', lastName: 'Foster', role: 'Physician', hospital: 'Regional Medical', hospitalId: 'hs-002', status: 'Active', lastLogin: '2026-03-21 17:30', mfaEnabled: true },
  { id: 'u-009', email: 'mark.davis@regionalmed.org', firstName: 'Mark', lastName: 'Davis', role: 'Analyst', hospital: 'Regional Medical', hospitalId: 'hs-002', status: 'Active', lastLogin: '2026-03-21 15:10', mfaEnabled: false },
  // Mercy Health System (3 users)
  { id: 'u-010', email: 'john.martinez@mercyhealth.org', firstName: 'John', lastName: 'Martinez', role: 'Hospital Admin', hospital: 'Mercy Health System', hospitalId: 'hs-003', status: 'Active', lastLogin: '2026-03-22 08:30', mfaEnabled: true },
  { id: 'u-011', email: 'maria.rodriguez@mercyhealth.org', firstName: 'Maria', lastName: 'Rodriguez', role: 'Service Line Director', hospital: 'Mercy Health System', hospitalId: 'hs-003', status: 'Active', lastLogin: '2026-03-22 06:20', mfaEnabled: false },
  { id: 'u-012', email: 'robert.kim@mercyhealth.org', firstName: 'Robert', lastName: 'Kim', role: 'Care Team Lead', hospital: 'Mercy Health System', hospitalId: 'hs-003', status: 'Pending', lastLogin: 'Never', mfaEnabled: false },
];

const MOCK_LOGINS: LoginEntry[] = [
  { timestamp: '2026-03-22 08:15:23', ip: '10.0.1.42', success: true },
  { timestamp: '2026-03-21 17:30:11', ip: '10.0.1.42', success: true },
  { timestamp: '2026-03-20 09:05:47', ip: '192.168.1.100', success: true },
  { timestamp: '2026-03-19 08:45:02', ip: '10.0.1.42', success: false },
  { timestamp: '2026-03-18 14:22:38', ip: '10.0.1.42', success: true },
];

const MOCK_ACTIONS: ActionEntry[] = [
  { timestamp: '2026-03-22 08:20', action: 'Viewed Dashboard', detail: 'Heart Failure Executive View' },
  { timestamp: '2026-03-22 08:18', action: 'Exported Report', detail: 'Q1 Gap Analysis PDF' },
  { timestamp: '2026-03-21 16:45', action: 'Resolved Gap', detail: 'HF-042: LVEF Documentation' },
  { timestamp: '2026-03-21 15:30', action: 'Viewed Patient', detail: 'Patient ID #4521' },
  { timestamp: '2026-03-21 14:10', action: 'Updated Alert', detail: 'EP Device Follow-up' },
  { timestamp: '2026-03-20 11:25', action: 'Viewed Dashboard', detail: 'Structural Heart Service Line' },
  { timestamp: '2026-03-20 09:15', action: 'Resolved Gap', detail: 'CAD-018: Statin Therapy' },
  { timestamp: '2026-03-19 16:40', action: 'Exported Report', detail: 'Monthly KPI Summary' },
];

// ─── User Detail Panel ───────────────────────────────────────────────────────

interface UserDetailPanelProps {
  user: AdminUser | null;
  onClose: () => void;
}

const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Role</div>
              <div className="text-sm font-medium text-gray-900">{user.role}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Hospital</div>
              <div className="text-sm font-medium text-gray-900">{user.hospital}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'Active'
                    ? 'bg-[#F0F7F4] text-[#2D6147]'
                    : user.status === 'Pending'
                    ? 'bg-[#FAF6E8] text-[#8B6914]'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {user.status}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">MFA Status</div>
              <span className={`inline-flex items-center gap-1 text-sm ${user.mfaEnabled ? 'text-[#2C4A60]' : 'text-[#6B7280]'}`}>
                {user.mfaEnabled ? (
                  <><Shield className="w-3.5 h-3.5" /> Enabled</>
                ) : (
                  <><XCircle className="w-3.5 h-3.5" /> Not Enabled</>
                )}
              </span>
            </div>
          </div>

          {/* Login History */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              Login History
            </h4>
            <div className="space-y-2">
              {MOCK_LOGINS.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {entry.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#2C4A60]" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="text-gray-700">{entry.timestamp}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{entry.ip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Actions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Actions</h4>
            <div className="space-y-2">
              {MOCK_ACTIONS.map((entry, i) => (
                <div key={i} className="py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                    <span className="text-xs text-gray-400">{entry.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{entry.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const UsersManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const filtered = USERS.filter((u) => {
    if (hospitalFilter !== 'all' && u.hospital !== hospitalFilter) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hospitals = Array.from(new Set(USERS.map((u) => u.hospital)));
  const roles = Array.from(new Set(USERS.map((u) => u.role)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">{USERS.length} users across {hospitals.length} health systems</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#7A1A2E' }}
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
          />
        </div>
        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
        >
          <option value="all">All Health Systems</option>
          {hospitals.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hospital</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MFA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => (
              <tr
                key={user.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  idx % 2 === 1 ? 'bg-gray-50/50' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{user.role}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.hospital}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'Active'
                        ? 'bg-[#F0F7F4] text-[#2D6147]'
                        : user.status === 'Pending'
                        ? 'bg-[#FAF6E8] text-[#8B6914]'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.mfaEnabled ? (
                    <Shield className="w-4 h-4 text-[#2C4A60]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.lastLogin}</td>
                <td className="px-6 py-3 text-right">
                  <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No users match your filters</div>
        )}
      </div>

      {/* Detail Slide-in */}
      <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default UsersManagement;
