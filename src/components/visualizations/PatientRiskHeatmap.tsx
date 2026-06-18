import React from 'react';
import { EmptyState } from '../../design-system/EmptyState';

// AUDIT-300 P2 (clinical-content leak remediation): removed the fabricated seeded-PRNG
// patient cohort + HF-specific columns/legend/recommendations that rendered module-blind
// on all 6 service-line heatmap tabs. Retained as the seam P4 parameterizes by module
// and wires per-module real data. No clinical claims are authored here.
const PatientRiskHeatmap: React.FC = () => (
  <EmptyState
    title="Patient risk stratification pending data connection"
    description="Module-specific risk stratification will populate once connected to live data."
  />
);

export default PatientRiskHeatmap;
