import React from 'react';
import { TrendingUp, Users, Activity, Zap } from 'lucide-react';

// ============================================================
// SAQ OUTCOMES PANEL
// Seattle Angina Questionnaire — CAD/Coronary PRO Tracking
// ============================================================

const SAQOutcomesPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="metal-card p-6">
        <div className="flex items-start gap-3 mb-1">
          <Activity className="w-6 h-6 text-porsche-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">SAQ Outcomes Tracking</h3>
            <p className="text-sm text-titanium-500 mt-0.5">
              Seattle Angina Questionnaire — validated patient-reported outcome,
              Dr. John Spertus (UMKC)
            </p>
            <div className="flex items-center gap-2 mt-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-600 font-medium">Auto-calculated from EHR data &middot; No manual entry required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-titanium-500" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Mean SAQ Angina Frequency Score
            </span>
          </div>
          <div className="text-3xl font-bold text-titanium-900">42.8</div>
          <div className="text-xs text-titanium-500 mt-1">Population average — significant angina burden</div>
        </div>

        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Mean Change — Post-Revascularization
            </span>
          </div>
          <div className="text-3xl font-bold text-teal-700">+28.4 pts</div>
          <div className="text-xs text-titanium-500 mt-1">at 6 months post-procedure</div>
        </div>

        <div className="metal-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-titanium-500" />
            <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">
              Patients with Severe Angina Burden (SAQ &lt;50)
            </span>
          </div>
          <div className="text-3xl font-bold text-titanium-900">167</div>
          <div className="text-xs text-titanium-500 mt-1">patients — revascularization evaluation recommended</div>
        </div>
      </div>

      {/* Supporting context */}
      <div className="metal-card p-6">
        <h4 className="font-semibold text-titanium-800 mb-3">About the SAQ</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-titanium-600">
          <div className="bg-gradient-to-br from-porsche-50 to-porsche-100 p-4 rounded-lg">
            <h5 className="font-semibold text-titanium-800 mb-1">Domains Measured</h5>
            <ul className="space-y-1">
              <li>Angina Frequency (0–100)</li>
              <li>Physical Limitation (0–100)</li>
              <li>Quality of Life (0–100)</li>
              <li>Angina Stability (0–100)</li>
              <li>Treatment Satisfaction (0–100)</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-porsche-50 to-porsche-100 p-4 rounded-lg">
            <h5 className="font-semibold text-titanium-800 mb-1">Clinical Thresholds</h5>
            <ul className="space-y-1">
              <li>Score &ge;75: Minimal/no angina burden</li>
              <li>Score 50–74: Moderate angina burden</li>
              <li>Score &lt;50: Severe angina — consider revascularization</li>
              <li>MCID: +10–12 points = clinically meaningful improvement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SAQOutcomesPanel;
