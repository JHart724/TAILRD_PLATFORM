import React from 'react';
import { EmptyState } from '../../design-system/EmptyState';

// AUDIT-171 P2 (clinical-content leak remediation): removed the hardcoded HF patient
// cohorts (HFrEF/HFpEF/HFmrEF) that rendered module-blind on all 6 service-line network
// tabs. Retained as the seam P4 parameterizes by module and wires per-module real data.
// No clinical claims are authored here.
const CareTeamNetworkGraph: React.FC = () => (
  <EmptyState
    title="Care team network pending data connection"
    description="Module-specific care-team network will populate once connected to live data."
  />
);

export default CareTeamNetworkGraph;
