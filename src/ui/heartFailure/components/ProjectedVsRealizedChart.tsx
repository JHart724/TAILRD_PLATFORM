import React from 'react';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';
import { HF_DEMO_PVR } from '../config/hfDemoFinancials';

interface ProjectedVsRealizedChartProps {
  onMonthClick?: (monthData: MonthData) => void;
}

// Monthly series comes from the single HF demo financial model (HF_DEMO_PVR), a
// stated slice of the $6.2M annual-opportunity model - the panel's Total Projected /
// Total Realized / Gap are reduced from this series, so they can no longer drift
// from the rest of the tier (HF Exec batch 1 addendum 2). Was: a hand-typed
// 10-month array whose totals implied a second, contradictory revenue family.
const ProjectedVsRealizedChart: React.FC<ProjectedVsRealizedChartProps> = ({ onMonthClick }) => (
  <SharedProjectedVsRealized
    monthlyData={HF_DEMO_PVR.months}
    onMonthClick={onMonthClick}
    gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"
    cleanSurface
  />
);

export default ProjectedVsRealizedChart;
