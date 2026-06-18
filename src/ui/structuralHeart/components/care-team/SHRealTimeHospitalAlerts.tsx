import React from 'react';
import { EmptyState } from '../../../../design-system/EmptyState';

// AUDIT-171 P2 (clinical-content leak remediation): the prior panel body rendered
// Heart-Failure GDMT content framed as valve therapy (clinically false). Body removed
// and replaced with the canonical EmptyState until module-appropriate Structural Heart
// real-time alerts + real data are built (P4). No clinical claims are authored here.
const SHRealTimeHospitalAlerts: React.FC = () => (
  <EmptyState
    title="Real-time alerts not yet available for this module"
    description="Structural Heart hospital alerts are pending a data connection."
  />
);

export default SHRealTimeHospitalAlerts;
