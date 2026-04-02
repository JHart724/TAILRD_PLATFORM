import React from "react";
import { toFixed } from '../../../utils/formatters';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface DeviceFunnelProps {
  data: Array<{
 device_type: string;
 eligible: number;
 referred: number;
 completed: number;
 median_days_referral: number;
  }> | null;
}

const DeviceFunnel: React.FC<DeviceFunnelProps> = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
      <ChartEmptyState message="No device eligibility data to display" />
    </div>
  );

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 <div className="space-y-6">
 {data.map((device) => {
 const referralRate = (device.referred / device.eligible) * 100;
 const completionRate = (device.completed / device.referred) * 100;

 return (
 <div key={device.device_type} className="border-b border-titanium-200 pb-6 last:border-0">
 <div className="flex items-center justify-between mb-3">
 <span className="text-sm font-bold text-titanium-900">{device.device_type}</span>
 <span className="text-xs text-titanium-500">~{device.median_days_referral} days to referral</span>
 </div>

 <div className="space-y-2">
 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Eligible</span>
 <span className="font-bold text-titanium-900">{device.eligible}</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-chrome-500 h-full rounded-full" style={{ width: "100%" }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Referred</span>
 <span className="font-bold text-titanium-900">{device.referred} ({toFixed(referralRate, 0)}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-chrome-50 h-full rounded-full" style={{ width: `${referralRate}%` }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Completed</span>
 <span className="font-bold text-titanium-900">{device.completed} ({toFixed(completionRate, 0)}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-chrome-50 h-full rounded-full" style={{ width: `${completionRate}%` }} />
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
  );
};

export default DeviceFunnel;
