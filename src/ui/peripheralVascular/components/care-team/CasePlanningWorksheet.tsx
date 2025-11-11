import React, { useState } from 'react';
import {
  MapPin,
  Route,
  Scissors,
  Stethoscope,
  Activity,
  Target,
  Wrench,
  FileText,
  Check,
  Calendar,
  AlertTriangle,
  Settings,
  Zap,
  Heart
} from 'lucide-react';

interface LesionCharacteristics {
  tascGrade: 'A' | 'B' | 'C' | 'D';
  location: 'Aortoiliac' | 'Femoropopliteal' | 'Infrapopliteal';
  length: number;
  calcification: 'None' | 'Mild' | 'Moderate' | 'Severe';
  cto: boolean;
  multiLevel: boolean;
  bifurcation: boolean;
}

interface EndovascularStrategy {
  approach: 'Antegrade femoral' | 'Retrograde pedal' | 'Brachial' | 'Radial';
  balloon: boolean;
  stentType: 'None' | 'Bare metal' | 'Drug-eluting' | 'Covered';
  atherectomy: boolean;
  atherectomyType?: 'Directional' | 'Rotational' | 'Orbital' | 'Laser';
  embolicProtection: boolean;
}

interface SurgicalStrategy {
  bypassType: 'Aortobifemoral' | 'Axillofemoral' | 'Femoropopliteal' | 'Femorotibial' | 'Other';
  conduit: 'GSV' | 'Arm vein' | 'Prosthetic' | 'Composite';
  inflow: string;
  outflow: string;
  configuration: 'End-to-end' | 'End-to-side' | 'Side-to-side';
}

interface HybridProcedure {
  planned: boolean;
  sequence: 'Endo first' | 'Surgical first' | 'Simultaneous';
  endoComponent: string;
  surgicalComponent: string;
}

interface AntiplateletPlan {
  preop: 'Aspirin only' | 'Dual antiplatelet' | 'Hold antiplatelets' | 'Other';
  intraop: 'Heparin' | 'Bivalirudin' | 'None';
  postop: 'Aspirin only' | 'Dual antiplatelet' | 'Anticoagulation' | 'Other';
  duration: '30 days' | '3 months' | '6 months' | '12 months' | 'Indefinite';
}

interface CasePlan {
  patientId: string;
  lesion: LesionCharacteristics;
  primaryStrategy: 'Endovascular' | 'Surgical' | 'Hybrid' | 'Medical';
  endovascular: EndovascularStrategy;
  surgical: SurgicalStrategy;
  hybrid: HybridProcedure;
  antiplatelet: AntiplateletPlan;
  anesthesia: 'Local' | 'Conscious sedation' | 'General' | 'Spinal/Epidural';
  expectedDuration: number;
  complications: string[];
  alternatives: string[];
  status: 'Planning' | 'Reviewed' | 'Approved' | 'Finalized';
}

