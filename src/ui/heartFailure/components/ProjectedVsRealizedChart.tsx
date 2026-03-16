import React from 'react';
import SharedProjectedVsRealized, { MonthData } from '../../../components/shared/SharedProjectedVsRealized';

interface ProjectedVsRealizedChartProps {
  onMonthClick?: (monthData: MonthData) => void;
}

const hfMonthlyData: MonthData[] = [
  { month: 'Jan', projected: 850000, realized: 520000 },
  { month: 'Feb', projected: 920000, realized: 610000 },
  { month: 'Mar', projected: 1050000, realized: 720000 },
  { month: 'Apr', projected: 980000, realized: 680000 },
  { month: 'May', projected: 1120000, realized: 810000 },
  { month: 'Jun', projected: 1200000, realized: 890000 },
  { month: 'Jul', projected: 1150000, realized: 850000 },
  { month: 'Aug', projected: 1280000, realized: 950000 },
  { month: 'Sep', projected: 1350000, realized: 980000 },
  { month: 'Oct', projected: 1400000, realized: 1050000 },
];

const ProjectedVsRealizedChart: React.FC<ProjectedVsRealizedChartProps> = ({ onMonthClick }) => (
  <SharedProjectedVsRealized
 monthlyData={hfMonthlyData}
 onMonthClick={onMonthClick}
  />
);

export default ProjectedVsRealizedChart;
