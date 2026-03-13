import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Pill, Heart, Droplets } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface EPPatientData {
  age: number;
  weight: number;
  creatinine: number;
  eGFR: number;
  hemoglobin: number;
  plateletCount: number;
  inr: number;
  hasActiveBleeding: boolean;
  hasICHHistory: boolean;
  hasSevereLiverDisease: boolean;
  hasMechanicalValve: boolean;
  hasModerateSevereMitralStenosis: boolean;
  hasGIBleedHistory: boolean;
  hasRecentMajorSurgery: boolean;
  hasAntiPhospholipidSyndrome: boolean;
  isPregnant: boolean;
  concurrentAntiplatelet: boolean;
  concurrentNSAID: boolean;
  hasbledScore: number;
}

interface AnticoagResult {
  drug: string;
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  dosing: { standard: string; reduced: string; criteria: string };
  monitoring: string[];
}

const EPAnticoagulationContraindicationChecker: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [patient, setPatient] = useState<EPPatientData>({
 age: ctx?.age ?? 72, weight: ctx?.weight ?? 78, creatinine: ctx?.creatinine ?? 1.1, eGFR: ctx?.eGFR ?? 65,
 hemoglobin: ctx?.hemoglobin ?? 13.5, plateletCount: ctx?.platelets ?? 220, inr: ctx?.inr ?? 1.0,
 hasActiveBleeding: ctx?.activeBleeding ?? false, hasICHHistory: false,
 hasSevereLiverDisease: ctx?.liverDisease ?? false, hasMechanicalValve: ctx?.mechanicalValve ?? false,
 hasModerateSevereMitralStenosis: false, hasGIBleedHistory: ctx?.bleedingHistory ?? false,
 hasRecentMajorSurgery: false, hasAntiPhospholipidSyndrome: false,
 isPregnant: false, concurrentAntiplatelet: ctx?.onAntiplatelet ?? false,
 concurrentNSAID: false, hasbledScore: ctx?.hasbledScore ?? 2,
  });

  const [activeTab, setActiveTab] = useState<string>('apixaban');

  const checkContraindications = (): AnticoagResult[] => {
 const results: AnticoagResult[] = [];

 // === APIXABAN (Eliquis) ===
 const apixaban: AnticoagResult = {
 drug: 'Apixaban (Eliquis)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 dosing: { standard: '5 mg BID', reduced: '2.5 mg BID', criteria: 'Reduce if \u22652 of: age \u226580, weight \u226460 kg, Cr \u22651.5 mg/dL' },
 monitoring: ['No routine monitoring required', 'Annual renal function', 'CBC if bleeding suspected'],
 };
 if (patient.hasActiveBleeding) { apixaban.status = 'contraindicated'; apixaban.level = 'absolute'; apixaban.reasons.push('Active pathological bleeding'); }
 if (patient.hasSevereLiverDisease) { apixaban.status = 'contraindicated'; apixaban.level = 'absolute'; apixaban.reasons.push('Severe hepatic impairment (Child-Pugh C)'); }
 if (patient.hasMechanicalValve) { apixaban.status = 'contraindicated'; apixaban.level = 'absolute'; apixaban.reasons.push('Mechanical heart valve \u2014 DOACs contraindicated (RE-ALIGN trial)'); apixaban.alternatives.push('Warfarin (target INR per valve type/position)'); }
 if (patient.hasModerateSevereMitralStenosis) { apixaban.status = 'contraindicated'; apixaban.level = 'absolute'; apixaban.reasons.push('Moderate-severe mitral stenosis \u2014 warfarin required'); apixaban.alternatives.push('Warfarin (INR 2.0-3.0)'); }
 if (patient.hasAntiPhospholipidSyndrome) { apixaban.status = 'contraindicated'; apixaban.level = 'absolute'; apixaban.reasons.push('Antiphospholipid syndrome \u2014 DOACs inferior to warfarin (TRAPS trial)'); apixaban.alternatives.push('Warfarin'); }
 if (patient.eGFR < 15) { apixaban.status = 'caution'; apixaban.level = 'relative'; apixaban.reasons.push('eGFR < 15 mL/min \u2014 limited data, use 2.5 mg BID if used'); }
 if (patient.hasICHHistory && apixaban.status === 'safe') { apixaban.status = 'caution'; apixaban.level = 'relative'; apixaban.reasons.push('Prior intracranial hemorrhage \u2014 careful risk/benefit assessment needed'); }
 if (patient.hasGIBleedHistory && apixaban.status === 'safe') { apixaban.status = 'caution'; apixaban.level = 'relative'; apixaban.reasons.push('GI bleed history \u2014 apixaban has lowest GI bleed rate among DOACs (ARISTOTLE)'); }
 if (patient.concurrentAntiplatelet && apixaban.status !== 'contraindicated') { apixaban.status = 'caution'; apixaban.level = 'relative'; apixaban.reasons.push('Concurrent antiplatelet \u2014 increased bleeding risk; minimize triple therapy duration'); }
 // Dose reduction: 2 of 3 criteria (age>=80, weight<=60, Cr>=1.5)
 let doseReductionCount = 0;
 if (patient.age >= 80) doseReductionCount++;
 if (patient.weight <= 60) doseReductionCount++;
 if (patient.creatinine >= 1.5) doseReductionCount++;
 if (doseReductionCount >= 2) {
 apixaban.monitoring.push('Dose reduction criteria met: use 2.5 mg BID');
 }
 results.push(apixaban);

 // === RIVAROXABAN (Xarelto) ===
 const rivaroxaban: AnticoagResult = {
 drug: 'Rivaroxaban (Xarelto)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 dosing: { standard: '20 mg daily with evening meal', reduced: '15 mg daily with evening meal', criteria: 'Reduce to 15 mg if CrCl 15-50 mL/min' },
 monitoring: ['No routine monitoring required', 'Renal function every 6-12 months', 'Must take with food for absorption'],
 };
 if (patient.hasActiveBleeding) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('Active pathological bleeding'); }
 if (patient.hasSevereLiverDisease) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('Severe hepatic impairment with coagulopathy'); }
 if (patient.hasMechanicalValve) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('Mechanical heart valve \u2014 DOACs contraindicated'); rivaroxaban.alternatives.push('Warfarin'); }
 if (patient.hasModerateSevereMitralStenosis) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('Moderate-severe mitral stenosis'); rivaroxaban.alternatives.push('Warfarin'); }
 if (patient.hasAntiPhospholipidSyndrome) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('Antiphospholipid syndrome'); rivaroxaban.alternatives.push('Warfarin'); }
 if (patient.eGFR < 15) { rivaroxaban.status = 'contraindicated'; rivaroxaban.level = 'absolute'; rivaroxaban.reasons.push('eGFR < 15 mL/min \u2014 avoid rivaroxaban'); rivaroxaban.alternatives.push('Apixaban (limited data at low eGFR)'); }
 if (patient.eGFR >= 15 && patient.eGFR <= 50 && rivaroxaban.status === 'safe') { rivaroxaban.status = 'caution'; rivaroxaban.level = 'relative'; rivaroxaban.reasons.push('CrCl 15-50 mL/min \u2014 dose reduction to 15 mg daily required'); }
 if (patient.hasGIBleedHistory && rivaroxaban.status !== 'contraindicated') { rivaroxaban.status = 'caution'; rivaroxaban.level = 'relative'; rivaroxaban.reasons.push('GI bleed history \u2014 rivaroxaban has higher GI bleed rate vs. apixaban (ROCKET AF)'); rivaroxaban.alternatives.push('Consider apixaban for lower GI bleed risk'); }
 if (patient.hasICHHistory && rivaroxaban.status === 'safe') { rivaroxaban.status = 'caution'; rivaroxaban.level = 'relative'; rivaroxaban.reasons.push('Prior intracranial hemorrhage \u2014 careful risk/benefit assessment'); }
 results.push(rivaroxaban);

 // === DABIGATRAN (Pradaxa) ===
 const dabigatran: AnticoagResult = {
 drug: 'Dabigatran (Pradaxa)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 dosing: { standard: '150 mg BID', reduced: '75 mg BID', criteria: 'Reduce to 75 mg BID if CrCl 15-30 mL/min' },
 monitoring: ['No routine monitoring required', 'Renal function every 6-12 months', 'Specific reversal: idarucizumab (Praxbind)'],
 };
 if (patient.hasActiveBleeding) { dabigatran.status = 'contraindicated'; dabigatran.level = 'absolute'; dabigatran.reasons.push('Active pathological bleeding'); }
 if (patient.hasSevereLiverDisease) { dabigatran.status = 'contraindicated'; dabigatran.level = 'absolute'; dabigatran.reasons.push('Severe hepatic impairment'); }
 if (patient.hasMechanicalValve) { dabigatran.status = 'contraindicated'; dabigatran.level = 'absolute'; dabigatran.reasons.push('Mechanical heart valve \u2014 increased thrombosis & bleeding (RE-ALIGN)'); dabigatran.alternatives.push('Warfarin'); }
 if (patient.hasAntiPhospholipidSyndrome) { dabigatran.status = 'contraindicated'; dabigatran.level = 'absolute'; dabigatran.reasons.push('Antiphospholipid syndrome'); dabigatran.alternatives.push('Warfarin'); }
 if (patient.eGFR < 15) { dabigatran.status = 'contraindicated'; dabigatran.level = 'absolute'; dabigatran.reasons.push('eGFR < 15 mL/min \u2014 contraindicated (primarily renally cleared, 80%)'); }
 if (patient.eGFR >= 15 && patient.eGFR <= 30 && dabigatran.status === 'safe') { dabigatran.status = 'caution'; dabigatran.level = 'relative'; dabigatran.reasons.push('CrCl 15-30 mL/min \u2014 dose reduction to 75 mg BID required'); }
 if (patient.hasGIBleedHistory && dabigatran.status !== 'contraindicated') { dabigatran.status = 'caution'; dabigatran.level = 'relative'; dabigatran.reasons.push('GI bleed history \u2014 dabigatran 150mg has higher GI bleed rate (RE-LY); consider apixaban'); }
 if (patient.age >= 80 && dabigatran.status === 'safe') { dabigatran.status = 'caution'; dabigatran.level = 'relative'; dabigatran.reasons.push('Age \u226580 \u2014 European guidelines recommend 110 mg BID (not available in US)'); }
 results.push(dabigatran);

 // === WARFARIN (Coumadin) ===
 const warfarin: AnticoagResult = {
 drug: 'Warfarin (Coumadin)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 dosing: { standard: 'INR target 2.0-3.0 for AF', reduced: 'Consider lower INR 2.0-2.5 if age >75 + high bleed risk', criteria: 'Dose based on INR response; pharmacogenomics may guide initial dosing' },
 monitoring: ['INR at least monthly when stable', 'More frequent INR during initiation, illness, med changes', 'Bridging: stop 5 days pre-procedure, consider LMWH if high stroke risk'],
 };
 if (patient.hasActiveBleeding) { warfarin.status = 'contraindicated'; warfarin.level = 'absolute'; warfarin.reasons.push('Active pathological bleeding'); }
 if (patient.isPregnant) { warfarin.status = 'contraindicated'; warfarin.level = 'absolute'; warfarin.reasons.push('Pregnancy \u2014 teratogenic (warfarin embryopathy in 1st trimester)'); warfarin.alternatives.push('LMWH (enoxaparin)'); }
 if (patient.hasSevereLiverDisease) { warfarin.status = 'caution'; warfarin.level = 'relative'; warfarin.reasons.push('Severe liver disease \u2014 unpredictable INR response, increased bleeding risk'); }
 if (patient.hasICHHistory && warfarin.status === 'safe') { warfarin.status = 'caution'; warfarin.level = 'relative'; warfarin.reasons.push('Prior ICH \u2014 highest recurrence risk with warfarin vs. DOACs'); warfarin.alternatives.push('DOAC (apixaban) may have lower ICH risk'); }
 if (patient.concurrentNSAID && warfarin.status !== 'contraindicated') { warfarin.status = 'caution'; warfarin.level = 'relative'; warfarin.reasons.push('Concurrent NSAID \u2014 synergistic GI bleed risk + INR variability'); }
 if (patient.plateletCount < 50) { warfarin.status = 'caution'; warfarin.level = 'relative'; warfarin.reasons.push('Thrombocytopenia (platelets < 50K) \u2014 increased bleeding risk'); }
 // Warfarin IS indicated for mechanical valves and APS
 if (patient.hasMechanicalValve) { warfarin.monitoring.push('REQUIRED for mechanical valve \u2014 INR target per valve type/position'); }
 if (patient.hasAntiPhospholipidSyndrome) { warfarin.monitoring.push('Preferred agent for antiphospholipid syndrome'); }
 results.push(warfarin);

 return results;
  };

  const results = checkContraindications();
  const drugs = ['apixaban', 'rivaroxaban', 'dabigatran', 'warfarin'];
  const activeResult = results[drugs.indexOf(activeTab)] || results[0];

  const getStatusIcon = (status: string) => {
 switch (status) {
 case 'safe': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
 case 'caution': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
 case 'monitor': return <Clock className="w-5 h-5 text-chrome-400" />;
 case 'contraindicated': return <XCircle className="w-5 h-5 text-red-400" />;
 default: return null;
 }
  };

  const getStatusBg = (status: string) => {
 switch (status) {
 case 'safe': return 'bg-emerald-500 border-emerald-500';
 case 'caution': return 'bg-yellow-500/10 border-yellow-500/30';
 case 'contraindicated': return 'bg-red-500 border-red-500';
 default: return 'bg-white border-titanium-200';
 }
  };

  const getStatusText = (status: string) => {
 switch (status) {
 case 'safe': return 'text-emerald-400';
 case 'caution': return 'text-yellow-400';
 case 'contraindicated': return 'text-red-400';
 default: return 'text-titanium-400';
 }
  };

  const updateField = (field: keyof EPPatientData, value: number | boolean) => {
 setPatient(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="space-y-6">
 <div className="metal-card rounded-2xl p-6 border border-porsche-400/20">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-porsche-400 to-porsche-600 flex items-center justify-center">
 <Shield className="w-5 h-5 text-porsche-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-white font-sf">Anticoagulation Contraindication Checker</h3>
 <p className="text-xs text-titanium-400 font-sf">Evidence-based safety screening for DOAC & warfarin therapy in AF</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Patient Data */}
 <div className="metal-card rounded-2xl p-6 border border-titanium-200 space-y-4">
 <h4 className="text-sm font-semibold text-white font-sf flex items-center gap-2">
 <Heart className="w-4 h-4 text-porsche-400" />
 Patient Data
 </h4>

 <div className="grid grid-cols-2 gap-3">
 {[
 { key: 'age' as const, label: 'Age', unit: 'years', min: 18, max: 100, step: 1 },
 { key: 'weight' as const, label: 'Weight', unit: 'kg', min: 30, max: 200, step: 1 },
 { key: 'creatinine' as const, label: 'Creatinine', unit: 'mg/dL', min: 0.3, max: 10, step: 0.1 },
 { key: 'eGFR' as const, label: 'eGFR', unit: 'mL/min', min: 5, max: 120, step: 1 },
 { key: 'hemoglobin' as const, label: 'Hemoglobin', unit: 'g/dL', min: 5, max: 20, step: 0.1 },
 { key: 'plateletCount' as const, label: 'Platelets', unit: 'K', min: 10, max: 500, step: 5 },
 { key: 'hasbledScore' as const, label: 'HAS-BLED', unit: 'score', min: 0, max: 9, step: 1 },
 ].map(({ key, label, unit, min, max, step }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input
 type="number"
 value={patient[key] as number}
 onChange={(e) => updateField(key, parseFloat(e.target.value) || 0)}
 min={min} max={max} step={step}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none"
 />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>

 <div className="space-y-1.5">
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider">Contraindication Flags</h5>
 {[
 { key: 'hasActiveBleeding' as const, label: 'Active bleeding' },
 { key: 'hasICHHistory' as const, label: 'Prior intracranial hemorrhage' },
 { key: 'hasSevereLiverDisease' as const, label: 'Severe liver disease (Child-Pugh C)' },
 { key: 'hasMechanicalValve' as const, label: 'Mechanical heart valve' },
 { key: 'hasModerateSevereMitralStenosis' as const, label: 'Moderate-severe mitral stenosis' },
 { key: 'hasGIBleedHistory' as const, label: 'GI bleed history' },
 { key: 'hasRecentMajorSurgery' as const, label: 'Recent major surgery' },
 { key: 'hasAntiPhospholipidSyndrome' as const, label: 'Antiphospholipid syndrome' },
 { key: 'isPregnant' as const, label: 'Pregnant' },
 { key: 'concurrentAntiplatelet' as const, label: 'Concurrent antiplatelet therapy' },
 { key: 'concurrentNSAID' as const, label: 'Concurrent NSAID use' },
 ].map(({ key, label }) => (
 <label key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
 patient[key] ? 'bg-red-500 border-red-500' : 'bg-white border-titanium-200 hover:border-titanium-200'
 }`}>
 <input type="checkbox" checked={patient[key] as boolean} onChange={(e) => updateField(key, e.target.checked)} className="w-3.5 h-3.5 accent-red-500" />
 <span className="text-xs text-titanium-300 font-sf">{label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Drug Assessment Results */}
 <div className="space-y-4">
 {/* Drug tabs */}
 <div className="flex gap-1 p-1 bg-white rounded-xl border border-titanium-200">
 {results.map((r, i) => (
 <button
 key={drugs[i]}
 onClick={() => setActiveTab(drugs[i])}
 className={`flex-1 px-2 py-2 rounded-lg text-xs font-sf font-medium transition-all flex items-center justify-center gap-1.5 ${
 activeTab === drugs[i] ? 'bg-porsche-500/20 text-porsche-300 border border-porsche-500/30' : 'text-titanium-400 hover:text-white'
 }`}
 >
 {getStatusIcon(r.status)}
 <span className="hidden sm:inline">{r.drug.split(' ')[0]}</span>
 </button>
 ))}
 </div>

 {/* Active Drug Result */}
 <div className={`metal-card rounded-2xl p-5 border ${getStatusBg(activeResult.status)}`}>
 <div className="flex items-center gap-3 mb-4">
 {getStatusIcon(activeResult.status)}
 <div>
 <h4 className="text-sm font-semibold text-white font-sf">{activeResult.drug}</h4>
 <span className={`text-xs font-semibold uppercase tracking-wider ${getStatusText(activeResult.status)}`}>
 {activeResult.status}{activeResult.level !== 'none' ? ` (${activeResult.level})` : ''}
 </span>
 </div>
 </div>

 {activeResult.reasons.length > 0 && (
 <div className="mb-4">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Findings</h5>
 <ul className="space-y-1">
 {activeResult.reasons.map((r, i) => (
 <li key={i} className="text-xs text-titanium-300 flex items-start gap-2">
 <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
 {r}
 </li>
 ))}
 </ul>
 </div>
 )}

 {activeResult.alternatives.length > 0 && (
 <div className="mb-4">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Alternatives</h5>
 <ul className="space-y-1">
 {activeResult.alternatives.map((a, i) => (
 <li key={i} className="text-xs text-emerald-400 flex items-center gap-2">
 <Pill className="w-3 h-3 flex-shrink-0" /> {a}
 </li>
 ))}
 </ul>
 </div>
 )}

 <div className="mb-4 p-3 rounded-xl bg-white border border-titanium-200">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Dosing</h5>
 <div className="space-y-1 text-xs text-titanium-300">
 <p><span className="text-white font-medium">Standard:</span> {activeResult.dosing.standard}</p>
 <p><span className="text-white font-medium">Reduced:</span> {activeResult.dosing.reduced}</p>
 <p><span className="text-porsche-400 font-medium">Criteria:</span> {activeResult.dosing.criteria}</p>
 </div>
 </div>

 <div>
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Monitoring</h5>
 <ul className="space-y-1">
 {activeResult.monitoring.map((m, i) => (
 <li key={i} className="text-xs text-titanium-300 flex items-center gap-2">
 <Droplets className="w-3 h-3 text-chrome-400 flex-shrink-0" /> {m}
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Overview */}
 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-xs font-semibold text-titanium-400 mb-3 uppercase tracking-wider">All Agents Overview</h4>
 <div className="space-y-2">
 {results.map((r, i) => (
 <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${getStatusBg(r.status)}`}>
 <div className="flex items-center gap-2">
 {getStatusIcon(r.status)}
 <span className="text-xs font-medium text-white font-sf">{r.drug.split(' ')[0]}</span>
 </div>
 <span className={`text-xs font-semibold ${getStatusText(r.status)}`}>{r.status.toUpperCase()}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="metal-card rounded-xl p-3 border border-titanium-200">
 <p className="text-xs text-titanium-500 text-center font-sf">
 Based on 2020 ESC AF Guidelines, 2023 ACC/AHA/ACCP/HRS AF Guideline, RE-LY, ROCKET AF, ARISTOTLE, ENGAGE AF-TIMI 48 trials.
 DOACs contraindicated with mechanical valves (RE-ALIGN) and antiphospholipid syndrome (TRAPS).
 </p>
 </div>
 </div>
  );
};

export default EPAnticoagulationContraindicationChecker;