const CasePlanningWorksheet: React.FC = () => {
  const [casePlan, setCasePlan] = useState<CasePlan>({
    patientId: 'PV001234',
    lesion: {
      tascGrade: 'B',
      location: 'Femoropopliteal',
      length: 8,
      calcification: 'Moderate',
      cto: false,
      multiLevel: false,
      bifurcation: true
    },
    primaryStrategy: 'Endovascular',
    endovascular: {
      approach: 'Antegrade femoral',
      balloon: true,
      stentType: 'Drug-eluting',
      atherectomy: true,
      atherectomyType: 'Directional',
      embolicProtection: false
    },
    surgical: {
      bypassType: 'Femoropopliteal',
      conduit: 'GSV',
      inflow: 'Common femoral artery',
      outflow: 'Below-knee popliteal artery',
      configuration: 'End-to-side'
    },
    hybrid: {
      planned: false,
      sequence: 'Endo first',
      endoComponent: '',
      surgicalComponent: ''
    },
    antiplatelet: {
      preop: 'Dual antiplatelet',
      intraop: 'Heparin',
      postop: 'Dual antiplatelet',
      duration: '3 months'
    },
    anesthesia: 'Conscious sedation',
    expectedDuration: 120,
    complications: [],
    alternatives: [],
    status: 'Planning'
  });

  const updateLesion = (field: keyof LesionCharacteristics, value: any) => {
    setCasePlan(prev => ({
      ...prev,
      lesion: { ...prev.lesion, [field]: value }
    }));
  };

  const updateEndovascular = (field: keyof EndovascularStrategy, value: any) => {
    setCasePlan(prev => ({
      ...prev,
      endovascular: { ...prev.endovascular, [field]: value }
    }));
  };

  const updateSurgical = (field: keyof SurgicalStrategy, value: any) => {
    setCasePlan(prev => ({
      ...prev,
      surgical: { ...prev.surgical, [field]: value }
    }));
  };

  const updateAntiplatelet = (field: keyof AntiplateletPlan, value: any) => {
    setCasePlan(prev => ({
      ...prev,
      antiplatelet: { ...prev.antiplatelet, [field]: value }
    }));
  };

  const finalizeCasePlan = () => {
    setCasePlan(prev => ({ ...prev, status: 'Finalized' }));
    alert(`Case plan finalized for ${casePlan.patientId}`);
  };

  const getTASCColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-amber-600 bg-amber-100';
      case 'C': return 'text-red-600 bg-red-100';
      case 'D': return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getCalcificationColor = (level: string) => {
    switch (level) {
      case 'None': return 'text-green-600 bg-green-100';
      case 'Mild': return 'text-amber-600 bg-amber-100';
      case 'Moderate': return 'text-red-600 bg-red-100';
      case 'Severe': return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'Endovascular': return 'text-blue-600 bg-blue-100';
      case 'Surgical': return 'text-red-600 bg-red-100';
      case 'Hybrid': return 'text-purple-600 bg-purple-100';
      case 'Medical': return 'text-green-600 bg-green-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-medical-blue-600" />
              Case Planning Worksheet
            </h2>
            <p className="text-steel-600">Patient: {casePlan.patientId} • {casePlan.lesion.location} TASC {casePlan.lesion.tascGrade}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg font-medium ${getStrategyColor(casePlan.primaryStrategy)}`}>
              {casePlan.primaryStrategy}
            </div>
            <button
              onClick={finalizeCasePlan}
              className="px-6 py-3 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Finalize Case Plan
            </button>
          </div>
        </div>
      </div>

      {/* Lesion Characterization */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-500" />
          Lesion Characterization
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">TASC Grade</label>
            <div className="grid grid-cols-4 gap-2">
              {(['A', 'B', 'C', 'D'] as const).map(grade => (
                <button
                  key={grade}
                  onClick={() => updateLesion('tascGrade', grade)}
                  className={`p-3 rounded-lg border font-medium transition-all ${
                    casePlan.lesion.tascGrade === grade
                      ? getTASCColor(grade)
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Location</label>
            <select
              value={casePlan.lesion.location}
              onChange={(e) => updateLesion('location', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            >
              <option value="Aortoiliac">Aortoiliac</option>
              <option value="Femoropopliteal">Femoropopliteal</option>
              <option value="Infrapopliteal">Infrapopliteal</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Length (cm)</label>
            <input
              type="number"
              value={casePlan.lesion.length}
              onChange={(e) => updateLesion('length', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              min="0"
              max="50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Calcification</label>
            <div className="grid grid-cols-2 gap-1">
              {(['None', 'Mild', 'Moderate', 'Severe'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => updateLesion('calcification', level)}
                  className={`p-2 rounded border text-sm font-medium transition-all ${
                    casePlan.lesion.calcification === level
                      ? getCalcificationColor(level)
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Characteristics</label>
            <div className="space-y-2">
              {[
                { key: 'cto', label: 'Chronic Total Occlusion' },
                { key: 'multiLevel', label: 'Multi-level Disease' },
                { key: 'bifurcation', label: 'Bifurcation Involvement' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={casePlan.lesion[key as keyof LesionCharacteristics] as boolean}
                    onChange={(e) => updateLesion(key as keyof LesionCharacteristics, e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  <span className="text-sm text-steel-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Primary Strategy</label>
            <div className="space-y-1">
              {(['Endovascular', 'Surgical', 'Hybrid', 'Medical'] as const).map(strategy => (
                <button
                  key={strategy}
                  onClick={() => setCasePlan(prev => ({ ...prev, primaryStrategy: strategy }))}
                  className={`w-full p-2 rounded border text-sm font-medium transition-all ${
                    casePlan.primaryStrategy === strategy
                      ? getStrategyColor(strategy)
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {strategy}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Strategy Details */}
      {(casePlan.primaryStrategy === 'Endovascular' || casePlan.primaryStrategy === 'Hybrid') && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-500" />
            Endovascular Approach
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Access Approach</label>
              <select
                value={casePlan.endovascular.approach}
                onChange={(e) => updateEndovascular('approach', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="Antegrade femoral">Antegrade femoral</option>
                <option value="Retrograde pedal">Retrograde pedal</option>
                <option value="Brachial">Brachial</option>
                <option value="Radial">Radial</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Stent Type</label>
              <select
                value={casePlan.endovascular.stentType}
                onChange={(e) => updateEndovascular('stentType', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="None">Balloon only</option>
                <option value="Bare metal">Bare metal stent</option>
                <option value="Drug-eluting">Drug-eluting stent</option>
                <option value="Covered">Covered stent</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Atherectomy</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={casePlan.endovascular.atherectomy}
                    onChange={(e) => updateEndovascular('atherectomy', e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  <span className="text-sm text-steel-700">Atherectomy planned</span>
                </label>
                {casePlan.endovascular.atherectomy && (
                  <select
                    value={casePlan.endovascular.atherectomyType || ''}
                    onChange={(e) => updateEndovascular('atherectomyType', e.target.value)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                  >
                    <option value="Directional">Directional</option>
                    <option value="Rotational">Rotational</option>
                    <option value="Orbital">Orbital</option>
                    <option value="Laser">Laser</option>
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Additional Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={casePlan.endovascular.balloon}
                    onChange={(e) => updateEndovascular('balloon', e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  <span className="text-sm text-steel-700">Balloon angioplasty</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={casePlan.endovascular.embolicProtection}
                    onChange={(e) => updateEndovascular('embolicProtection', e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  <span className="text-sm text-steel-700">Embolic protection</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {(casePlan.primaryStrategy === 'Surgical' || casePlan.primaryStrategy === 'Hybrid') && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-red-500" />
            Surgical Approach
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Bypass Type</label>
              <select
                value={casePlan.surgical.bypassType}
                onChange={(e) => updateSurgical('bypassType', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="Aortobifemoral">Aortobifemoral</option>
                <option value="Axillofemoral">Axillofemoral</option>
                <option value="Femoropopliteal">Femoropopliteal</option>
                <option value="Femorotibial">Femorotibial</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Conduit</label>
              <select
                value={casePlan.surgical.conduit}
                onChange={(e) => updateSurgical('conduit', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="GSV">Great saphenous vein</option>
                <option value="Arm vein">Arm vein</option>
                <option value="Prosthetic">Prosthetic</option>
                <option value="Composite">Composite</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Configuration</label>
              <select
                value={casePlan.surgical.configuration}
                onChange={(e) => updateSurgical('configuration', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="End-to-end">End-to-end</option>
                <option value="End-to-side">End-to-side</option>
                <option value="Side-to-side">Side-to-side</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Inflow Target</label>
              <input
                type="text"
                value={casePlan.surgical.inflow}
                onChange={(e) => updateSurgical('inflow', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                placeholder="e.g., Common femoral artery"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Outflow Target</label>
              <input
                type="text"
                value={casePlan.surgical.outflow}
                onChange={(e) => updateSurgical('outflow', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                placeholder="e.g., Below-knee popliteal"
              />
            </div>
          </div>
        </div>
      )}

      {casePlan.primaryStrategy === 'Hybrid' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-500" />
            Hybrid Procedure Planning
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Sequence</label>
              <select
                value={casePlan.hybrid.sequence}
                onChange={(e) => setCasePlan(prev => ({
                  ...prev,
                  hybrid: { ...prev.hybrid, sequence: e.target.value as any }
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="Endo first">Endovascular first</option>
                <option value="Surgical first">Surgical first</option>
                <option value="Simultaneous">Simultaneous</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Endovascular Component</label>
              <input
                type="text"
                value={casePlan.hybrid.endoComponent}
                onChange={(e) => setCasePlan(prev => ({
                  ...prev,
                  hybrid: { ...prev.hybrid, endoComponent: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                placeholder="Describe endo component"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-steel-600 mb-2 block">Surgical Component</label>
              <input
                type="text"
                value={casePlan.hybrid.surgicalComponent}
                onChange={(e) => setCasePlan(prev => ({
                  ...prev,
                  hybrid: { ...prev.hybrid, surgicalComponent: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                placeholder="Describe surgical component"
              />
            </div>
          </div>
        </div>
      )}

      {/* Antiplatelet/Anticoagulation Plan */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          Antiplatelet & Anticoagulation Plan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Pre-operative</label>
            <select
              value={casePlan.antiplatelet.preop}
              onChange={(e) => updateAntiplatelet('preop', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            >
              <option value="Aspirin only">Aspirin only</option>
              <option value="Dual antiplatelet">Dual antiplatelet</option>
              <option value="Hold antiplatelets">Hold antiplatelets</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Intra-operative</label>
            <select
              value={casePlan.antiplatelet.intraop}
              onChange={(e) => updateAntiplatelet('intraop', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            >
              <option value="Heparin">Heparin</option>
              <option value="Bivalirudin">Bivalirudin</option>
              <option value="None">None</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Post-operative</label>
            <select
              value={casePlan.antiplatelet.postop}
              onChange={(e) => updateAntiplatelet('postop', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            >
              <option value="Aspirin only">Aspirin only</option>
              <option value="Dual antiplatelet">Dual antiplatelet</option>
              <option value="Anticoagulation">Anticoagulation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Duration</label>
            <select
              value={casePlan.antiplatelet.duration}
              onChange={(e) => updateAntiplatelet('duration', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            >
              <option value="30 days">30 days</option>
              <option value="3 months">3 months</option>
              <option value="6 months">6 months</option>
              <option value="12 months">12 months</option>
              <option value="Indefinite">Indefinite</option>
            </select>
          </div>
        </div>
      </div>

      {/* Procedure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-steel-600" />
            Procedure Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Anesthesia Type</label>
              <select
                value={casePlan.anesthesia}
                onChange={(e) => setCasePlan(prev => ({ ...prev, anesthesia: e.target.value as any }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="Local">Local anesthesia</option>
                <option value="Conscious sedation">Conscious sedation</option>
                <option value="General">General anesthesia</option>
                <option value="Spinal/Epidural">Spinal/Epidural</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Expected Duration (minutes)</label>
              <input
                type="number"
                value={casePlan.expectedDuration}
                onChange={(e) => setCasePlan(prev => ({ ...prev, expectedDuration: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                min="30"
                max="480"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Risk Assessment
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-steel-600 mb-2">Potential Complications</div>
              <textarea
                value={casePlan.complications.join('\n')}
                onChange={(e) => setCasePlan(prev => ({
                  ...prev,
                  complications: e.target.value.split('\n').filter(Boolean)
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                rows={3}
                placeholder="List potential complications..."
              />
            </div>

            <div>
              <div className="text-sm font-medium text-steel-600 mb-2">Alternative Strategies</div>
              <textarea
                value={casePlan.alternatives.join('\n')}
                onChange={(e) => setCasePlan(prev => ({
                  ...prev,
                  alternatives: e.target.value.split('\n').filter(Boolean)
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                rows={3}
                placeholder="List alternative approaches..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4">Case Plan Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Lesion</div>
            <div className="font-semibold text-steel-800">
              {casePlan.lesion.location} TASC {casePlan.lesion.tascGrade}
            </div>
            <div className="text-xs text-steel-500">{casePlan.lesion.length}cm length</div>
          </div>

          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Strategy</div>
            <div className="font-semibold text-steel-800">{casePlan.primaryStrategy}</div>
            {casePlan.primaryStrategy === 'Endovascular' && (
              <div className="text-xs text-steel-500">{casePlan.endovascular.approach}</div>
            )}
          </div>

          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Duration</div>
            <div className="font-semibold text-steel-800">{casePlan.expectedDuration} min</div>
            <div className="text-xs text-steel-500">{casePlan.anesthesia}</div>
          </div>

          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Status</div>
            <div className="font-semibold text-steel-800 capitalize">{casePlan.status}</div>
            <div className="text-xs text-steel-500">Ready for review</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-steel-600">Plan Completion</div>
            <div className="text-steel-800">All sections completed</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCasePlan(prev => ({ ...prev, status: 'Reviewed' }))}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              Mark Reviewed
            </button>
            <button
              onClick={() => setCasePlan(prev => ({ ...prev, status: 'Approved' }))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Approve Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasePlanningWorksheet;