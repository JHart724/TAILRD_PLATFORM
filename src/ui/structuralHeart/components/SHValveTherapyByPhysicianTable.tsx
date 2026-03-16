import React from "react";
import { toFixed } from '../../../utils/formatters';

interface SHValveTherapyByPhysicianTableProps {
  data: Array<{
 physician_id: string;
 physician_name: string;
 patients: number;
 pct_quadruple: number;
 pct_target_medical_management: number;
 pct_tavr_referral: number;
 pct_anticoagulation: number;
 pct_diuretics: number;
  }> | null;
}

const SHValveTherapyByPhysicianTable: React.FC<SHValveTherapyByPhysicianTableProps> = ({ data }) => {
  if (!data) return null;

  const getScoreColor = (pct: number): string => {
 if (pct >= 80) return "text-emerald-600 bg-emerald-50";
 if (pct >= 70) return "text-chrome-600 bg-chrome-50";
 if (pct >= 60) return "text-amber-600 bg-amber-50";
 return "text-arterial-600 bg-arterial-50";
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-white border-b border-titanium-200">
 <tr>
 <th className="px-6 py-4 text-left text-xs font-bold text-titanium-700 uppercase tracking-wider">Physician</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Patients</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Quadruple Rx</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Target Medical Management</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">TAVR Referral</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Anticoagulation</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Diuretics</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-titanium-200">
 {data.map((physician, idx) => (
 <tr key={physician.physician_id} className={idx % 2 === 0 ? "bg-white" : "bg-titanium-50"}>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-semibold text-titanium-900">{physician.physician_name}</div>
 <div className="text-xs text-titanium-500">{physician.physician_id}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className="text-sm font-bold text-titanium-700">{physician.patients}</span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_quadruple)}`}>
 {toFixed(physician.pct_quadruple, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_target_medical_management)}`}>
 {toFixed(physician.pct_target_medical_management, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_tavr_referral)}`}>
 {toFixed(physician.pct_tavr_referral, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_anticoagulation)}`}>
 {toFixed(physician.pct_anticoagulation, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_diuretics)}`}>
 {toFixed(physician.pct_diuretics, 1)}%
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
  );
};

export default SHValveTherapyByPhysicianTable;