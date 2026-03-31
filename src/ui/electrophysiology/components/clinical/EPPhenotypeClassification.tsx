import React, { useState } from 'react';
import { Zap, Search, AlertTriangle, Info, Heart, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface EPPhenotypeInputs {
  primaryRhythm: 'afib_paroxysmal' | 'afib_persistent' | 'afib_permanent' | 'aflutter' | 'avnrt' | 'avrt_wpw' | 'vt_monomorphic' | 'vt_polymorphic' | 'bradycardia_sss' | 'bradycardia_avblock' | 'pvc_burden' | 'none';
  lvef: number;
  laSize: number; // mm
  age: number;
  hypertension: boolean;
  diabetes: boolean;
  priorStroke: boolean;
  vascularDisease: boolean;
  heartFailure: boolean;
  priorAblation: boolean;
  deviceImplanted: boolean;
  deviceType: 'none' | 'ppm' | 'icd' | 'crt_d' | 'crt_p' | 'loop_recorder';
  symptomBurden: 'asymptomatic' | 'mild' | 'moderate' | 'severe';
  atrialFibBurden: number; // percentage of time in AF (0-100)
}

interface EPPhenotypeResult {
  arrhythmiaClassification: {
 category: string;
 subtype: string;
 mechanism: string;
 severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  };
  strokeRisk: {
 cha2ds2vasc: number;
 anticoagulationIndicated: boolean;
 recommendation: string;
  };
  ablationCandidacy: {
 candidate: boolean;
 priority: 'Elective' | 'Semi-urgent' | 'Urgent' | 'Not indicated';
 successRate: string;
 rationale: string;
  };
  deviceAssessment: {
 currentDevice: string;
 upgradeNeeded: boolean;
 recommendation: string;
  };
  recommendations: string[];
}

const EPPhenotypeClassification: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [inputs, setInputs] = useState<EPPhenotypeInputs>({
 primaryRhythm: 'afib_paroxysmal',
 lvef: ctx?.lvef ?? 55,
 laSize: 40,
 age: ctx?.age ?? 65,
 hypertension: ctx?.hypertension ?? true,
 diabetes: ctx?.diabetes ?? false,
 priorStroke: (ctx?.priorStroke || ctx?.priorTIA) ?? false,
 vascularDisease: (ctx?.pvd || ctx?.cad) ?? false,
 heartFailure: ctx?.chf ?? false,
 priorAblation: false,
 deviceImplanted: false,
 deviceType: 'none',
 symptomBurden: 'moderate',
 atrialFibBurden: 15,
  });

  const classifyPhenotype = (): EPPhenotypeResult => {
 // Arrhythmia classification
 let arrhythmiaClassification: EPPhenotypeResult['arrhythmiaClassification'];

 const rhythmMap: Record<string, { category: string; subtype: string; mechanism: string }> = {
 afib_paroxysmal: { category: 'Atrial Fibrillation', subtype: 'Paroxysmal (self-terminating <7d)', mechanism: 'Pulmonary vein triggers, atrial substrate' },
 afib_persistent: { category: 'Atrial Fibrillation', subtype: 'Persistent (sustained >7d)', mechanism: 'Progressive atrial remodeling, fibrosis' },
 afib_permanent: { category: 'Atrial Fibrillation', subtype: 'Permanent (accepted)', mechanism: 'Extensive atrial fibrosis, chronic remodeling' },
 aflutter: { category: 'Atrial Flutter', subtype: 'Typical CTI-dependent', mechanism: 'Macro-reentrant circuit around tricuspid annulus' },
 avnrt: { category: 'SVT', subtype: 'AV Nodal Reentrant Tachycardia', mechanism: 'Dual AV nodal physiology, slow/fast pathways' },
 avrt_wpw: { category: 'SVT / Pre-excitation', subtype: 'AVRT (WPW Syndrome)', mechanism: 'Accessory pathway, risk of rapid conduction in AF' },
 vt_monomorphic: { category: 'Ventricular Tachycardia', subtype: 'Monomorphic VT', mechanism: 'Scar-related reentry, structural substrate' },
 vt_polymorphic: { category: 'Ventricular Tachycardia', subtype: 'Polymorphic VT', mechanism: 'Ischemia, channelopathy, or drug-induced' },
 bradycardia_sss: { category: 'Bradyarrhythmia', subtype: 'Sick Sinus Syndrome', mechanism: 'Sinus node dysfunction, tachy-brady syndrome' },
 bradycardia_avblock: { category: 'Bradyarrhythmia', subtype: 'AV Block', mechanism: 'AV conduction disease, infranodal block' },
 pvc_burden: { category: 'Ventricular Ectopy', subtype: 'High PVC Burden', mechanism: 'Focal automaticity, triggered activity' },
 none: { category: 'No Arrhythmia', subtype: 'Normal Sinus Rhythm', mechanism: 'N/A' },
 };

 const info = rhythmMap[inputs.primaryRhythm] || rhythmMap.none;

 // Severity assessment
 let severity: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
 if (['vt_monomorphic', 'vt_polymorphic', 'avrt_wpw'].includes(inputs.primaryRhythm)) {
 severity = inputs.lvef < 35 ? 'Critical' : 'High';
 } else if (['afib_persistent', 'afib_permanent'].includes(inputs.primaryRhythm)) {
 severity = inputs.lvef < 40 ? 'High' : inputs.symptomBurden === 'severe' ? 'High' : 'Moderate';
 } else if (inputs.primaryRhythm === 'afib_paroxysmal') {
 severity = inputs.symptomBurden === 'severe' ? 'Moderate' : 'Low';
 } else if (['bradycardia_sss', 'bradycardia_avblock'].includes(inputs.primaryRhythm)) {
 severity = inputs.symptomBurden === 'severe' ? 'High' : 'Moderate';
 } else if (inputs.primaryRhythm === 'pvc_burden') {
 severity = inputs.atrialFibBurden > 20 ? 'Moderate' : 'Low'; // Using atrialFibBurden as PVC burden proxy
 }

 arrhythmiaClassification = { ...info, severity };

 // CHA2DS2-VASc calculation (for AF/flutter)
 let cha2ds2vasc = 0;
 const isAF = inputs.primaryRhythm.startsWith('afib') || inputs.primaryRhythm === 'aflutter';

 if (isAF) {
 if (inputs.heartFailure) cha2ds2vasc += 1;
 if (inputs.hypertension) cha2ds2vasc += 1;
 if (inputs.age >= 75) cha2ds2vasc += 2;
 else if (inputs.age >= 65) cha2ds2vasc += 1;
 if (inputs.diabetes) cha2ds2vasc += 1;
 if (inputs.priorStroke) cha2ds2vasc += 2;
 if (inputs.vascularDisease) cha2ds2vasc += 1;
 }

 const anticoagulationIndicated = isAF && cha2ds2vasc >= 2;
 let strokeRecommendation = '';
 if (!isAF) {
 strokeRecommendation = 'CHA₂DS₂-VASc not applicable for this rhythm';
 } else if (cha2ds2vasc >= 2) {
 strokeRecommendation = 'Oral anticoagulation recommended (DOAC preferred over warfarin)';
 } else if (cha2ds2vasc === 1) {
 strokeRecommendation = 'Anticoagulation may be considered; discuss risks/benefits';
 } else {
 strokeRecommendation = 'Anticoagulation not recommended; reassess annually';
 }

 // Ablation candidacy
 let ablationCandidacy: EPPhenotypeResult['ablationCandidacy'];

 if (['avnrt', 'aflutter'].includes(inputs.primaryRhythm)) {
 ablationCandidacy = {
 candidate: true,
 priority: 'Elective',
 successRate: inputs.primaryRhythm === 'avnrt' ? '>95%' : '>90%',
 rationale: `${info.subtype} is highly curable with catheter ablation as first-line therapy`,
 };
 } else if (inputs.primaryRhythm === 'avrt_wpw') {
 ablationCandidacy = {
 candidate: true,
 priority: 'Semi-urgent',
 successRate: '>93%',
 rationale: 'Ablation recommended to eliminate risk of rapid pre-excited AF and sudden death',
 };
 } else if (inputs.primaryRhythm === 'afib_paroxysmal') {
 ablationCandidacy = {
 candidate: true,
 priority: inputs.symptomBurden === 'severe' ? 'Semi-urgent' : 'Elective',
 successRate: inputs.priorAblation ? '60-70% (redo)' : '70-80%',
 rationale: inputs.priorAblation
 ? 'Repeat PVI with possible posterior wall/non-PV trigger ablation'
 : 'Pulmonary vein isolation; can be offered as first-line or after AAD failure',
 };
 } else if (inputs.primaryRhythm === 'afib_persistent') {
 ablationCandidacy = {
 candidate: true,
 priority: inputs.lvef < 40 ? 'Semi-urgent' : 'Elective',
 successRate: inputs.priorAblation ? '50-60% (redo)' : '60-70%',
 rationale: inputs.lvef < 40
 ? 'Ablation may improve LVEF in tachycardia-mediated cardiomyopathy'
 : 'PVI + possible substrate modification; discuss rhythm vs rate control',
 };
 } else if (inputs.primaryRhythm === 'vt_monomorphic') {
 ablationCandidacy = {
 candidate: inputs.lvef > 20,
 priority: 'Semi-urgent',
 successRate: '60-80%',
 rationale: inputs.lvef <= 20
 ? 'Very low EF; consider LVAD/transplant evaluation before ablation'
 : 'Scar-based VT ablation indicated for recurrent VT despite AADs/ICD',
 };
 } else if (inputs.primaryRhythm === 'pvc_burden') {
 ablationCandidacy = {
 candidate: inputs.atrialFibBurden > 10, // using as PVC burden
 priority: 'Elective',
 successRate: '>85%',
 rationale: inputs.atrialFibBurden > 20
 ? 'High PVC burden risks cardiomyopathy; ablation recommended'
 : 'Moderate PVC burden; ablation if symptomatic or LV dysfunction',
 };
 } else {
 ablationCandidacy = {
 candidate: false,
 priority: 'Not indicated',
 successRate: 'N/A',
 rationale: 'Ablation not primary therapy for this arrhythmia type',
 };
 }

 // Device assessment
 let deviceAssessment: EPPhenotypeResult['deviceAssessment'];
 const currentDeviceLabel: Record<string, string> = {
 none: 'No device',
 ppm: 'Pacemaker',
 icd: 'ICD',
 crt_d: 'CRT-D',
 crt_p: 'CRT-P',
 loop_recorder: 'Implantable Loop Recorder',
 };

 if (['bradycardia_sss', 'bradycardia_avblock'].includes(inputs.primaryRhythm) && inputs.deviceType === 'none') {
 deviceAssessment = {
 currentDevice: 'None',
 upgradeNeeded: true,
 recommendation: 'Permanent pacemaker indicated for symptomatic bradycardia (Class I)',
 };
 } else if (['vt_monomorphic', 'vt_polymorphic'].includes(inputs.primaryRhythm) && inputs.lvef <= 35 && !['icd', 'crt_d'].includes(inputs.deviceType)) {
 deviceAssessment = {
 currentDevice: currentDeviceLabel[inputs.deviceType],
 upgradeNeeded: true,
 recommendation: 'ICD indicated for secondary prevention of sudden cardiac death',
 };
 } else if (inputs.heartFailure && inputs.lvef <= 35 && inputs.deviceType === 'icd') {
 deviceAssessment = {
 currentDevice: 'ICD',
 upgradeNeeded: true,
 recommendation: 'Consider upgrade to CRT-D if QRS ≥150ms with LBBB morphology',
 };
 } else {
 deviceAssessment = {
 currentDevice: currentDeviceLabel[inputs.deviceType] || 'Unknown',
 upgradeNeeded: false,
 recommendation: inputs.deviceType === 'none'
 ? 'No device currently indicated based on provided data'
 : 'Current device appropriate; continue routine follow-up',
 };
 }

 // Consolidated recommendations
 const recommendations: string[] = [];

 if (isAF) {
 recommendations.push('Rate control target: resting HR <110 bpm (lenient) or <80 bpm (strict)');
 if (anticoagulationIndicated) {
 recommendations.push(`CHA₂DS₂-VASc = ${cha2ds2vasc}: Anticoagulate with DOAC (apixaban, rivaroxaban, edoxaban, or dabigatran)`);
 }
 if (inputs.laSize > 50) {
 recommendations.push('Severely dilated LA (>50mm) — reduced ablation success; discuss expectations');
 }
 }

 if (ablationCandidacy.candidate) {
 recommendations.push(`Ablation candidacy: ${ablationCandidacy.priority} — success rate ${ablationCandidacy.successRate}`);
 }

 if (deviceAssessment.upgradeNeeded) {
 recommendations.push(`Device: ${deviceAssessment.recommendation}`);
 }

 if (inputs.lvef < 40 && isAF) {
 recommendations.push('Evaluate for tachycardia-mediated cardiomyopathy; rhythm control may improve LVEF');
 }

 if (inputs.primaryRhythm === 'avrt_wpw') {
 recommendations.push('CRITICAL: Avoid AV nodal blockers (digoxin, verapamil, adenosine) — risk of rapid pre-excited AF');
 }

 if (recommendations.length === 0) {
 recommendations.push('Continue guideline-directed EP follow-up');
 }

 return {
 arrhythmiaClassification,
 strokeRisk: { cha2ds2vasc, anticoagulationIndicated, recommendation: strokeRecommendation },
 ablationCandidacy,
 deviceAssessment,
 recommendations,
 };
  };

  const result = classifyPhenotype();

  const updateInput = (key: keyof EPPhenotypeInputs, value: any) => {
 setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getSeverityColor = (severity: string) => {
 switch (severity) {
 case 'Critical': return 'text-red-700 bg-red-50 border-red-300';
 case 'High': return 'text-red-600 bg-red-50 border-red-200';
 case 'Moderate': return 'text-[#8B6914] bg-[#FAF6E8] border-[#C8D4DC]';
 case 'Low': return 'text-[#2D6147] bg-[#F0F7F4] border-[#2C4A60]';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Zap className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">EP Phenotype Classification</h2>
 <p className="text-titanium-600">Arrhythmia Subtype, Stroke Risk, Ablation Candidacy & Device Assessment</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Input Section */}
 <div className="space-y-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-center gap-2 mb-3">
 <Activity className="w-5 h-5 text-porsche-600" />
 <h3 className="font-semibold text-porsche-800">Rhythm & Cardiac Assessment</h3>
 </div>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Primary Rhythm</label>
 <select
 value={inputs.primaryRhythm}
 onChange={(e) => updateInput('primaryRhythm', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <optgroup label="Atrial Arrhythmias">
 <option value="afib_paroxysmal">AF — Paroxysmal</option>
 <option value="afib_persistent">AF — Persistent</option>
 <option value="afib_permanent">AF — Permanent</option>
 <option value="aflutter">Atrial Flutter (typical)</option>
 </optgroup>
 <optgroup label="SVT">
 <option value="avnrt">AVNRT</option>
 <option value="avrt_wpw">AVRT / WPW</option>
 </optgroup>
 <optgroup label="Ventricular">
 <option value="vt_monomorphic">VT — Monomorphic</option>
 <option value="vt_polymorphic">VT — Polymorphic</option>
 <option value="pvc_burden">High PVC Burden</option>
 </optgroup>
 <optgroup label="Bradyarrhythmia">
 <option value="bradycardia_sss">Sick Sinus Syndrome</option>
 <option value="bradycardia_avblock">AV Block</option>
 </optgroup>
 <option value="none">Normal Sinus Rhythm</option>
 </select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">LVEF (%)</label>
 <input
 type="number"
 value={inputs.lvef}
 onChange={(e) => updateInput('lvef', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 min="10" max="75"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">LA Size (mm)</label>
 <input
 type="number"
 value={inputs.laSize}
 onChange={(e) => updateInput('laSize', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 min="20" max="80"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 min="18" max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Symptom Burden</label>
 <select
 value={inputs.symptomBurden}
 onChange={(e) => updateInput('symptomBurden', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="asymptomatic">Asymptomatic</option>
 <option value="mild">Mild (EHRA IIa)</option>
 <option value="moderate">Moderate (EHRA IIb-III)</option>
 <option value="severe">Severe (EHRA IV)</option>
 </select>
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-chrome-50 border border-chrome-200 rounded-lg">
 <div className="flex items-center gap-2 mb-3">
 <Heart className="w-5 h-5 text-chrome-600" />
 <h3 className="font-semibold text-chrome-800">Comorbidities & History</h3>
 </div>
 <div className="space-y-2">
 {[
 { key: 'hypertension', label: 'Hypertension' },
 { key: 'diabetes', label: 'Diabetes Mellitus' },
 { key: 'heartFailure', label: 'Heart Failure / LV Dysfunction' },
 { key: 'priorStroke', label: 'Prior Stroke / TIA' },
 { key: 'vascularDisease', label: 'Vascular Disease (PAD/MI/aortic plaque)' },
 { key: 'priorAblation', label: 'Prior Ablation' },
 { key: 'deviceImplanted', label: 'Cardiac Device Implanted' },
 ].map(({ key, label }) => (
 <label key={key} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs[key as keyof EPPhenotypeInputs] as boolean}
 onChange={(e) => updateInput(key as keyof EPPhenotypeInputs, e.target.checked)}
 className="rounded text-chrome-600"
 />
 <span className="text-sm font-medium text-titanium-700">{label}</span>
 </label>
 ))}
 {inputs.deviceImplanted && (
 <div className="mt-2">
 <label className="block text-sm font-medium text-titanium-700 mb-2">Device Type</label>
 <select
 value={inputs.deviceType}
 onChange={(e) => updateInput('deviceType', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 >
 <option value="ppm">Pacemaker</option>
 <option value="icd">ICD</option>
 <option value="crt_d">CRT-D</option>
 <option value="crt_p">CRT-P</option>
 <option value="loop_recorder">Implantable Loop Recorder</option>
 </select>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Results Section */}
 <div className="space-y-6">
 {/* Arrhythmia Classification */}
 <div className={`p-6 rounded-xl border-2 ${getSeverityColor(result.arrhythmiaClassification.severity)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Zap className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">{result.arrhythmiaClassification.category}</div>
 <div className="text-sm opacity-80">{result.arrhythmiaClassification.subtype}</div>
 </div>
 <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(result.arrhythmiaClassification.severity)}`}>
 {result.arrhythmiaClassification.severity}
 </span>
 </div>
 <div className="text-sm opacity-80">
 <span className="font-medium">Mechanism:</span> {result.arrhythmiaClassification.mechanism}
 </div>
 </div>

 {/* Stroke Risk */}
 {(inputs.primaryRhythm.startsWith('afib') || inputs.primaryRhythm === 'aflutter') && (
 <div className={`p-6 rounded-xl border-2 ${result.strokeRisk.anticoagulationIndicated ? 'border-red-200 bg-red-50' : 'border-[#2C4A60] bg-[#C8D4DC]'}`}>
 <div className="flex items-center gap-3 mb-3">
 <AlertTriangle className="w-6 h-6" />
 <div className="font-bold text-lg">Stroke Risk: CHA₂DS₂-VASc = {result.strokeRisk.cha2ds2vasc}</div>
 </div>
 <div className="text-sm">{result.strokeRisk.recommendation}</div>
 </div>
 )}

 {/* Ablation Candidacy */}
 <div className={`p-6 rounded-xl border-2 ${
 result.ablationCandidacy.candidate ? 'border-porsche-200 bg-porsche-50' : 'border-titanium-200 bg-titanium-50'
 }`}>
 <div className="flex items-center gap-3 mb-3">
 <Search className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">Ablation: {result.ablationCandidacy.priority}</div>
 {result.ablationCandidacy.candidate && (
 <div className="text-sm opacity-80">Success rate: {result.ablationCandidacy.successRate}</div>
 )}
 </div>
 </div>
 <div className="text-sm">{result.ablationCandidacy.rationale}</div>
 </div>

 {/* Device Assessment */}
 <div className={`p-6 rounded-xl border-2 ${
 result.deviceAssessment.upgradeNeeded ? 'border-[#C8D4DC] bg-[#F0F5FA]' : 'border-titanium-200 bg-titanium-50'
 }`}>
 <div className="flex items-center gap-3 mb-3">
 <Heart className="w-6 h-6" />
 <div className="font-bold text-lg">Device: {result.deviceAssessment.currentDevice}</div>
 </div>
 <div className="text-sm">{result.deviceAssessment.recommendation}</div>
 </div>

 {/* Recommendations */}
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="font-semibold text-porsche-800 mb-2">Clinical Recommendations</div>
 <ul className="space-y-1 text-sm text-porsche-700">
 {result.recommendations.map((rec, index) => (
 <li key={rec} className="flex items-start gap-2">
 <div className="w-1.5 h-1.5 bg-porsche-600 rounded-full mt-1.5 flex-shrink-0"></div>
 {rec}
 </li>
 ))}
 </ul>
 </div>

 {/* Guideline Reference */}
 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Info className="w-5 h-5 text-titanium-600 mt-0.5 flex-shrink-0" />
 <div className="text-xs text-titanium-600">
 <div className="font-semibold mb-1">References</div>
 <div>2023 ACC/AHA/ACCP/HRS AF Guideline</div>
 <div>2022 ESC Ventricular Arrhythmias & SCD Guidelines</div>
 <div>2021 ESC Cardiac Pacing & CRT Guidelines</div>
 <div className="mt-1 italic">Educational tool only — clinical decisions require full patient evaluation</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPPhenotypeClassification;
