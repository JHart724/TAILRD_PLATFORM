import React from 'react';
import { FileText } from 'lucide-react';
import { EmptyState } from '../../design-system/EmptyState';

/**
 * ReportingEmptyState - the honest surface for the "reporting" tab on the ServiceLine and
 * CareTeam tiers. Replaces the former AutomatedReportingSystem + PADReportingSystem simulations
 * (AUDIT-314): NO fabricated usage metrics, NO mock schedules / templates / history, NO
 * setTimeout generate-and-download, NO Math.random(), NO dead TODO controls, NO network call.
 *
 * Automated report generation, scheduling, and delivery is a real product capability that has no
 * backend yet (the build is tracked as AUDIT-318). Until it exists this states that plainly, with
 * no imminence ("coming soon") and no paywall framing. Real per-view CSV export is unaffected and
 * lives on each analytics view's Export button - the closing line points users to it so this reads
 * as "the reporting SYSTEM is not built" rather than "you cannot export data".
 */
const ReportingEmptyState: React.FC = () => (
  <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-sm">
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-titanium-900">Automated Reporting</h2>
      <p className="text-sm text-titanium-600 mt-1">Scheduled report generation and delivery.</p>
    </div>
    <EmptyState
      size="lg"
      icon={<FileText className="w-8 h-8" />}
      title="No reports have been generated"
      description="Scheduled report generation and delivery is not yet available."
    />
    <p className="text-center text-xs text-titanium-500 mt-2">
      Individual analytics views offer CSV export from their Export button.
    </p>
  </div>
);

export default ReportingEmptyState;
