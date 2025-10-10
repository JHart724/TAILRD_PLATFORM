import React, { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HFExecutiveDashboard from "./HFExecutiveDashboard";
import HFServiceLineDashboard from "./HFServiceLineDashboard";
import HFCareWorklists from "./HFCareWorklists";

export type HFRole = "Executive" | "Service Line" | "Care Team";

const Icons = {
  ArrowLeft: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
};

const HFModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<HFRole>("Executive");

  const getRoleFromPath = (): HFRole => {
    if (location.pathname.includes("/service-line")) return "Service Line";
    if (location.pathname.includes("/care-team")) return "Care Team";
    return "Executive";
  };

  const currentRole = getRoleFromPath();

  const navigateToRole = (newRole: HFRole) => {
    setRole(newRole);
    if (newRole === "Executive") navigate("/hf/executive");
    if (newRole === "Service Line") navigate("/hf/service-line");
    if (newRole === "Care Team") navigate("/hf/care-team");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/")} className="p-2 rounded-xl bg-white border border-slate-200 hover:shadow-md transition-all">
                <Icons.ArrowLeft />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Heart Failure Module</h1>
                <p className="text-sm text-slate-600">GDMT optimization & phenotype detection</p>
              </div>
            </div>
            <div className="flex gap-2 bg-white rounded-xl p-2 border border-slate-200 shadow-sm">
              {(["Executive", "Service Line", "Care Team"] as HFRole[]).map((r) => (
                <button key={r} onClick={() => navigateToRole(r)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentRole === r ? "bg-blue-500 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Routes>
        <Route path="/executive" element={<HFExecutiveDashboard />} />
        <Route path="/service-line" element={<HFServiceLineDashboard />} />
        <Route path="/care-team" element={<HFCareWorklists />} />
        <Route path="/" element={<HFExecutiveDashboard />} />
      </Routes>
    </div>
  );
};

export default HFModule;
