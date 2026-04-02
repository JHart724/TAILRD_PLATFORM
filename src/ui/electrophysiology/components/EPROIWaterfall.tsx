import React from 'react';
import SharedROIWaterfall, { WaterfallCategory } from '../../../components/shared/SharedROIWaterfall';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface EPROIWaterfallProps {
  data: {
 gdmt_revenue: number;
 devices_revenue: number;
 phenotypes_revenue: number;
 _340b_revenue: number;
 total_revenue: number;
 realized_revenue: number;
  } | null;
  onCategoryClick?: (category: 'Ablation Therapy' | 'Devices' | 'Phenotypes' | '340B') => void;
}

const EPROIWaterfall: React.FC<EPROIWaterfallProps> = ({ data, onCategoryClick }) => {
  if (!data) return (
    <div className="bg-white rounded-2xl border border-titanium-200 shadow-metal-2 p-8">
      <ChartEmptyState message="No electrophysiology revenue opportunity data available" />
    </div>
  );

  const categories: WaterfallCategory[] = [
 { label: 'Ablation Therapy', value: data.gdmt_revenue, color: 'bg-titanium-300' },
 { label: 'Devices', value: data.devices_revenue, color: 'bg-arterial-500' },
 { label: 'Phenotypes', value: data.phenotypes_revenue, color: 'bg-porsche-500' },
 { label: '340B', value: data._340b_revenue, color: 'bg-chrome-50' },
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

export default EPROIWaterfall;
