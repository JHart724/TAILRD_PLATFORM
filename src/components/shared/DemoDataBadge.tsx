import React from 'react';
import { Zap } from 'lucide-react';

/**
 * Canonical honesty badge for cards whose data has no backend source yet
 * (the KCCQ-card pattern). Renders a small blue pill so a mock-fed surface
 * is never mistaken for live data (HF Exec batch 1; AUDIT-303 class).
 */
interface DemoDataBadgeProps {
  label?: string;
  className?: string;
}

const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({
  label = 'Demo data - EHR integration pending',
  className = '',
}) => (
  <div className={`flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 flex-shrink-0 ${className}`}>
    <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
    <span className="text-xs text-blue-700 font-medium">{label}</span>
  </div>
);

export default DemoDataBadge;
