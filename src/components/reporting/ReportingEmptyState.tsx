import React from 'react';
import { FileText } from 'lucide-react';

/**
 * ReportingEmptyState - the honest surface for the "reporting" tab.
 *
 * Replaces the former AutomatedReportingSystem + PADReportingSystem simulations: NO fabricated usage
 * metrics ("1247 reports generated", "98.2% delivery", "89 users"), NO mock schedules / templates /
 * history, NO setTimeout generate-and-download, NO Math.random(), NO dead TODO controls.
 *
 * Ported to the demo branch from main (AUDIT-314). The markup is INLINED rather than importing
 * design-system/EmptyState, because the demo branch has neither that component nor the --sem-* CSS
 * variables it styles with; importing it here would render unstyled. Same copy, demo's palette.
 */
const ReportingEmptyState: React.FC = () => (
  <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-sm">
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-titanium-900">Automated Reporting</h2>
      <p className="text-sm text-titanium-600 mt-1">Scheduled report generation and delivery.</p>
    </div>
    <div role="status" className="flex flex-col items-center justify-center text-center py-10 gap-2">
      <FileText className="w-8 h-8 text-titanium-300" aria-hidden />
      <span className="text-base font-medium text-titanium-700">No reports have been generated</span>
      <span className="text-xs text-titanium-500 max-w-sm">
        Scheduled report generation and delivery is not yet available.
      </span>
    </div>
    <p className="text-center text-xs text-titanium-500 mt-2">
      Individual analytics views offer CSV export from their Export button.
    </p>
  </div>
);

export default ReportingEmptyState;
