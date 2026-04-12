// Backend endpoints required for full functionality — see PHASE_4_BACKLOG.md Sprint B PR-C
// Needs: GET /api/referrals (CrossReferral model), GET /api/patients/:id (clinical detail)
import React, { useEffect, useState } from 'react';
import { ArrowRight, Users, Heart } from 'lucide-react';
import { getHeartFailureDashboard, type HFDashboardData } from '../../../../services/api';

const ReferralTrackerEnhanced: React.FC = () => {
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHeartFailureDashboard()
      .then(data => { if (!cancelled) setDashboard(data); })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const referralGapCount = dashboard?.summary?.gapsByType?.['REFERRAL_NEEDED'] ?? 0;

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ArrowRight className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-titanium-900">Referral Management</h3>
              <p className="text-sm text-titanium-500">Cross-specialty referral tracking</p>
            </div>
          </div>
          {referralGapCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              {referralGapCount} referrals needed
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => <div key={i} className="h-20 bg-titanium-100 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Failed to load referral data: {error}
          </div>
        ) : referralGapCount > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-700">{referralGapCount}</div>
                <div className="text-xs text-amber-600 mt-1">Referrals Needed</div>
              </div>
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-700">—</div>
                <div className="text-xs text-titanium-500 mt-1">Pending</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-700">—</div>
                <div className="text-xs text-green-600 mt-1">Completed</div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Users className="w-8 h-8 mb-2 text-titanium-300" />
              <div className="text-sm font-medium">EHR Integration Required</div>
              <div className="text-xs mt-1">Referral details, insurance status, and cost tracking require live EHR data via Redox integration</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Heart className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">No Pending Referrals</div>
            <div className="text-xs mt-1">No REFERRAL_NEEDED therapy gaps detected</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralTrackerEnhanced;
