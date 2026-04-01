import { useState, useCallback } from 'react';
import { DATA_SOURCE } from '../config/dataSource';

export type GapActionType = 'ordered' | 'referred' | 'dismissed';

interface UseGapActionsReturn {
  trackGapView: (gapId: string) => void;
  trackGapAction: (gapId: string, action: GapActionType, reason?: string) => Promise<void>;
  gapActions: Record<string, GapActionType>;
}

export function useGapActions(moduleType: string): UseGapActionsReturn {
  const [gapActions, setGapActions] = useState<Record<string, GapActionType>>({});

  const postGapAction = useCallback(async (payload: {
    gapId: string;
    module: string;
    action: string;
    reason?: string;
  }) => {
    if (DATA_SOURCE.demoMode || !DATA_SOURCE.useRealApi) return;

    const response = await fetch(`${DATA_SOURCE.apiUrl}/analytics/gap-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gap action tracking failed: ${response.status}`);
    }
  }, []);

  const trackGapView = useCallback((gapId: string) => {
    postGapAction({ gapId, module: moduleType, action: 'view' }).catch(() => {
      // View tracking failures are silent — don't disrupt the user
    });
  }, [moduleType, postGapAction]);

  const trackGapAction = useCallback(async (
    gapId: string,
    action: GapActionType,
    reason?: string
  ) => {
    try {
      await postGapAction({ gapId, module: moduleType, action, reason });
    } catch {
      if (typeof window !== 'undefined' && (window as any).addToast) {
        (window as any).addToast({
          type: 'error',
          title: 'Tracking Failed',
          message: 'Could not record gap action. Your action was still noted locally.',
          duration: 4000,
        });
      }
    }

    // Always update local state, even if API fails
    setGapActions(prev => ({ ...prev, [gapId]: action }));

    if (typeof window !== 'undefined' && (window as any).addToast) {
      const labels: Record<GapActionType, string> = {
        ordered: 'Order Initiated',
        referred: 'Referral Sent',
        dismissed: 'Gap Dismissed',
      };
      (window as any).addToast({
        type: action === 'dismissed' ? 'info' : 'success',
        title: labels[action],
        message: action === 'dismissed'
          ? `Gap dismissed. Reason: ${reason}`
          : `Action recorded for this care gap.`,
        duration: 4000,
      });
    }
  }, [moduleType, postGapAction]);

  return { trackGapView, trackGapAction, gapActions };
}
