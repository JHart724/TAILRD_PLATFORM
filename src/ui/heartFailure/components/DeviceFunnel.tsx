import React from "react";

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
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
      <div className="space-y-6">
        {data.map((device) => {
          const referralRate = (device.referred / device.eligible) * 100;
          const completionRate = (device.completed / device.referred) * 100;

          return (
            <div key={device.device_type} className="border-b border-slate-200 pb-6 last:border-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">{device.device_type}</span>
                <span className="text-xs text-slate-500">~{device.median_days_referral} days to referral</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Eligible</span>
                    <span className="font-bold text-slate-900">{device.eligible}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Referred</span>
                    <span className="font-bold text-slate-900">{device.referred} ({referralRate.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${referralRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-bold text-slate-900">{device.completed} ({completionRate.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
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
