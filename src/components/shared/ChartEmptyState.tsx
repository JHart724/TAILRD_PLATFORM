import React from 'react';
import { BarChart3 } from 'lucide-react';

interface ChartEmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <div className="mb-4 text-[#8FA8BC]">
      {icon || <BarChart3 className="w-10 h-10" />}
    </div>
    <p className="text-sm text-[#8FA8BC] text-center max-w-xs font-body">
      {message}
    </p>
  </div>
);

export default ChartEmptyState;
