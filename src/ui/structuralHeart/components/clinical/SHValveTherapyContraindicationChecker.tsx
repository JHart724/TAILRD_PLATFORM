import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Heart, Zap, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface SHPatientData {
  age: number;
  bmi: number;
  stsScore: number;
  euroScore: number;
  lvef: number;
  frailtyIndex: number;
  hasPortalHTN: boolean;
  hasSevereRenalDisease: boolean;
  hasActiveEndocarditis: boolean;
  hasSeverePulmonaryHTN: boolean;
  hasLifeExpectancyLessThan1Year: boolean;
  hasBicuspidValve: boolean;
  hasSevereAnnularCalcification: boolean;
  hasAdequateVascularAccess: boolean;
  hasSevereMitralAnnularCalcification: boolean;
  hasSevereMR: boolean;
  hasMitralStenosis: boolean;
  priorCardiacSurgery: boolean;
  hemodynamicInstability: boolean;
  hasLVThrombus: boolean;
  hasLAAThrombus: boolean;
  saphenousVeinAvailable: boolean;
}

interface ContraindicationResult {
  therapy: string;
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  considerations: string;
}

const SHValveTherapyContraindicationChecker: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [patient, setPatient] = useState<SHPatientData>({
 age: ctx?.age ?? 78, bmi: ctx?.bmi ?? 26, stsScore: ctx?.stsScore ?? 5.2, euroScore: ctx?.euroScore ?? 4.8,
 lvef: ctx?.lvef ?? 45, frailtyIndex: ctx?.frailtyIndex ?? 3,
 hasPortalHTN: false, hasSevereRenalDisease: ctx?.dialysis ?? false,
 hasActiveEndocarditis: ctx?.activeEndocarditis ?? false, hasSeverePulmonaryHTN: false,
 hasLifeExpectancyLessThan1Year: false, hasBicuspidValve: false,
 hasSevereAnnularCalcification: false, hasAdequateVascularAccess: true,
 hasSevereMitralAnnularCalcification: false, hasSevereMR: false,
 hasMitralStenosis: false, priorCardiacSurgery: ctx?.priorCardiacSurgery ?? false,
 hemodynamicInstability: false, hasLVThrombus: false,
 hasLAAThrombus: false, saphenousVeinAvailable: true,
  });

  const checkContraindications = (): ContraindicationResult[] => {
 const results: ContraindicationResult[] = [];

 // === TAVR ===
 const tavr: ContraindicationResult = {
 therapy: 'TAVR (Transcatheter Aortic Valve Replacement)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 monitoring: ['Post-procedure ECG monitoring for conduction disturbance', 'Echocardiogram at 30 days, 1 year, then annually', 'Assess paravalvular regurgitation'],
 considerations: '',
 };
 if (patient.hasActiveEndocarditis) { tavr.status = 'contraindicated'; tavr.level = 'absolute'; tavr.reasons.push('Active endocarditis \u2014 high risk of prosthetic valve infection'); tavr.alternatives.push('Medical treatment of endocarditis first, then reassess'); }
 if (patient.hasLifeExpectancyLessThan1Year) { tavr.status = 'contraindicated'; tavr.level = 'absolute'; tavr.reasons.push('Life expectancy < 1 year from non-cardiac causes \u2014 unlikely to benefit'); tavr.alternatives.push('Medical management / palliative care'); }
 if (patient.hasLVThrombus) { tavr.status = 'contraindicated'; tavr.level = 'absolute'; tavr.reasons.push('LV thrombus \u2014 risk of embolization during catheter manipulation'); tavr.alternatives.push('Anticoagulate and reassess; SAVR if thrombus persists'); }
 if (!patient.hasAdequateVascularAccess && tavr.status === 'safe') { tavr.status = 'caution'; tavr.level = 'relative'; tavr.reasons.push('Inadequate transfemoral vascular access \u2014 consider alternative access'); tavr.alternatives.push('Transaxillary/subclavian access', 'Transcaval access', 'Transapical (less favorable outcomes)'); }
 if (patient.hasBicuspidValve && tavr.status !== 'contraindicated') { tavr.status = 'caution'; tavr.level = 'relative'; tavr.reasons.push('Bicuspid aortic valve \u2014 expanding indications, but higher risk of paravalvular leak and elliptical deployment'); tavr.monitoring.push('CT-guided sizing critical for bicuspid morphology'); }
 if (patient.hasSevereAnnularCalcification && tavr.status !== 'contraindicated') { tavr.status = 'caution'; tavr.level = 'relative'; tavr.reasons.push('Severe annular calcification \u2014 higher risk of conduction disturbance and annular rupture'); tavr.monitoring.push('Pre-procedural CT assessment of calcium distribution', 'Pacemaker standby recommended'); }
 if (patient.stsScore < 3 && patient.age < 65 && tavr.status === 'safe') { tavr.considerations = 'Low surgical risk + age < 65: SAVR may be preferred for valve durability (2020 ACC/AHA Class I for SAVR)'; }
 if (patient.hemodynamicInstability && tavr.status !== 'contraindicated') { tavr.status = 'caution'; tavr.level = 'relative'; tavr.reasons.push('Hemodynamic instability \u2014 consider balloon valvuloplasty as bridge'); }
 results.push(tavr);

 // === SAVR ===
 const savr: ContraindicationResult = {
 therapy: 'SAVR (Surgical Aortic Valve Replacement)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 monitoring: ['Post-op ICU monitoring', 'Echocardiogram before discharge', 'Sternal wound assessment', 'INR monitoring if mechanical valve'],
 considerations: '',
 };
 if (patient.stsScore > 8 || patient.euroScore > 8) { savr.status = 'caution'; savr.level = 'relative'; savr.reasons.push(`High surgical risk (STS ${patient.stsScore}%, EuroSCORE ${patient.euroScore}%) \u2014 TAVR preferred if suitable`); savr.alternatives.push('TAVR'); }
 if (patient.stsScore > 15) { savr.status = 'contraindicated'; savr.level = 'absolute'; savr.reasons.push('Prohibitive surgical risk (STS > 15%)'); savr.alternatives.push('TAVR if anatomically feasible', 'Medical/palliative management'); }
 if (patient.hasLifeExpectancyLessThan1Year) { savr.status = 'contraindicated'; savr.level = 'absolute'; savr.reasons.push('Life expectancy < 1 year'); savr.alternatives.push('Medical management'); }
 if (patient.frailtyIndex >= 5 && savr.status !== 'contraindicated') { savr.status = 'caution'; savr.level = 'relative'; savr.reasons.push('Significant frailty (index \u2265 5) \u2014 high perioperative risk'); savr.alternatives.push('TAVR if suitable anatomy'); }
 if (patient.priorCardiacSurgery && savr.status !== 'contraindicated') { savr.status = 'caution'; savr.level = 'relative'; savr.reasons.push('Redo sternotomy \u2014 increased surgical risk'); savr.monitoring.push('Pre-op CT chest for sternal adhesions and graft proximity'); savr.alternatives.push('TAVR valve-in-valve if prior bioprosthetic'); }
 if (patient.hasSevereRenalDisease && savr.status !== 'contraindicated') { savr.status = 'caution'; savr.level = 'relative'; savr.reasons.push('Severe renal disease \u2014 increased perioperative morbidity'); }
 if (patient.hasPortalHTN && savr.status !== 'contraindicated') { savr.status = 'caution'; savr.level = 'relative'; savr.reasons.push('Portal hypertension \u2014 coagulopathy and hemodynamic instability risk'); }
 results.push(savr);

 // === MitraClip (TEER) ===
 const teer: ContraindicationResult = {
 therapy: 'MitraClip / TEER (Transcatheter Edge-to-Edge Repair)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 monitoring: ['Post-procedure TEE to assess residual MR and clip position', 'Echocardiogram at 30 days, 6 months, 1 year', 'Monitor for mitral stenosis (mean gradient > 5 mmHg)'],
 considerations: '',
 };
 if (!patient.hasSevereMR) { teer.status = 'contraindicated'; teer.level = 'absolute'; teer.reasons.push('TEER only indicated for severe mitral regurgitation (\u2265 3+ MR)'); teer.alternatives.push('Medical management if MR < severe'); }
 if (patient.hasActiveEndocarditis) { teer.status = 'contraindicated'; teer.level = 'absolute'; teer.reasons.push('Active endocarditis \u2014 infection risk'); }
 if (patient.hasMitralStenosis) { teer.status = 'contraindicated'; teer.level = 'absolute'; teer.reasons.push('Co-existing mitral stenosis \u2014 TEER will worsen stenosis'); teer.alternatives.push('Surgical mitral valve replacement'); }
 if (patient.hasLAAThrombus) { teer.status = 'contraindicated'; teer.level = 'absolute'; teer.reasons.push('LAA thrombus \u2014 risk of embolization during trans-septal puncture'); teer.alternatives.push('Anticoagulate 4-6 weeks, repeat TEE, then reassess'); }
 if (patient.lvef < 20 && teer.status !== 'contraindicated') { teer.status = 'caution'; teer.level = 'relative'; teer.reasons.push('LVEF < 20% \u2014 limited benefit; consider LVAD or transplant evaluation'); teer.alternatives.push('Heart failure optimization', 'LVAD/transplant evaluation'); }
 if (patient.hasSeverePulmonaryHTN && teer.status !== 'contraindicated') { teer.status = 'caution'; teer.level = 'relative'; teer.reasons.push('Severe pulmonary hypertension \u2014 procedural risk elevated'); }
 if (patient.hasSevereMitralAnnularCalcification && teer.status !== 'contraindicated') { teer.status = 'caution'; teer.level = 'relative'; teer.reasons.push('Severe mitral annular calcification \u2014 may affect clip deployment and grasping'); }
 teer.considerations = 'COAPT trial: TEER beneficial in functional MR with LVEF 20-50%, LVEDV < 7 cm, MR EROA \u2265 30 mm\u00B2. MITRA-FR: no benefit in very dilated LV.';
 results.push(teer);

 // === Balloon Aortic Valvuloplasty ===
 const bav: ContraindicationResult = {
 therapy: 'Balloon Aortic Valvuloplasty (BAV)',
 status: 'safe', level: 'none', reasons: [], alternatives: [],
 monitoring: ['Hemodynamic assessment immediately post-procedure', 'Echocardiogram to assess gradient reduction', 'Plan definitive therapy within 30 days'],
 considerations: 'BAV is a bridge procedure \u2014 not definitive therapy. Restenosis occurs in 6-12 months. Used as bridge to TAVR/SAVR or for hemodynamic stabilization.',
 };
 if (patient.hasActiveEndocarditis) { bav.status = 'contraindicated'; bav.level = 'absolute'; bav.reasons.push('Active endocarditis'); }
 if (patient.hasLVThrombus) { bav.status = 'contraindicated'; bav.level = 'absolute'; bav.reasons.push('LV thrombus \u2014 embolization risk'); }
 if (patient.lvef < 20 && bav.status !== 'contraindicated') { bav.status = 'caution'; bav.level = 'relative'; bav.reasons.push('LVEF < 20% \u2014 risk of acute aortic regurgitation with hemodynamic compromise'); }
 if (patient.hasSevereAnnularCalcification && bav.status !== 'contraindicated') { bav.status = 'caution'; bav.level = 'relative'; bav.reasons.push('Severe calcification \u2014 limited balloon expansion, short-lived benefit'); }
 results.push(bav);

 return results;
  };

  const results = checkContraindications();
  const [activeTab, setActiveTab] = useState(0);
  const activeResult = results[activeTab];

  const getStatusIcon = (status: string) => {
 switch (status) {
 case 'safe': return <CheckCircle className="w-5 h-5 text-[#2C4A60]" />;
 case 'caution': return <AlertTriangle className="w-5 h-5 text-[#6B7280]" />;
 case 'monitor': return <Clock className="w-5 h-5 text-chrome-400" />;
 case 'contraindicated': return <XCircle className="w-5 h-5 text-red-400" />;
 default: return null;
 }
  };

  const getStatusBg = (status: string) => {
 switch (status) {
 case 'safe': return 'bg-[#F0F5FA] border-[#C8D4DC]';
 case 'caution': return 'bg-[#F0F5FA]/10 border-[#C8D4DC]/30';
 case 'contraindicated': return 'bg-red-500 border-red-500';
 default: return 'bg-white border-titanium-200';
 }
  };

  const getStatusText = (status: string) => {
 switch (status) {
 case 'safe': return 'text-[#2C4A60]';
 case 'caution': return 'text-[#6B7280]';
 case 'contraindicated': return 'text-red-400';
 default: return 'text-titanium-400';
 }
  };

  const updateField = (field: keyof SHPatientData, value: number | boolean) => {
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
 <h3 className="text-lg font-semibold text-white font-sf">Structural Heart Therapy Contraindication Checker</h3>
 <p className="text-xs text-titanium-400 font-sf">TAVR, SAVR, MitraClip/TEER & BAV Safety Screening</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Patient Data */}
 <div className="metal-card rounded-2xl p-6 border border-titanium-200 space-y-4">
 <h4 className="text-sm font-semibold text-white font-sf flex items-center gap-2">
 <Heart className="w-4 h-4 text-porsche-400" /> Patient Data
 </h4>

 <div className="grid grid-cols-2 gap-3">
 {[
 { key: 'age' as const, label: 'Age', unit: 'yrs', min: 18, max: 100 },
 { key: 'bmi' as const, label: 'BMI', unit: 'kg/m\u00B2', min: 15, max: 60 },
 { key: 'stsScore' as const, label: 'STS Score', unit: '%', min: 0, max: 50 },
 { key: 'euroScore' as const, label: 'EuroSCORE II', unit: '%', min: 0, max: 50 },
 { key: 'lvef' as const, label: 'LVEF', unit: '%', min: 5, max: 75 },
 { key: 'frailtyIndex' as const, label: 'Frailty Index', unit: '/10', min: 0, max: 10 },
 ].map(({ key, label, unit, min, max }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input type="number" value={patient[key] as number}
 onChange={(e) => updateField(key, parseFloat(e.target.value) || 0)}
 min={min} max={max} step={0.1}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none" />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>

 <div className="space-y-1.5">
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider">Clinical Flags</h5>
 {[
 { key: 'hasActiveEndocarditis' as const, label: 'Active endocarditis' },
 { key: 'hasLifeExpectancyLessThan1Year' as const, label: 'Life expectancy < 1 year (non-cardiac)' },
 { key: 'hasLVThrombus' as const, label: 'LV thrombus' },
 { key: 'hasLAAThrombus' as const, label: 'LA appendage thrombus' },
 { key: 'hasBicuspidValve' as const, label: 'Bicuspid aortic valve' },
 { key: 'hasSevereAnnularCalcification' as const, label: 'Severe annular calcification' },
 { key: 'hasAdequateVascularAccess' as const, label: 'Adequate transfemoral vascular access' },
 { key: 'hasSevereMR' as const, label: 'Severe mitral regurgitation (\u2265 3+)' },
 { key: 'hasMitralStenosis' as const, label: 'Co-existing mitral stenosis' },
 { key: 'hasSevereMitralAnnularCalcification' as const, label: 'Severe mitral annular calcification' },
 { key: 'hasSeverePulmonaryHTN' as const, label: 'Severe pulmonary hypertension' },
 { key: 'hasSevereRenalDisease' as const, label: 'Severe renal disease' },
 { key: 'hasPortalHTN' as const, label: 'Portal hypertension' },
 { key: 'priorCardiacSurgery' as const, label: 'Prior cardiac surgery (redo)' },
 { key: 'hemodynamicInstability' as const, label: 'Hemodynamic instability' },
 ].map(({ key, label }) => (
 <label key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
 patient[key] ? (key === 'hasAdequateVascularAccess' ? 'bg-[#F0F5FA] border-[#C8D4DC]' : 'bg-red-500 border-red-500') : 'bg-white border-titanium-200 hover:border-titanium-200'
 }`}>
 <input type="checkbox" checked={patient[key] as boolean} onChange={(e) => updateField(key, e.target.checked)} className="w-3.5 h-3.5 accent-porsche-500" />
 <span className="text-xs text-titanium-300 font-sf">{label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Results */}
 <div className="space-y-4">
 {/* Therapy tabs */}
 <div className="flex gap-1 p-1 bg-white rounded-xl border border-titanium-200">
 {results.map((r, i) => (
 <button key={r.therapy} onClick={() => setActiveTab(i)}
 className={`flex-1 px-1.5 py-2 rounded-lg text-xs font-sf font-medium transition-all flex items-center justify-center gap-1 ${
 activeTab === i ? 'bg-porsche-500/20 text-porsche-300 border border-porsche-500/30' : 'text-titanium-400 hover:text-white'
 }`}>
 {getStatusIcon(r.status)}
 <span className="hidden sm:inline">{r.therapy.split(' ')[0]}</span>
 </button>
 ))}
 </div>

 {/* Active Result */}
 <div className={`metal-card rounded-2xl p-5 border ${getStatusBg(activeResult.status)}`}>
 <div className="flex items-center gap-3 mb-4">
 {getStatusIcon(activeResult.status)}
 <div>
 <h4 className="text-sm font-semibold text-white font-sf">{activeResult.therapy}</h4>
 <span className={`text-xs font-semibold uppercase tracking-wider ${getStatusText(activeResult.status)}`}>
 {activeResult.status}{activeResult.level !== 'none' ? ` (${activeResult.level})` : ''}
 </span>
 </div>
 </div>

 {activeResult.reasons.length > 0 && (
 <div className="mb-4">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Findings</h5>
 <ul className="space-y-1.5">
 {activeResult.reasons.map((r) => (
 <li key={r} className="text-xs text-titanium-300 flex items-start gap-2">
 <AlertTriangle className="w-3 h-3 text-[#6B7280] mt-0.5 flex-shrink-0" /> {r}
 </li>
 ))}
 </ul>
 </div>
 )}

 {activeResult.alternatives.length > 0 && (
 <div className="mb-4">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Alternatives</h5>
 <ul className="space-y-1">
 {activeResult.alternatives.map((a) => (
 <li key={a} className="text-xs text-[#2C4A60] flex items-center gap-2">
 <Activity className="w-3 h-3 flex-shrink-0" /> {a}
 </li>
 ))}
 </ul>
 </div>
 )}

 <div className="mb-4">
 <h5 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Monitoring</h5>
 <ul className="space-y-1">
 {activeResult.monitoring.map((m) => (
 <li key={m} className="text-xs text-titanium-300 flex items-center gap-2">
 <Zap className="w-3 h-3 text-chrome-400 flex-shrink-0" /> {m}
 </li>
 ))}
 </ul>
 </div>

 {activeResult.considerations && (
 <div className="p-3 rounded-xl bg-porsche-500/10 border border-porsche-500/20">
 <p className="text-xs text-porsche-300 font-sf">{activeResult.considerations}</p>
 </div>
 )}
 </div>

 {/* Overview */}
 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-xs font-semibold text-titanium-400 mb-3 uppercase tracking-wider">All Therapies Overview</h4>
 <div className="space-y-2">
 {results.map((r, i) => (
 <div key={r.therapy} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
 activeTab === i ? 'border-porsche-500/30' : ''
 } ${getStatusBg(r.status)}`} onClick={() => setActiveTab(i)}>
 <div className="flex items-center gap-2">
 {getStatusIcon(r.status)}
 <span className="text-xs font-medium text-white font-sf">{r.therapy.split('(')[0].trim()}</span>
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
 2020 ACC/AHA VHD Guideline | 2021 ESC/EACTS VHD Guidelines | COAPT & MITRA-FR trials (TEER evidence).
 STS PROM and EuroSCORE II thresholds guide TAVR vs. SAVR decision-making.
 </p>
 </div>
 </div>
  );
};

export default SHValveTherapyContraindicationChecker;
