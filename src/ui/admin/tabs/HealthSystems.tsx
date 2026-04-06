import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Eye,
  Pencil,
  Ban,
  X,
  MapPin,
  Users,
  Calendar,
} from 'lucide-react';
import { useAdminHospitals } from '../../../hooks/useAdminData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HealthSystem {
  id: string;
  name: string;
  status: 'Active' | 'Trial' | 'Inactive';
  tier: 'Enterprise' | 'Standard' | 'Trial';
  modules: string[];
  users: number;
  location: string;
  trialDaysRemaining?: number;
  contactEmail: string;
  contractStart: string;
  mrr: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const HEALTH_SYSTEMS: HealthSystem[] = [
  {
    id: 'hs-001',
    name: 'Baylor Scott & White',
    status: 'Active',
    tier: 'Enterprise',
    modules: ['HF', 'EP', 'SH', 'CAD', 'PV', 'VD'],
    users: 4,
    location: 'Temple, TX',
    contactEmail: 'admin@bswhealth.med',
    contractStart: '2025-06-01',
    mrr: '$42,000',
  },
  {
    id: 'hs-002',
    name: 'Regional Medical Center',
    status: 'Active',
    tier: 'Standard',
    modules: ['HF', 'EP', 'SH', 'CAD', 'PV', 'VD'],
    users: 5,
    location: 'New York, NY',
    contactEmail: 'admin@regionalmed.org',
    contractStart: '2025-09-15',
    mrr: '$28,000',
  },
  {
    id: 'hs-003',
    name: 'Mercy Health System',
    status: 'Trial',
    tier: 'Trial',
    modules: ['HF', 'CAD', 'SH'],
    users: 3,
    location: 'Houston, TX',
    trialDaysRemaining: 14,
    contactEmail: 'admin@mercyhealth.org',
    contractStart: '2026-03-08',
    mrr: '$0 (Trial)',
  },
];

// ─── Add Health System Modal ─────────────────────────────────────────────────

interface AddModalProps {
  open: boolean;
  onClose: () => void;
}

const AddHealthSystemModal: React.FC<AddModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Standard');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Health System</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health System Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cleveland Clinic"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
            >
              <option value="Enterprise">Enterprise</option>
              <option value="Standard">Standard</option>
              <option value="Trial">Trial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="admin@hospital.org"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A1A2E] focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#7A1A2E' }}
          >
            Add Health System
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: HealthSystem['status']; trialDays?: number }> = ({
  status,
  trialDays,
}) => {
  const styles: Record<string, string> = {
    Active: 'bg-green-50 text-green-600',
    Trial: 'bg-amber-50 text-amber-600',
    Inactive: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
      {status === 'Trial' && trialDays !== undefined && (
        <span className="ml-1 text-gray-500">({trialDays}d left)</span>
      )}
    </span>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

// Transform API hospital data to the HealthSystem display format
function mapApiHospital(h: any): HealthSystem {
  const modules: string[] = [];
  if (h.moduleHeartFailure) modules.push('HF');
  if (h.moduleElectrophysiology) modules.push('EP');
  if (h.moduleStructuralHeart) modules.push('SH');
  if (h.moduleCoronaryIntervention) modules.push('CAD');
  if (h.modulePeripheralVascular) modules.push('PV');
  if (h.moduleValvularDisease) modules.push('VD');
  return {
    id: h.id,
    name: h.name,
    status: h.subscriptionActive ? 'Active' : 'Inactive',
    tier: (h.subscriptionTier || 'Standard') as any,
    modules,
    users: h._count?.users ?? h.users?.length ?? 0,
    location: `${h.city || ''}, ${h.state || ''}`.replace(/^, |, $/g, '') || 'N/A',
    contactEmail: h.users?.[0]?.email || 'N/A',
    contractStart: h.subscriptionStart ? new Date(h.subscriptionStart).toLocaleDateString() : 'N/A',
    mrr: 'N/A',
  };
}

const HealthSystems: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: apiHospitals, loading: apiLoading } = useAdminHospitals();

  // Use API data when available, fall back to mock
  const displaySystems = apiHospitals ? apiHospitals.map(mapApiHospital) : HEALTH_SYSTEMS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Health Systems</h2>
          <p className="text-sm text-gray-500">Manage enrolled health system accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#7A1A2E' }}
        >
          <Plus className="w-4 h-4" />
          Add Health System
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Health System
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Modules
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                MRR
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displaySystems.map((hs, idx) => (
              <tr
                key={hs.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  idx % 2 === 1 ? 'bg-gray-50/50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{hs.name}</div>
                      <div className="text-xs text-gray-400">{hs.contactEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={hs.status} trialDays={hs.trialDaysRemaining} />
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">{hs.tier}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {hs.modules.map((m) => (
                      <span
                        key={m}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {hs.users}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {hs.location}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">{hs.mrr}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" title="Deactivate">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddHealthSystemModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
};

export default HealthSystems;
