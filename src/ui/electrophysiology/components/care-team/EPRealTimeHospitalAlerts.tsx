import React from 'react';
import { EmptyState } from '../../../../design-system/EmptyState';

// AUDIT-171 P2 (clinical-content leak remediation): the prior panel body rendered
// Heart-Failure GDMT 4-pillar content framed as AF therapy (clinically false). Body
// removed and replaced with the canonical EmptyState until module-appropriate EP
// real-time alerts + real data are built (P4). No clinical claims are authored here.
const EPRealTimeHospitalAlerts: React.FC = () => (
  <EmptyState
    title="Real-time alerts not yet available for this module"
    description="Electrophysiology hospital alerts are pending a data connection."
  />
);

export default EPRealTimeHospitalAlerts;
