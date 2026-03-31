import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, Activity, Zap, Shield } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface SHValvePhenotypeInputs {
  // Valve identification
  valveAffected: 'aortic' | 'mitral' | 'tricuspid' | 'pulmonic';
  pathologyType: 'stenosis' | 'regurgitation' | 'mixed';

  // Aortic stenosis parameters
  aorticValveArea: number; // cm2
  meanGradient: number; // mmHg
  peakVelocity: number; // m/s
  dimensionlessIndex: number; // DI (LVOT VTI / AV VTI)
  strokeVolumeIndex: number; // mL/m2

  // Regurgitation parameters
  venaContracta: number; // mm
  regurgitantVolume: number; // mL
  eroa: number; // cm2 (effective regurgitant orifice area)
  regurgitantFraction: number; // %

  // Structural parameters
  calcificationGrade: 'none' | 'mild' | 'moderate' | 'severe';
  bicuspidValve: boolean;
  leafletProlapse: boolean;
  leafletRestriction: boolean;
  annularDilatation: boolean;

  // LV parameters
  lvef: number;
  lvedd: number; // mm
  lvesd: number; // mm

  // Clinical
  age: number;
  symptomatic: boolean;
  exerciseTestAbnormal: boolean;
  bnpElevated: boolean;
}

interface SeverityResult {
  stenosisSeverity: { grade: string; criteria: string[]; color: string };
  regurgitationSeverity: { grade: string; criteria: string[]; color: string };
  morphologyProfile: { type: string; features: string[]; implications: string[] };
  interventionTiming: { recommendation: string; class: string; urgency: string };
  structuralAssessment: string;
}

