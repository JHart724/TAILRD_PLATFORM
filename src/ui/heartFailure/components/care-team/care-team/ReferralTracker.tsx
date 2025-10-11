import React, { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface Referral {
  id: string;
  patientName: string;
  mrn: string;
  referralType: string;
  targetSpecialty: string;
  indication: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  sentDate: string;
  scheduledDate?: string;
  completedDate?: string;
  sentBy: string;
  priority: 'urgent' | 'routine';
  notes?: string;
}

const ReferralTracker: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const referrals: Referral[] = [
    {
      id: 'REF001',
      patientName: 'Johnson, Maria',
      mrn: '123456',
      referralType: 'CRT-D Evaluation',
      targetSpecialty: 'Electrophysiology',
      indication: 'EF 28%, NYHA III, QRS 152ms, LBBB',
      status: 'scheduled',
      sentDate: '2025-10-05',
      scheduledDate: '2025-10-15',
      sentBy: 'Dr. Smith',
      priority: 'urgent'
    },
    {
      id: 'REF002',
      patientName: 'Williams, Robert',
      mrn: '789012',
      referralType: 'Amyloid Workup',
      targetSpecialty: 'Cardiology - Advanced HF',
      indication: 'Amyloid risk flags: age >65, unexplained LVH, neuropathy',
      status: 'pending',
      sentDate: '2025-10-08',
      sentBy: 'Dr. Jones',
      priority: 'routine'
    },
    {
      id: 'REF003',
      patientName: 'Davis, Linda',
      mrn: '345678',
      referralType: 'LVAD Evaluation',
      targetSpecialty: 'Cardiac Surgery',
      indication: 'EF 22%, NYHA III, inotrope-dependent, transplant candidate',
      status: 'overdue',
      sentDate: '2025-09-28',
      sentBy: 'Dr. Smith',
      priority: 'urgent',
      notes: 'Patient declined initial consult, rescheduling needed'
    },
    {
      id: 'REF004',
      patientName: 'Brown, John',
      mrn: '901234',
      referralType: 'Genetic Testing',
      targetSpecialty: 'Medical Genetics',
      indication: 'HCM phenotype, family history',
      status: 'completed',
      sentDate: '2025-09-15',
      scheduledDate: '2025-09-25',
      completedDate: '2025-09-25',
      sentBy: 'Dr. Jones',
      priority: 'routine'
    }
  ];

  const filteredReferrals = referrals.filter(r => 
    filterStatus === 'all' || r.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-4 h-4 text-amber-700" />,
      scheduled: <CheckCircle className="w-4 h-4 text-indigo-700" />,
      completed: <CheckCircle className="w-4 h-4 text-teal-700" />,
      cancelled: <XCircle className="w-4 h-4 text-slate-500" />,
      overdue: <AlertTriangle className="w-4 h-4 text-red-700" />
    };
    return icons[status as keyof typeof icons];
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-900 border-amber-400',
      scheduled: 'bg-indigo-100 text-indigo-900 border-indigo-400',
      completed: 'bg-teal-100 text-teal-900 border-teal-400',
      cancelled: 'bg-slate-100 text-slate-700 border-slate-400',
      overdue: 'bg-red-100 text-red-900 border-red-400'
    };
    return colors[status as keyof typeof colors];
  };

  const statusCounts = {
    all: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    scheduled: referrals.filter(r => r.status === 'scheduled').length,
    overdue: referrals.filter(r => r.status === 'overdue').length,
    completed: referrals.filter(r => r.status === 'completed').length
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-300">
      <div className="px-6 py-4 border-b border-slate-300 bg-slate-50">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Tracker</h3>
        
        <div className="grid grid-cols-5 gap-3">
          {[
            { key: 'all', label: 'All', count: statusCounts.all },
            { key: 'pending', label: 'Pending', count: statusCounts.pending },
            { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
            { key: 'overdue', label: 'Overdue', count: statusCounts.overdue },
            { key: 'completed', label: 'Completed', count: statusCounts.completed }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`p-3 rounded-lg border-2 transition-all ${
                filterStatus === key
                  ? 'border-slate-700 bg-slate-100'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-xs text-slate-700 mt-1 font-medium">{label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {filteredReferrals.map((referral) => (
          <div key={referral.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(referral.status)}
                <div>
                  <div className="font-semibold text-slate-900 mb-1">{referral.patientName}</div>
                  <div className="text-sm text-slate-600">MRN: {referral.mrn}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {referral.priority === 'urgent' && (
                  <span className="px-2 py-1 bg-red-100 text-red-900 text-xs rounded-md border border-red-400 font-medium">
                    URGENT
                  </span>
                )}
                <span className={`px-2 py-1 text-xs rounded-md border font-medium ${getStatusBadge(referral.status)}`}>
                  {referral.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">Referral Type</div>
                <div className="font-medium text-slate-800">{referral.referralType}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Target Specialty</div>
                <div className="font-medium text-slate-800">{referral.targetSpecialty}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-slate-600 mb-1">Clinical Indication</div>
              <div className="text-sm text-slate-800 bg-slate-100 p-3 rounded-lg border border-slate-200">
                {referral.indication}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
              <div>
                <span className="text-slate-600">Sent:</span>{' '}
                <span className="font-medium text-slate-800">
                  {new Date(referral.sentDate).toLocaleDateString()}
                </span>
              </div>
              {referral.scheduledDate && (
                <div>
                  <span className="text-slate-600">Scheduled:</span>{' '}
                  <span className="font-medium text-indigo-800">
                    {new Date(referral.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {referral.completedDate && (
                <div>
                  <span className="text-slate-600">Completed:</span>{' '}
                  <span className="font-medium text-teal-800">
                    {new Date(referral.completedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {referral.notes && (
              <div className="mb-3">
                <div className="text-xs text-slate-600 mb-1">Notes</div>
                <div className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-300">
                  {referral.notes}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium">
                <Send className="w-4 h-4" />
                Follow Up
              </button>
              {referral.status === 'pending' && (
                <button className="px-4 py-2 bg-teal-100 text-teal-900 text-sm rounded-lg hover:bg-teal-200 transition-colors font-medium">
                  Mark Scheduled
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralTracker;
