import React from 'react';
import SharedROIWaterfall, { WaterfallCategory } from '../../../components/shared/SharedROIWaterfall';

interface ROIWaterfallProps {
  data: {
 gdmt_revenue: number;
 devices_revenue: number;
 phenotypes_revenue: number;
 _340b_revenue: number;
 total_revenue: number;
 realized_revenue: number;
  } | null;
  onCategoryClick?: (category: 'GDMT' | 'Devices' | 'Phenotypes' | '340B') => void;
}

const ROIWaterfall: React.FC<ROIWaterfallProps> = ({ data, onCategoryClick }) => {
  if (!data) return null;

  const categories: WaterfallCategory[] = [
 { label: 'GDMT', value: data.gdmt_revenue, color: 'bg-teal-600' },
 { label: 'Devices', value: data.devices_revenue, color: 'bg-arterial-500' },
 { label: 'Phenotypes', value: data.phenotypes_revenue, color: 'bg-porsche-500' },
 { label: '340B', value: data._340b_revenue, color: 'bg-emerald-500' },
  ];

  return (
 <SharedROIWaterfall
 categories={categories}
 totalRevenue={data.total_revenue}
 realizedRevenue={data.realized_revenue}
 onCategoryClick={onCategoryClick ? (label) => onCategoryClick(label as any) : undefined}
 />
  );
};

export default ROIWaterfall;
