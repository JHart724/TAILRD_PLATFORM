import React from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import DotScale from '../../../design-system/DotScale';
import { BenchmarkPosition } from '../types';

interface BenchmarkPositioningProps {
  hasUploadedFiles: boolean;
  positions: BenchmarkPosition[];
}

const BenchmarkPositioning: React.FC<BenchmarkPositioningProps> = ({
  hasUploadedFiles,
  positions,
}) => {
  return (
    <SectionCard
      title="Benchmark Positioning"
      subtitle="Your Performance vs. National Standards"
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="space-y-6">
        {positions.map((pos, index) => (
          <DotScale
            key={index}
            label={pos.metric}
            value={pos.value}
            min={pos.min}
            max={pos.max}
            nationalAvg={pos.nationalAvg}
            unit={pos.unit}
            lowerIsBetter={pos.lowerIsBetter}
          />
        ))}
      </div>
    </SectionCard>
  );
};

export default BenchmarkPositioning;
