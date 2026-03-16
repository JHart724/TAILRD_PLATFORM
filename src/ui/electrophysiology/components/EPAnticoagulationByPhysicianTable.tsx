import React from "react";
import { toFixed } from '../../../utils/formatters';

interface EPAnticoagulationByPhysicianTableProps {
  data: Array<{
 physician_id: string;
 physician_name: string;
 patients: number;
 pct_quadruple: number;
 pct_target_bb: number;
 pct_sglt2i: number;
 pct_arni: number;
 pct_mra: number;
  }> | null;
}

const EPAnticoagulationByPhysicianTable: React.FC<EPAnticoagulationByPhysicianTableProps> = ({ data }) => {
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
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Target Rate Control</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Ablation Referral</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">ARNi</th>
 <th className="px-6 py-4 text-center text-xs font-bold text-titanium-700 uppercase tracking-wider">Rhythm Control</th>
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
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_target_bb)}`}>
 {toFixed(physician.pct_target_bb, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_sglt2i)}`}>
 {toFixed(physician.pct_sglt2i, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_arni)}`}>
 {toFixed(physician.pct_arni, 1)}%
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_mra)}`}>
 {toFixed(physician.pct_mra, 1)}%
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

export default EPAnticoagulationByPhysicianTable;