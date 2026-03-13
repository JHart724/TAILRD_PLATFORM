import React, { useState } from 'react';
import { 
  ArrowRight,
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  FileText,
  Calendar,
  Activity,
  Beaker,
  Pill
} from 'lucide-react';

export interface ReferralPathwayCardProps {
  referralId: string;
  patientName: string;
  patientAge: number;
  patientMRN: string;
  fromModule: string;
  toModule: string;
  reason: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  createdAt: string;
  createdBy: string;
  triggeringCQL: string;
  clinicalContext: {
 primaryDiagnosis: string;
 relevantLabs?: Array<{ name: string; value: string; unit: string; normal?: string; }>;
 currentMedications?: string[];
 allergies?: string[];
 vitals?: Array<{ name: string; value: string; unit: string; }>;
 recentProcedures?: string[];
  };
  estimatedRevenue?: number;
  onAccept: (referralId: string, notes?: string) => void;
  onDefer: (referralId: string, reason: string, deferUntil?: string) => void;
  onReject: (referralId: string, reason: string) => void;
  className?: string;
}

const ReferralPathwayCard: React.FC<ReferralPathwayCardProps> = ({
  referralId,
  patientName,
  patientAge,
  patientMRN,
  fromModule,
  toModule,
  reason,
  urgency,
  createdAt,
  createdBy,
  triggeringCQL,
  clinicalContext,
  estimatedRevenue,
  onAccept,
  onDefer,
  onReject,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionModal, setShowActionModal] = useState<'accept' | 'defer' | 'reject' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [deferDate, setDeferDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getUrgencyConfig = (urgency: string) => {
 switch (urgency) {
 case 'emergent':
 return {
 color: 'bg-medical-red-100 text-medical-red-700 border-medical-red-300',
 bgColor: 'bg-medical-red-50/50',
 accentColor: 'border-l-medical-red-500',
 icon: AlertTriangle,
 priority: 'STAT'
 };
 case 'urgent':
 return {
 color: 'bg-medical-amber-100 text-medical-amber-700 border-medical-amber-300',
 bgColor: 'bg-medical-amber-50',
 accentColor: 'border-l-medical-amber-500',
 icon: Clock,
 priority: 'URGENT'
 };
 case 'routine':
 return {
 color: 'bg-porsche-100 text-porsche-700 border-porsche-300',
 bgColor: 'bg-porsche-50/50',
 accentColor: 'border-l-porsche-500',
 icon: Calendar,
 priority: 'ROUTINE'
 };
 default:
 return {
 color: 'bg-titanium-100 text-titanium-700 border-titanium-300',
 bgColor: 'bg-titanium-50',
 accentColor: 'border-l-titanium-500',
 icon: Calendar,
 priority: 'UNKNOWN'
 };
 }
  };

  const config = getUrgencyConfig(urgency);
  const UrgencyIcon = config.icon;

  const getTimeAgo = (dateString: string) => {
 const hours = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60));
 if (hours < 1) return 'Just now';
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 return `${days}d ago`;
  };

  const handleAction = async (action: 'accept' | 'defer' | 'reject') => {
 setIsProcessing(true);
 
 try {
 switch (action) {
 case 'accept':
 await onAccept(referralId, actionNotes);
 break;
 case 'defer':
 await onDefer(referralId, actionNotes, deferDate);
 break;
 case 'reject':
 await onReject(referralId, actionNotes);
 break;
 }
 
 setShowActionModal(null);
 setActionNotes('');
 setDeferDate('');
 } catch (error) {
 console.error('Error processing action:', error);
 } finally {
 setIsProcessing(false);
 }
  };

  const renderActionModal = () => {
 if (!showActionModal) return null;

 const modalConfig = {
 accept: {
 title: 'Accept Referral',
 color: 'medical-green',
 actionText: 'Accept Referral',
 placeholder: 'Optional: Add notes for the accepting provider...'
 },
 defer: {
 title: 'Defer Referral',
 color: 'medical-amber',
 actionText: 'Defer Referral',
 placeholder: 'Reason for deferring this referral...'
 },
 reject: {
 title: 'Reject Referral',
 color: 'medical-red',
 actionText: 'Reject Referral',
 placeholder: 'Reason for rejecting this referral...'
 }
 }[showActionModal];

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
 <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-titanium-200">
 <h3 className="text-lg font-semibold text-titanium-800 mb-4">
 {modalConfig.title}
 </h3>
 
 <div className="mb-4">
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 {showActionModal === 'accept' ? 'Notes (Optional)' : 'Reason (Required)'}
 </label>
 <textarea
 value={actionNotes}
 onChange={(e) => setActionNotes(e.target.value)}
 placeholder={modalConfig.placeholder}
 rows={3}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500 resize-none"
 />
 </div>

 {showActionModal === 'defer' && (
 <div className="mb-4">
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Defer Until (Optional)
 </label>
 <input
 type="date"
 value={deferDate}
 onChange={(e) => setDeferDate(e.target.value)}
 min={new Date().toISOString().split('T')[0]}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 )}

 <div className="flex justify-end gap-3">
 <button
 onClick={() => {
 setShowActionModal(null);
 setActionNotes('');
 setDeferDate('');
 }}
 className="px-4 py-2 text-titanium-600 hover:text-titanium-700 hover:bg-titanium-100 rounded-lg transition-colors"
 disabled={isProcessing}
 >
 Cancel
 </button>
 <button
 onClick={() => handleAction(showActionModal)}
 disabled={isProcessing || (showActionModal !== 'accept' && !actionNotes.trim())}
 className={`px-4 py-2 bg-${modalConfig.color}-600 hover:bg-${modalConfig.color}-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {isProcessing ? 'Processing...' : modalConfig.actionText}
 </button>
 </div>
 </div>
 </div>
 );
  };

  return (
 <>
 <div className={`retina-card border-l-4 ${config.accentColor} ${className}`}>
 {/* Header */}
 <div className="p-4 border-b border-titanium-100">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="font-bold text-lg text-titanium-800">{patientName}</h3>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
 {config.priority}
 </span>
 </div>
 <p className="text-titanium-600 text-sm">
 Age {patientAge} • {patientMRN}
 </p>
 </div>
 
 <div className="text-right text-sm text-titanium-500">
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {getTimeAgo(createdAt)}
 </div>
 <div className="flex items-center gap-1 mt-1">
 <User className="w-3 h-3" />
 {createdBy}
 </div>
 </div>
 </div>

 {/* Module Flow */}
 <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} border ${config.color.split(' ')[2]}`}>
 <div className="text-center">
 <div className="font-semibold text-titanium-800 text-sm">{fromModule}</div>
 </div>
 <ArrowRight className="w-5 h-5 text-titanium-500 flex-shrink-0" />
 <div className="text-center">
 <div className="font-semibold text-titanium-800 text-sm">{toModule}</div>
 </div>
 </div>

 {/* Reason */}
 <div className="mt-3">
 <p className="text-titanium-800 font-medium leading-relaxed">{reason}</p>
 </div>

 {/* CQL Rule */}
 <div className="mt-2 flex items-center gap-2 text-xs text-titanium-500">
 <FileText className="w-3 h-3" />
 <span>Triggered by: {triggeringCQL}</span>
 </div>

 {/* Revenue Estimate */}
 {estimatedRevenue && (
 <div className="mt-2 text-xs text-medical-green-600 font-medium">
 Estimated Revenue Impact: ${estimatedRevenue.toLocaleString()}
 </div>
 )}
 </div>

 {/* Clinical Context */}
 <div className="p-4 border-b border-titanium-100">
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="w-full flex items-center justify-between text-left text-sm font-medium text-titanium-700 hover:text-titanium-900 transition-colors"
 >
 <span>Clinical Context</span>
 <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
 ›
 </span>
 </button>

 {isExpanded && (
 <div className="mt-4 space-y-4 animate-slide-in-right">
 {/* Primary Diagnosis */}
 <div>
 <h4 className="font-medium text-titanium-800 text-sm mb-2 flex items-center gap-2">
 <Activity className="w-4 h-4 text-medical-red-500" />
 Primary Diagnosis
 </h4>
 <p className="text-sm text-titanium-700 bg-titanium-50 p-2 rounded-lg">
 {clinicalContext.primaryDiagnosis}
 </p>
 </div>

 {/* Labs */}
 {clinicalContext.relevantLabs && clinicalContext.relevantLabs.length > 0 && (
 <div>
 <h4 className="font-medium text-titanium-800 text-sm mb-2 flex items-center gap-2">
 <Beaker className="w-4 h-4 text-porsche-500" />
 Relevant Labs
 </h4>
 <div className="grid grid-cols-2 gap-2">
 {clinicalContext.relevantLabs.map((lab, index) => (
 <div key={index} className="bg-titanium-50 p-2 rounded-lg text-sm">
 <div className="font-medium text-titanium-800">{lab.name}</div>
 <div className="text-titanium-600">
 {lab.value} {lab.unit}
 {lab.normal && (
 <span className="text-titanium-500 text-xs ml-1">
 (Normal: {lab.normal})
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Current Medications */}
 {clinicalContext.currentMedications && clinicalContext.currentMedications.length > 0 && (
 <div>
 <h4 className="font-medium text-titanium-800 text-sm mb-2 flex items-center gap-2">
 <Pill className="w-4 h-4 text-medical-green-500" />
 Current Medications
 </h4>
 <div className="space-y-1">
 {clinicalContext.currentMedications.map((med, index) => (
 <div key={index} className="text-sm text-titanium-700 bg-titanium-50 p-2 rounded">
 {med}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Allergies */}
 {clinicalContext.allergies && clinicalContext.allergies.length > 0 && (
 <div>
 <h4 className="font-medium text-titanium-800 text-sm mb-2 flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-medical-red-500" />
 Allergies
 </h4>
 <div className="flex flex-wrap gap-1">
 {clinicalContext.allergies.map((allergy, index) => (
 <span key={index} className="px-2 py-1 bg-medical-red-100 text-medical-red-700 text-xs rounded-full">
 {allergy}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Vitals */}
 {clinicalContext.vitals && clinicalContext.vitals.length > 0 && (
 <div>
 <h4 className="font-medium text-titanium-800 text-sm mb-2 flex items-center gap-2">
 <Activity className="w-4 h-4 text-medical-amber-500" />
 Recent Vitals
 </h4>
 <div className="grid grid-cols-3 gap-2">
 {clinicalContext.vitals.map((vital, index) => (
 <div key={index} className="bg-titanium-50 p-2 rounded-lg text-sm text-center">
 <div className="text-titanium-600 text-xs">{vital.name}</div>
 <div className="font-medium text-titanium-800">
 {vital.value} {vital.unit}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="p-4">
 <div className="flex gap-2">
 <button
 onClick={() => setShowActionModal('accept')}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-medical-green-600 hover:bg-medical-green-700 text-white rounded-lg font-medium transition-colors"
 >
 <CheckCircle className="w-4 h-4" />
 Accept
 </button>
 
 <button
 onClick={() => setShowActionModal('defer')}
 className="flex items-center justify-center gap-2 px-4 py-2 bg-medical-amber-600 hover:bg-medical-amber-700 text-white rounded-lg font-medium transition-colors"
 >
 <Pause className="w-4 h-4" />
 Defer
 </button>
 
 <button
 onClick={() => setShowActionModal('reject')}
 className="flex items-center justify-center gap-2 px-4 py-2 bg-medical-red-600 hover:bg-medical-red-700 text-white rounded-lg font-medium transition-colors"
 >
 <XCircle className="w-4 h-4" />
 Reject
 </button>
 </div>
 </div>
 </div>

 {renderActionModal()}
 </>
  );
};

export default ReferralPathwayCard;