const SHValvePhenotypeClassification: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [inputs, setInputs] = useState<SHValvePhenotypeInputs>({
 valveAffected: 'aortic', pathologyType: 'stenosis',
 aorticValveArea: ctx?.aorticValveArea ?? 0.8, meanGradient: ctx?.aorticMeanGradient ?? 48, peakVelocity: ctx?.aorticPeakVelocity ?? 4.2,
 dimensionlessIndex: 0.22, strokeVolumeIndex: ctx?.strokeVolumeIndex ?? 32,
 venaContracta: ctx?.venaContracta ?? 3, regurgitantVolume: ctx?.regurgitantVolume ?? 25, eroa: ctx?.eroa ?? 0.15, regurgitantFraction: 20,
 calcificationGrade: 'severe', bicuspidValve: false,
 leafletProlapse: false, leafletRestriction: true, annularDilatation: false,
 lvef: ctx?.lvef ?? 50, lvedd: ctx?.lvedd ?? 55, lvesd: ctx?.lvesd ?? 38,
 age: ctx?.age ?? 78, symptomatic: ctx?.symptomatic ?? true, exerciseTestAbnormal: false, bnpElevated: (ctx?.bnp !== undefined && ctx.bnp > 100) || (ctx?.ntProBNP !== undefined && ctx.ntProBNP > 300),
  });

  const [results, setResults] = useState<SeverityResult | null>(null);

  const classifyPhenotype = (): SeverityResult => {
 // === AORTIC STENOSIS SEVERITY (2020 ACC/AHA, 2021 ESC) ===
 let stenosisSeverity: SeverityResult['stenosisSeverity'];
 const stCriteria: string[] = [];

 if (inputs.valveAffected === 'aortic' && (inputs.pathologyType === 'stenosis' || inputs.pathologyType === 'mixed')) {
 // Severe AS: AVA < 1.0, MG >= 40, Vmax >= 4.0
 if (inputs.aorticValveArea < 1.0 && inputs.meanGradient >= 40 && inputs.peakVelocity >= 4.0) {
 // High-gradient severe AS
 stCriteria.push(`AVA ${inputs.aorticValveArea} cm\u00B2 (< 1.0)`, `Mean gradient ${inputs.meanGradient} mmHg (\u2265 40)`, `Vmax ${inputs.peakVelocity} m/s (\u2265 4.0)`);
 stenosisSeverity = { grade: 'Severe (High-Gradient)', criteria: stCriteria, color: 'text-red-400' };
 } else if (inputs.aorticValveArea < 1.0 && inputs.meanGradient < 40 && inputs.lvef < 50) {
 // Low-flow, low-gradient with reduced EF
 stCriteria.push(`AVA ${inputs.aorticValveArea} cm\u00B2 (< 1.0)`, `Mean gradient ${inputs.meanGradient} mmHg (< 40) \u2014 low-flow`, `LVEF ${inputs.lvef}% (< 50%) \u2014 reduced EF`);
 stCriteria.push('Consider dobutamine stress echo to differentiate true-severe from pseudo-severe AS');
 stenosisSeverity = { grade: 'Severe (Low-Flow, Low-Gradient, Reduced EF)', criteria: stCriteria, color: 'text-red-400' };
 } else if (inputs.aorticValveArea < 1.0 && inputs.meanGradient < 40 && inputs.lvef >= 50 && inputs.strokeVolumeIndex < 35) {
 // Paradoxical low-flow, low-gradient
 stCriteria.push(`AVA ${inputs.aorticValveArea} cm\u00B2 (< 1.0)`, `Mean gradient ${inputs.meanGradient} mmHg (< 40)`, `LVEF ${inputs.lvef}% (\u2265 50%) \u2014 preserved EF`);
 stCriteria.push(`SVI ${inputs.strokeVolumeIndex} mL/m\u00B2 (< 35) \u2014 paradoxical low-flow`);
 stCriteria.push('Consider CT calcium scoring (Agatston > 2000 men / > 1200 women supports severe)');
 stenosisSeverity = { grade: 'Severe (Paradoxical Low-Flow, Low-Gradient)', criteria: stCriteria, color: 'text-[#6B7280]' };
 } else if (inputs.aorticValveArea >= 1.0 && inputs.aorticValveArea <= 1.5) {
 stCriteria.push(`AVA ${inputs.aorticValveArea} cm\u00B2 (1.0-1.5)`, `Mean gradient ${inputs.meanGradient} mmHg`);
 stenosisSeverity = { grade: 'Moderate', criteria: stCriteria, color: 'text-[#6B7280]' };
 } else if (inputs.aorticValveArea > 1.5) {
 stCriteria.push(`AVA ${inputs.aorticValveArea} cm\u00B2 (> 1.5)`);
 stenosisSeverity = { grade: 'Mild', criteria: stCriteria, color: 'text-[#2C4A60]' };
 } else {
 stCriteria.push('Discordant parameters \u2014 requires additional workup');
 stenosisSeverity = { grade: 'Indeterminate', criteria: stCriteria, color: 'text-[#6B7280]' };
 }
 } else if (inputs.valveAffected === 'mitral' && inputs.pathologyType === 'stenosis') {
 // Mitral stenosis: MVA < 1.0 severe, 1.0-1.5 moderate, > 1.5 mild
 if (inputs.aorticValveArea < 1.0) { // reuse field as valve area
 stCriteria.push(`MVA ${inputs.aorticValveArea} cm\u00B2 (< 1.0)`, `Mean gradient ${inputs.meanGradient} mmHg`);
 stenosisSeverity = { grade: 'Severe', criteria: stCriteria, color: 'text-red-400' };
 } else if (inputs.aorticValveArea <= 1.5) {
 stenosisSeverity = { grade: 'Moderate', criteria: [`MVA ${inputs.aorticValveArea} cm\u00B2 (1.0-1.5)`], color: 'text-[#6B7280]' };
 } else {
 stenosisSeverity = { grade: 'Mild', criteria: [`MVA ${inputs.aorticValveArea} cm\u00B2 (> 1.5)`], color: 'text-[#2C4A60]' };
 }
 } else {
 stenosisSeverity = { grade: 'N/A', criteria: ['No stenosis evaluation for selected valve/pathology'], color: 'text-titanium-400' };
 }

 // === REGURGITATION SEVERITY (2020 ACC/AHA, 2021 ESC) ===
 let regurgitationSeverity: SeverityResult['regurgitationSeverity'];
 const regCriteria: string[] = [];

 if (inputs.pathologyType === 'regurgitation' || inputs.pathologyType === 'mixed') {
 const isAortic = inputs.valveAffected === 'aortic';
 const isMitral = inputs.valveAffected === 'mitral';

 // Severe thresholds differ by valve
 const severeVC = isAortic ? 6 : 7; // mm
 const severeRVol = isAortic ? 60 : 60; // mL
 const severeEROA = isAortic ? 0.30 : 0.40; // cm2

 if (inputs.eroa >= severeEROA || inputs.regurgitantVolume >= severeRVol || inputs.venaContracta >= severeVC) {
 regCriteria.push(
 `EROA ${inputs.eroa} cm\u00B2 (severe \u2265 ${severeEROA})`,
 `Regurgitant volume ${inputs.regurgitantVolume} mL (severe \u2265 ${severeRVol})`,
 `Vena contracta ${inputs.venaContracta} mm (severe \u2265 ${severeVC})`
 );
 regurgitationSeverity = { grade: 'Severe', criteria: regCriteria, color: 'text-red-400' };
 } else if (inputs.eroa >= (severeEROA * 0.5) || inputs.regurgitantVolume >= (severeRVol * 0.5)) {
 regCriteria.push(`EROA ${inputs.eroa} cm\u00B2`, `Regurgitant volume ${inputs.regurgitantVolume} mL`);
 regurgitationSeverity = { grade: 'Moderate', criteria: regCriteria, color: 'text-[#6B7280]' };
 } else {
 regurgitationSeverity = { grade: 'Mild', criteria: [`EROA ${inputs.eroa} cm\u00B2`, `RVol ${inputs.regurgitantVolume} mL`], color: 'text-[#2C4A60]' };
 }

 if (isMitral && inputs.pathologyType === 'regurgitation') {
 // Classify MR mechanism for TEER candidacy
 if (inputs.leafletProlapse) {
 regCriteria.push('Mechanism: Degenerative (leaflet prolapse) \u2014 favorable for MitraClip/TEER');
 } else if (inputs.leafletRestriction && inputs.annularDilatation) {
 regCriteria.push('Mechanism: Functional (LV remodeling + annular dilatation) \u2014 assess for TEER vs. medical management');
 } else if (inputs.annularDilatation) {
 regCriteria.push('Mechanism: Atrial functional MR (annular dilatation) \u2014 consider annuloplasty or TEER');
 }
 }
 } else {
 regurgitationSeverity = { grade: 'N/A', criteria: ['No regurgitation evaluation for selected pathology'], color: 'text-titanium-400' };
 }

 // === MORPHOLOGY PROFILE ===
 const morphFeatures: string[] = [];
 const morphImplications: string[] = [];
 let morphType = 'Tricuspid Calcific';

 if (inputs.bicuspidValve) {
 morphType = 'Bicuspid Aortic Valve';
 morphFeatures.push('Bicuspid morphology (raphe identification important for TAVR)');
 morphImplications.push('Higher risk of paravalvular leak with TAVR', 'May require CT-guided oversizing', 'Screen for aortopathy (ascending aorta dilatation)');
 }
 if (inputs.calcificationGrade === 'severe') {
 morphFeatures.push('Severe calcification');
 morphImplications.push('Favorable for TAVR sealing', 'Higher risk of conduction disturbance post-TAVR', 'Consider pacemaker standby');
 }
 if (inputs.leafletProlapse) {
 morphType = inputs.valveAffected === 'mitral' ? 'Myxomatous / Degenerative' : morphType;
 morphFeatures.push('Leaflet prolapse');
 morphImplications.push('Favorable anatomy for surgical repair if mitral');
 }
 if (inputs.leafletRestriction) {
 morphFeatures.push('Leaflet restriction');
 morphImplications.push('May indicate functional etiology', 'Assess LV remodeling');
 }
 if (inputs.annularDilatation) {
 morphFeatures.push('Annular dilatation');
 morphImplications.push('Consider annuloplasty ring', 'May affect TAVR sizing');
 }

 if (morphFeatures.length === 0) { morphFeatures.push('Standard tricuspid aortic valve morphology'); morphImplications.push('Standard TAVR or SAVR approach'); }

 const morphologyProfile = { type: morphType, features: morphFeatures, implications: morphImplications };

 // === INTERVENTION TIMING (2020 ACC/AHA, 2021 ESC) ===
 let recommendation: string;
 let recClass: string;
 let urgency: string;

 if (stenosisSeverity.grade.includes('Severe') && inputs.symptomatic) {
 recommendation = 'Severe symptomatic AS: Intervention indicated (Class I). Proceed with Heart Team evaluation for TAVR vs. SAVR.';
 recClass = 'Class I';
 urgency = 'Indicated';
 } else if (stenosisSeverity.grade.includes('Severe') && !inputs.symptomatic) {
 if (inputs.lvef < 50) {
 recommendation = 'Severe asymptomatic AS with LVEF < 50%: Intervention recommended (Class I).';
 recClass = 'Class I';
 urgency = 'Indicated';
 } else if (inputs.exerciseTestAbnormal) {
 recommendation = 'Severe asymptomatic AS with abnormal exercise test: Intervention is reasonable (Class IIa).';
 recClass = 'Class IIa';
 urgency = 'Reasonable';
 } else if (inputs.peakVelocity > 5.0) {
 recommendation = 'Severe asymptomatic AS with Vmax > 5.0 m/s: Early intervention is reasonable (Class IIa). Rapid progression expected.';
 recClass = 'Class IIa';
 urgency = 'Reasonable';
 } else if (inputs.bnpElevated) {
 recommendation = 'Severe asymptomatic AS with elevated BNP: Intervention may be considered (Class IIb). Close surveillance required.';
 recClass = 'Class IIb';
 urgency = 'May Consider';
 } else {
 recommendation = 'Severe asymptomatic AS without triggers: Watchful waiting with serial echo every 6-12 months.';
 recClass = 'Surveillance';
 urgency = 'Watchful Waiting';
 }
 } else if (regurgitationSeverity.grade === 'Severe') {
 if (inputs.symptomatic) {
 recommendation = `Severe symptomatic ${inputs.valveAffected} regurgitation: Intervention indicated (Class I). Evaluate for repair vs. replacement.`;
 recClass = 'Class I';
 urgency = 'Indicated';
 } else if (inputs.lvef < 60 || inputs.lvesd > 40) {
 recommendation = 'Severe asymptomatic regurgitation with LV dysfunction/dilatation: Intervention recommended (Class I).';
 recClass = 'Class I';
 urgency = 'Indicated';
 } else {
 recommendation = 'Severe asymptomatic regurgitation with preserved LV: Serial monitoring. Consider intervention if progressive LV dilatation.';
 recClass = 'Surveillance';
 urgency = 'Watchful Waiting';
 }
 } else {
 recommendation = 'No intervention currently indicated. Continue surveillance per guidelines.';
 recClass = 'Surveillance';
 urgency = 'Watchful Waiting';
 }

 const interventionTiming = { recommendation, class: recClass, urgency };

 const structuralAssessment = `${inputs.valveAffected.charAt(0).toUpperCase() + inputs.valveAffected.slice(1)} valve: ${
 stenosisSeverity.grade !== 'N/A' ? stenosisSeverity.grade + ' stenosis' : ''
 }${stenosisSeverity.grade !== 'N/A' && regurgitationSeverity.grade !== 'N/A' ? ' + ' : ''}${
 regurgitationSeverity.grade !== 'N/A' ? regurgitationSeverity.grade + ' regurgitation' : ''
 }. ${morphType} morphology.`;

 return { stenosisSeverity, regurgitationSeverity, morphologyProfile, interventionTiming, structuralAssessment };
  };

  const handleClassify = () => setResults(classifyPhenotype());

  const updateInput = <K extends keyof SHValvePhenotypeInputs>(field: K, value: SHValvePhenotypeInputs[K]) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="space-y-6">
 <div className="metal-card rounded-2xl p-6 border border-porsche-400/20">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-porsche-400 to-porsche-600 flex items-center justify-center">
 <Heart className="w-5 h-5 text-porsche-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-white font-sf">Valve Disease Phenotype Classification</h3>
 <p className="text-xs text-titanium-400 font-sf">Stenosis Severity, Regurgitation Grading, Morphology & Intervention Timing</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Inputs */}
 <div className="metal-card rounded-2xl p-6 border border-titanium-200 space-y-4">
 <h4 className="text-sm font-semibold text-white font-sf flex items-center gap-2">
 <Search className="w-4 h-4 text-porsche-400" /> Echocardiographic & Clinical Data
 </h4>

 {/* Valve & Pathology */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">Valve</label>
 <select value={inputs.valveAffected} onChange={(e) => updateInput('valveAffected', e.target.value as SHValvePhenotypeInputs['valveAffected'])}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 {['aortic', 'mitral', 'tricuspid', 'pulmonic'].map(v => <option key={v} value={v} className="bg-gray-800">{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
 </select>
 </div>
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">Pathology</label>
 <select value={inputs.pathologyType} onChange={(e) => updateInput('pathologyType', e.target.value as SHValvePhenotypeInputs['pathologyType'])}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 <option value="stenosis" className="bg-gray-800">Stenosis</option>
 <option value="regurgitation" className="bg-gray-800">Regurgitation</option>
 <option value="mixed" className="bg-gray-800">Mixed</option>
 </select>
 </div>
 </div>

 {/* Stenosis parameters */}
 {(inputs.pathologyType === 'stenosis' || inputs.pathologyType === 'mixed') && (
 <div>
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider mb-2">Stenosis Parameters</h5>
 <div className="grid grid-cols-2 gap-2">
 {[
 { key: 'aorticValveArea' as const, label: inputs.valveAffected === 'mitral' ? 'MVA' : 'AVA', unit: 'cm\u00B2', step: 0.1 },
 { key: 'meanGradient' as const, label: 'Mean Gradient', unit: 'mmHg', step: 1 },
 { key: 'peakVelocity' as const, label: 'Peak Velocity', unit: 'm/s', step: 0.1 },
 { key: 'strokeVolumeIndex' as const, label: 'SV Index', unit: 'mL/m\u00B2', step: 1 },
 ].map(({ key, label, unit, step }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input type="number" value={inputs[key] as number} step={step}
 onChange={(e) => updateInput(key, parseFloat(e.target.value) || 0)}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none" />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Regurgitation parameters */}
 {(inputs.pathologyType === 'regurgitation' || inputs.pathologyType === 'mixed') && (
 <div>
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider mb-2">Regurgitation Parameters</h5>
 <div className="grid grid-cols-2 gap-2">
 {[
 { key: 'venaContracta' as const, label: 'Vena Contracta', unit: 'mm', step: 0.5 },
 { key: 'eroa' as const, label: 'EROA', unit: 'cm\u00B2', step: 0.05 },
 { key: 'regurgitantVolume' as const, label: 'Reg Volume', unit: 'mL', step: 5 },
 { key: 'regurgitantFraction' as const, label: 'Reg Fraction', unit: '%', step: 5 },
 ].map(({ key, label, unit, step }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input type="number" value={inputs[key] as number} step={step}
 onChange={(e) => updateInput(key, parseFloat(e.target.value) || 0)}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none" />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* LV parameters */}
 <div>
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider mb-2">LV Parameters</h5>
 <div className="grid grid-cols-3 gap-2">
 {[
 { key: 'lvef' as const, label: 'LVEF', unit: '%' },
 { key: 'lvedd' as const, label: 'LVEDD', unit: 'mm' },
 { key: 'lvesd' as const, label: 'LVESD', unit: 'mm' },
 ].map(({ key, label, unit }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input type="number" value={inputs[key] as number}
 onChange={(e) => updateInput(key, parseFloat(e.target.value) || 0)}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none" />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Morphology & Clinical */}
 <div className="space-y-1.5">
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider">Morphology & Clinical</h5>
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">Calcification</label>
 <select value={inputs.calcificationGrade} onChange={(e) => updateInput('calcificationGrade', e.target.value as SHValvePhenotypeInputs['calcificationGrade'])}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 {['none', 'mild', 'moderate', 'severe'].map(c => <option key={c} value={c} className="bg-gray-800">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
 </select>
 </div>
 {[
 { key: 'bicuspidValve' as const, label: 'Bicuspid aortic valve' },
 { key: 'leafletProlapse' as const, label: 'Leaflet prolapse' },
 { key: 'leafletRestriction' as const, label: 'Leaflet restriction' },
 { key: 'annularDilatation' as const, label: 'Annular dilatation' },
 { key: 'symptomatic' as const, label: 'Symptomatic' },
 { key: 'exerciseTestAbnormal' as const, label: 'Abnormal exercise test' },
 { key: 'bnpElevated' as const, label: 'Elevated BNP' },
 ].map(({ key, label }) => (
 <label key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
 inputs[key] ? 'bg-porsche-500/10 border-porsche-500/30' : 'bg-white border-titanium-200 hover:border-titanium-200'
 }`}>
 <input type="checkbox" checked={inputs[key] as boolean} onChange={(e) => updateInput(key, e.target.checked)} className="w-3.5 h-3.5 accent-porsche-500" />
 <span className="text-xs text-titanium-300 font-sf">{label}</span>
 </label>
 ))}
 </div>

 <button onClick={handleClassify}
 className="w-full py-3 rounded-xl bg-gradient-to-r from-porsche-500 to-porsche-600 text-white text-sm font-semibold font-sf hover:from-porsche-400 hover:to-porsche-500 transition-all">
 Classify Phenotype
 </button>
 </div>

 {/* Results */}
 <div className="space-y-4">
 {results ? (
 <>
 {/* Stenosis */}
 {results.stenosisSeverity.grade !== 'N/A' && (
 <div className="metal-card rounded-2xl p-5 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Activity className="w-4 h-4 text-[#6B7280]" /> Stenosis Severity
 </h4>
 <div className={`text-xl font-bold ${results.stenosisSeverity.color} mb-3`}>{results.stenosisSeverity.grade}</div>
 <ul className="space-y-1">
 {results.stenosisSeverity.criteria.map((c) => (
 <li key={c} className="text-xs text-titanium-300 flex items-start gap-2">
 <span className="text-porsche-400 mt-0.5">\u2022</span> {c}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Regurgitation */}
 {results.regurgitationSeverity.grade !== 'N/A' && (
 <div className="metal-card rounded-2xl p-5 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Zap className="w-4 h-4 text-chrome-400" /> Regurgitation Severity
 </h4>
 <div className={`text-xl font-bold ${results.regurgitationSeverity.color} mb-3`}>{results.regurgitationSeverity.grade}</div>
 <ul className="space-y-1">
 {results.regurgitationSeverity.criteria.map((c) => (
 <li key={c} className="text-xs text-titanium-300 flex items-start gap-2">
 <span className="text-porsche-400 mt-0.5">\u2022</span> {c}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Morphology */}
 <div className="metal-card rounded-2xl p-5 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Heart className="w-4 h-4 text-porsche-400" /> Morphology: {results.morphologyProfile.type}
 </h4>
 <div className="space-y-2">
 <div>
 <h5 className="text-xs font-semibold text-titanium-400 mb-1">Features</h5>
 {results.morphologyProfile.features.map((f) => (
 <p key={f} className="text-xs text-titanium-300">\u2022 {f}</p>
 ))}
 </div>
 <div>
 <h5 className="text-xs font-semibold text-titanium-400 mb-1">Implications</h5>
 {results.morphologyProfile.implications.map((imp) => (
 <p key={imp} className="text-xs text-titanium-300">\u2022 {imp}</p>
 ))}
 </div>
 </div>
 </div>

 {/* Intervention Timing */}
 <div className={`metal-card rounded-2xl p-5 border ${
 results.interventionTiming.urgency === 'Indicated' ? 'border-red-500 bg-red-500' :
 results.interventionTiming.urgency === 'Reasonable' ? 'border-[#C8D4DC]/30 bg-[#F0F5FA]/5' :
 'border-titanium-200'
 }`}>
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Shield className="w-4 h-4 text-porsche-400" /> Intervention Timing
 <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${
 results.interventionTiming.class === 'Class I' ? 'bg-red-500 text-red-400' :
 results.interventionTiming.class === 'Class IIa' ? 'bg-[#F0F5FA]/20 text-[#6B7280]' :
 results.interventionTiming.class === 'Class IIb' ? 'bg-bg-[#FAF6E8] text-[#8B6914]' :
 'bg-white text-titanium-400'
 }`}>{results.interventionTiming.class}</span>
 </h4>
 <p className="text-sm text-titanium-300 font-sf">{results.interventionTiming.recommendation}</p>
 </div>

 {/* Summary */}
 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-xs font-semibold text-titanium-400 mb-2 uppercase tracking-wider">Structural Assessment</h4>
 <p className="text-sm text-titanium-300 font-sf">{results.structuralAssessment}</p>
 </div>
 </>
 ) : (
 <div className="metal-card rounded-2xl p-8 border border-titanium-200 text-center">
 <Search className="w-8 h-8 text-titanium-600 mx-auto mb-3" />
 <p className="text-sm text-titanium-400 font-sf">Enter echocardiographic parameters and click Classify to analyze valve phenotype.</p>
 </div>
 )}
 </div>
 </div>

 <div className="metal-card rounded-xl p-3 border border-titanium-200">
 <p className="text-xs text-titanium-500 text-center font-sf">
 2020 ACC/AHA Valvular Heart Disease Guideline | 2021 ESC/EACTS VHD Guidelines | ASE Valve Severity Grading Standards.
 </p>
 </div>
 </div>
  );
};

export default SHValvePhenotypeClassification;
