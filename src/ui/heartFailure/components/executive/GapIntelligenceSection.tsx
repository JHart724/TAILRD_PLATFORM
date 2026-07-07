import React from 'react';
import GapIntelligenceCard from '../../../../components/shared/GapIntelligenceCard';
import type { HFDashboardData } from '../../../../services/api';

/**
 * Clinical Gap Intelligence section for the HF Executive tier (batch 1 addendum 2).
 *
 * With live data: renders GapIntelligenceCard fed from the dashboard contract
 * (totalGaps = summary.totalOpenGaps; per-type breakdown from gapsByType).
 *
 * Loading / offline: the card FRAME still renders with an honest state - a pulse
 * while loading, and "Live gap data unavailable - requires database connection"
 * on error/empty - never a fabricated count and never a silent disappearance
 * (previously the card vanished entirely offline, reading as a missing feature).
 */
interface GapIntelligenceSectionProps {
  dashboard: HFDashboardData | null;
  loading?: boolean;
  /** Accepted for API symmetry with the other wired cards; error and empty both
      render the same honest unavailable state (no fabricated count either way). */
  error?: string | null;
}

const GapIntelligenceSection: React.FC<GapIntelligenceSectionProps> = ({
  dashboard,
  loading = false,
}) => {
  if (dashboard) {
    const s = dashboard.summary;
    return (
      <GapIntelligenceCard
        data={{
          totalGaps: s.totalOpenGaps,
          categories: [
            { name: 'Medication', patients: s.gapsByType['MEDICATION_MISSING'] ?? 0, color: '#2C4A60' },
            { name: 'Safety', patients: s.gapsByType['SAFETY_ALERT'] ?? 0, color: '#9B2438' },
            { name: 'Monitoring', patients: s.gapsByType['MONITORING_OVERDUE'] ?? 0, color: '#4A6880' },
            { name: 'Follow-up', patients: s.gapsByType['FOLLOWUP_OVERDUE'] ?? 0, color: '#C8D4DC' },
          ],
          topGaps: Object.entries(s.gapsByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, patients]) => ({ name: name.replace(/_/g, ' '), patients, opportunity: '-' })),
          safetyAlert: `${s.totalOpenGaps} open gaps across ${s.totalPatients} patients`,
        }}
      />
    );
  }

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <h3 className="text-lg font-semibold text-titanium-900">Clinical Gap Intelligence</h3>
        <p className="text-sm text-titanium-600">Auto-detected therapy gaps by category</p>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="animate-pulse h-24 bg-titanium-100 rounded-xl" />
        ) : (
          <div className="p-6 text-center text-titanium-500 text-sm">
            Live gap data unavailable - requires database connection
          </div>
        )}
      </div>
    </div>
  );
};

export default GapIntelligenceSection;
