import React, { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface SHReferral {
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

const SHReferralTracker: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const referrals: SHReferral[] = [
 {
 id: 'REF001',
 patientName: 'Johnson, Maria',
 mrn: '123456',
 referralType: 'TAVR Evaluation',
 targetSpecialty: 'Structural Heart',
 indication: 'Disease Stage 28%, Valve Stage III, QRS 152ms, LBBB',
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
 referralType: 'Aortic Stenosis Workup',
 targetSpecialty: 'Cardiology - Structural Heart',
 indication: 'Severe AS risk flags: age >65, unexplained LVH, neuropathy',
 status: 'pending',
 sentDate: '2025-10-08',
 sentBy: 'Dr. Jones',
 priority: 'routine'
 },
 {
 id: 'REF003',
 patientName: 'Davis, Linda',
 mrn: '345678',
 referralType: 'TriClip Evaluation',
 targetSpecialty: 'Cardiac Surgery',
 indication: 'Disease Stage 22%, Valve Stage III, inotrope-dependent, transplant candidate',
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
 indication: 'Bicuspid Aortic Valve phenotype, family history',
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
 pending: <Clock className="w-4 h-4 text-[#6B7280]" />,
 scheduled: <CheckCircle className="w-4 h-4 text-chrome-700" />,
 completed: <CheckCircle className="w-4 h-4 text-[#2C4A60]" />,
 cancelled: <XCircle className="w-4 h-4 text-titanium-500" />,
 overdue: <AlertTriangle className="w-4 h-4 text-red-700" />
 };
 return icons[status as keyof typeof icons];
  };

  const getStatusBadge = (status: string) => {
 const colors = {
 pending: 'bg-[#FAF6E8] text-[#8B6914] border-[#C8D4DC]',
 scheduled: 'bg-chrome-100 text-chrome-900 border-chrome-400',
 completed: 'bg-[#F0F7F4] text-[#2D6147] border-[#2C4A60]',
 cancelled: 'bg-titanium-100 text-titanium-700 border-titanium-400',
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
 <div className="metal-card">
 <div className="px-6 py-4 border-b border-titanium-200 bg-gradient-to-r from-titanium-50 to-porsche-50">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4">Referral Tracker</h3>
 
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
 ? 'border-porsche-600 bg-porsche-50'
 : 'border-titanium-300 bg-white hover:border-porsche-300'
 }`}
 >
 <div className="text-2xl font-bold text-titanium-900">
 {count}
 </div>
 <div className="text-xs text-titanium-700 mt-1 font-medium">{label}</div>
 </button>
 ))}
 </div>
 </div>

 <div className="divide-y divide-titanium-200">
 {filteredReferrals.map((referral) => (
 <div key={referral.id} className="px-6 py-4 data-focus transition-all duration-200 border-l-2 border-transparent">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-start gap-3">
 {getStatusIcon(referral.status)}
 <div>
 <div className="font-semibold text-titanium-900 mb-1">{referral.patientName}</div>
 <div className="text-sm text-titanium-600">MRN: {referral.mrn}</div>
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
 <div className="text-xs text-titanium-600 mb-1">Referral Type</div>
 <div className="font-medium text-titanium-800">{referral.referralType}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Target Specialty</div>
 <div className="font-medium text-titanium-800">{referral.targetSpecialty}</div>
 </div>
 </div>

 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Clinical Indication</div>
 <div className="text-sm text-titanium-800 bg-titanium-100 p-3 rounded-lg border border-titanium-200">
 {referral.indication}
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
 <div>
 <span className="text-titanium-600">Sent:</span>{' '}
 <span className="font-medium text-titanium-800">
 {new Date(referral.sentDate).toLocaleDateString()}
 </span>
 </div>
 {referral.scheduledDate && (
 <div>
 <span className="text-titanium-600">Scheduled:</span>{' '}
 <span className="font-medium text-chrome-800">
 {new Date(referral.scheduledDate).toLocaleDateString()}
 </span>
 </div>
 )}
 {referral.completedDate && (
 <div>
 <span className="text-titanium-600">Completed:</span>{' '}
 <span className="font-medium text-[#2C4A60]">
 {new Date(referral.completedDate).toLocaleDateString()}
 </span>
 </div>
 )}
 </div>

 {referral.notes && (
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Notes</div>
 <div className="text-sm text-[#8B6914] bg-[#FAF6E8] p-3 rounded-lg border border-[#C8D4DC]">
 {referral.notes}
 </div>
 </div>
 )}

 <div className="flex gap-2">
 <button className="px-4 py-2 bg-gradient-to-r from-porsche-600 to-porsche-700 text-white text-sm rounded-lg hover:from-porsche-700 hover:to-porsche-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2 font-medium border border-titanium-200">
 <Send className="w-4 h-4" />
 Follow Up
 </button>
 {referral.status === 'pending' && (
 <button className="px-4 py-2 bg-gradient-to-r from-[#F0F5FA]/80 to-[#C8D4DC]/80 text-[#2C4A60] text-sm rounded-lg hover:from-[#C8D4DC]/90 hover:to-[#C8D4DC]/90 transition-all duration-300 transform hover:scale-105 hover:shadow-md font-medium border border-[#C8D4DC]/40">
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

export default SHReferralTracker;