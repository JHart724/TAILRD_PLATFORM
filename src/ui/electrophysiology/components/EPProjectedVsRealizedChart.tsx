import React from 'react';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';
import { EP_DEMO_PVR } from '../config/epDemoFinancials';

interface EPProjectedVsRealizedChartProps {
  onMonthClick?: (monthData: MonthData) => void;
}

// Monthly series comes from the single EP demo financial model (EP_DEMO_PVR), a
// stated slice of the $8.9M annual-opportunity model - the panel's Total Projected /
// Total Realized / Gap are reduced from this series, so they can no longer drift from
// the rest of the tier (AUDIT-304 EP convergence; mirrors the HF exemplar). Was: a
// hand-typed 10-month array whose totals implied a second, contradictory revenue family.
const EPProjectedVsRealizedChart: React.FC<EPProjectedVsRealizedChartProps> = ({ onMonthClick }) => (
  <SharedProjectedVsRealized
    monthlyData={EP_DEMO_PVR.months}
    onMonthClick={onMonthClick}
    gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"
    cleanSurface
  />
);

export default EPProjectedVsRealizedChart;
