import React from "react";

interface GDMTByPhysicianTableProps {
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

const GDMTByPhysicianTable: React.FC<GDMTByPhysicianTableProps> = ({ data }) => {
  if (!data) return null;

  const getScoreColor = (pct: number): string => {
    if (pct >= 80) return "text-emerald-600 bg-emerald-50";
    if (pct >= 70) return "text-blue-600 bg-blue-50";
    if (pct >= 60) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  return (
    <div <div className="bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead <thead className="bg-white/30 backdrop-blur-sm border-b border-white/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Physician</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Patients</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Quadruple Rx</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Target BB</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">SGLT2i</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">ARNi</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">MRA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((physician, idx) => (
              <tr key={physician.physician_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-slate-900">{physician.physician_name}</div>
                  <div className="text-xs text-slate-500">{physician.physician_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-bold text-slate-700">{physician.patients}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_quadruple)}`}>
                    {physician.pct_quadruple.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_target_bb)}`}>
                    {physician.pct_target_bb.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_sglt2i)}`}>
                    {physician.pct_sglt2i.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_arni)}`}>
                    {physician.pct_arni.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(physician.pct_mra)}`}>
                    {physician.pct_mra.toFixed(1)}%
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

export default GDMTByPhysicianTable;
