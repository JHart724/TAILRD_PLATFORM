import React from 'react';
import { Users, BarChart3 } from 'lucide-react';

interface EquityToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  segmentOptions?: string[];
  selectedSegment?: string;
  onSegmentChange?: (segment: string) => void;
}

const EquityToggle: React.FC<EquityToggleProps> = ({
  enabled,
  onToggle,
  segmentOptions = ['race', 'ethnicity', 'age_group', 'sex', 'zip_code', 'insurance_type', 'language'],
  selectedSegment = 'race',
  onSegmentChange
}) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      {/* Toggle Switch */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-slate-600" />
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only"
            />
            <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'transform translate-x-6' : ''}`}></div>
          </div>
          <span className="ml-3 text-sm font-medium text-slate-700">
            {enabled ? 'Equity View Enabled' : 'Enable Equity View'}
          </span>
        </label>
      </div>

      {/* Segment Selector */}
      {enabled && onSegmentChange && (
        <div className="flex items-center gap-3 ml-auto">
          <BarChart3 className="w-4 h-4 text-slate-600" />
          <select
            value={selectedSegment}
            onChange={(e) => onSegmentChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {segmentOptions.map(option => (
              <option key={option} value={option}>
                {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Info Badge */}
      {enabled && (
        <div className="ml-auto">
          <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-xs text-blue-700 font-medium">
              PHI access audited • De-identified exports only
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquityToggle;
