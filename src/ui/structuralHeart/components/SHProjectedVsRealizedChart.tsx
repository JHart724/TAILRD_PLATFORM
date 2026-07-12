import React from 'react';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';
import { SH_DEMO_PVR } from '../config/shDemoFinancials';

interface SHProjectedVsRealizedChartProps {
  onMonthClick?: (monthData: MonthData) => void;
}

// Monthly series comes from the single SH demo financial model (SH_DEMO_PVR), a
// stated slice of the $10.9M annual-opportunity model - the panel's Total Projected /
// Total Realized / Gap are reduced from this series, so they can no longer drift from
// the rest of the tier (AUDIT-304 SH convergence; mirrors the HF/EP exemplar). Was: a
// hand-typed 10-month array whose totals implied a second, contradictory revenue family.
const SHProjectedVsRealizedChart: React.FC<SHProjectedVsRealizedChartProps> = ({ onMonthClick }) => (
  <SharedProjectedVsRealized
    monthlyData={SH_DEMO_PVR.months}
    onMonthClick={onMonthClick}
    gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"
    cleanSurface
  />
);

export default SHProjectedVsRealizedChart;
