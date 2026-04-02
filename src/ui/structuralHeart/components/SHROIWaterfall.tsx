import React from 'react';
import SharedROIWaterfall, { WaterfallCategory } from '../../../components/shared/SharedROIWaterfall';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface SHROIWaterfallProps {
  data: {
 valveTherapy_revenue: number;
 procedures_revenue: number;
 phenotypes_revenue: number;
 _340b_revenue: number;
 total_revenue: number;
 realized_revenue: number;
  } | null;
  onCategoryClick?: (category: 'Valve Therapy' | 'Procedures' | 'Phenotypes' | '340B') => void;
}

const SHROIWaterfall: React.FC<SHROIWaterfallProps> = ({ data, onCategoryClick }) => {
  if (!data) return (
    <div className="bg-white rounded-2xl border border-titanium-200 shadow-metal-2 p-8">
      <ChartEmptyState message="No structural heart revenue opportunity data available" />
    </div>
  );

  const categories: WaterfallCategory[] = [
 { label: 'Valve Therapy', value: data.valveTherapy_revenue, color: 'bg-titanium-300' },
 { label: 'Procedures', value: data.procedures_revenue, color: 'bg-arterial-500' },
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

export default SHROIWaterfall;
