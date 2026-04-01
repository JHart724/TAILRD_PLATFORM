import React, { useState } from 'react';
import { CheckCircle, Send, XCircle } from 'lucide-react';
import { useGapActions, GapActionType } from '../../hooks/useGapActions';

interface GapActionButtonsProps {
  gapId: string;
  gapName: string;
  ctaText: string;
  moduleType: string;
  existingAction?: GapActionType | null;
}

export default function GapActionButtons({
  gapId,
  gapName,
  ctaText,
  moduleType,
  existingAction,
}: GapActionButtonsProps) {
  const { trackGapAction, gapActions } = useGapActions(moduleType);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionTaken = existingAction || gapActions[gapId] || null;

  const handleAction = async (action: GapActionType, reason?: string) => {
    setIsSubmitting(true);
    try {
      await trackGapAction(gapId, action, reason);
    } finally {
      setIsSubmitting(false);
      setShowDismissModal(false);
      setDismissReason('');
    }
  };

  // After action: show confirmation badge
  if (actionTaken) {
    const badges: Record<GapActionType, { label: string; color: string; icon: React.ElementType }> = {
      ordered: { label: 'Order Initiated', color: 'bg-forest-50 text-forest-700 border-forest-200', icon: CheckCircle },
      referred: { label: 'Referral Sent', color: 'bg-porsche-50 text-porsche-700 border-porsche-200', icon: Send },
      dismissed: { label: 'Dismissed', color: 'bg-titanium-100 text-titanium-600 border-titanium-200', icon: XCircle },
    };
    const badge = badges[actionTaken];
    const Icon = badge.icon;
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${badge.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{badge.label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-titanium-500 uppercase tracking-wider">
        Care Team Action
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAction('ordered')}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {ctaText || 'Order'}
        </button>
        <button
          onClick={() => handleAction('referred')}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-porsche-600 text-white text-sm font-medium hover:bg-porsche-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Refer
        </button>
        <button
          onClick={() => setShowDismissModal(true)}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-titanium-300 text-titanium-600 text-sm font-medium hover:bg-titanium-50 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Not Applicable
        </button>
      </div>

      {/* Dismiss reason modal */}
      {showDismissModal && (
        <div className="mt-2 p-4 bg-titanium-50 border border-titanium-200 rounded-xl space-y-3">
          <div className="text-sm font-medium text-titanium-800">
            Why is this gap not applicable for this patient population?
          </div>
          <textarea
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="e.g., Already addressed in prior visit, Contraindicated for this population, Coding artifact..."
            className="w-full px-3 py-2 text-sm border border-titanium-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-porsche-600 focus:border-transparent"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('dismissed', dismissReason)}
              disabled={!dismissReason.trim() || isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-titanium-700 text-white text-sm font-medium hover:bg-titanium-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Dismiss Gap'}
            </button>
            <button
              onClick={() => { setShowDismissModal(false); setDismissReason(''); }}
              className="px-4 py-1.5 rounded-lg border border-titanium-300 text-titanium-600 text-sm font-medium hover:bg-titanium-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
