import React from "react";
import { toFixed } from '../../../utils/formatters';

interface SHProcedureFunnelProps {
  data: Array<{
 procedure_type: string;
 eligible: number;
 referred: number;
 completed: number;
 median_days_referral: number;
  }> | null;
}

const SHProcedureFunnel: React.FC<SHProcedureFunnelProps> = ({ data }) => {
  if (!data) return null;

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 <div className="space-y-6">
 {data.map((procedure) => {
 const referralRate = (procedure.referred / procedure.eligible) * 100;
 const completionRate = (procedure.completed / procedure.referred) * 100;

 return (
 <div key={procedure.procedure_type} className="border-b border-titanium-200 pb-6 last:border-0">
 <div className="flex items-center justify-between mb-3">
 <span className="text-sm font-bold text-titanium-900">{procedure.procedure_type}</span>
 <span className="text-xs text-titanium-500">~{procedure.median_days_referral} days to referral</span>
 </div>

 <div className="space-y-2">
 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Eligible</span>
 <span className="font-bold text-titanium-900">{procedure.eligible}</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-chrome-500 h-full rounded-full" style={{ width: "100%" }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Referred</span>
 <span className="font-bold text-titanium-900">{procedure.referred} ({toFixed(referralRate, 0)}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-[#F0F5FA] h-full rounded-full" style={{ width: `${referralRate}%` }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-titanium-600">Completed</span>
 <span className="font-bold text-titanium-900">{procedure.completed} ({toFixed(completionRate, 0)}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-[#F0F5FA] h-full rounded-full" style={{ width: `${completionRate}%` }} />
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

export default SHProcedureFunnel;