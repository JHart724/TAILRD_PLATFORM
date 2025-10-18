import React, { useEffect, useState } from "react";
import { hfAPI } from "../../apiClient/hf/hfClient";
import PatientWorklist from "./components/PatientWorklist";
import PersistenceTimeline from "./components/PersistenceTimeline";
import ActionButtons from "./components/ActionButtons";

type WorklistFilter =
  | "all"
  | "hfpef_65_lvh_no_pyp"
  | "ef_le_35_qrs_ge_130_no_crt_ref"
  | "iron_def_no_iv_iron"
  | "gdmt_gaps";

const HFCareWorklists: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WorklistFilter>("gdmt_gaps");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  useEffect(() => {
    const fetchWorklist = async () => {
      setLoading(true);
      try {
        const data = await hfAPI.getWorklist(filter);
        setPatients(data);
      } catch (error) {
        console.error("Failed to load worklist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorklist();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-slate-700">
          Loading Care Team Worklist...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Care Team Worklists
          </h2>
          <p className="text-slate-600">
            Patient actions, referrals, and persistence tracking
          </p>
        </div>

        <div className="flex gap-2">
          {[
            { id: "gdmt_gaps", label: "GDMT Gaps" },
            { id: "hfpef_65_lvh_no_pyp", label: "Amyloid Screening" },
            { id: "ef_le_35_qrs_ge_130_no_crt_ref", label: "CRT Eligible" },
            { id: "iron_def_no_iv_iron", label: "Iron Deficiency" },
            { id: "all", label: "All Patients" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as WorklistFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">
          Patients ({patients.length})
        </h3>
        <PatientWorklist
          patients={patients}
          onSelectPatient={setSelectedPatient}
        />
      </section>

      {selectedPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Action Buttons
            </h3>
            <ActionButtons patient={selectedPatient} />
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Persistence Timeline
            </h3>
            <PersistenceTimeline patientId={selectedPatient.id} />
          </section>
        </div>
      )}
    </div>
  );
};

export default HFCareWorklists;
