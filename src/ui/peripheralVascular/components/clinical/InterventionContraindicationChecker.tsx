import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Activity, Scissors, Circle, Zap } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface PatientData {
  age: number; abi: number; creatinine: number; eGFR: number;
  hemoglobin: number; plateletCount: number; inr: number;
  lvef: number; hasCAD: boolean;
  hasContrastAllergy: boolean; hasCKDStage4Plus: boolean;
  hasActiveInfection: boolean; hasNonHealingWound: boolean;
  hasSepsis: boolean; lifeExpectancyLessThan2Years: boolean;
  hasAdequateRunoff: boolean; targetVesselDiameter: number;
  hasPriorBypass: boolean; hasSaphenousVein: boolean;
  ambulatory: boolean; functionalStatus: 'independent' | 'dependent' | 'nonambulatory';
}

interface ContraindicationResult {
  therapy: string;
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  precautions: string[];
}

const THERAPIES = ['Endovascular Revascularization', 'Surgical Bypass', 'Atherectomy', 'Drug-Coated Balloon (DCB)'];

const InterventionContraindicationChecker: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [patientData, setPatientData] = useState<PatientData>({
 age: ctx?.age ?? 68,
 abi: 0.55,
 creatinine: ctx?.creatinine ?? 1.4,
 eGFR: ctx?.eGFR ?? 48,
 hemoglobin: ctx?.hemoglobin ?? 11.5,
 plateletCount: ctx?.platelets ?? 180,
 inr: ctx?.inr ?? 1.1,
 lvef: ctx?.lvef ?? 45,
 hasCAD: ctx?.cad ?? true,
 hasContrastAllergy: false,
 hasCKDStage4Plus: false,
 hasActiveInfection: false,
 hasNonHealingWound: true,
 hasSepsis: false,
 lifeExpectancyLessThan2Years: false,
 hasAdequateRunoff: true,
 targetVesselDiameter: 4.0,
 hasPriorBypass: false,
 hasSaphenousVein: true,
 ambulatory: true,
 functionalStatus: 'independent',
  });

  const checkContraindications = (): ContraindicationResult[] => {
 const results: ContraindicationResult[] = [];

 // Endovascular Revascularization
 let endoStatus: ContraindicationResult['status'] = 'safe';
 let endoLevel: ContraindicationResult['level'] = 'none';
 const endoReasons: string[] = []; const endoAlts: string[] = []; const endoMon: string[] = ['Post-procedure duplex surveillance', 'Renal function monitoring']; const endoPrec: string[] = [];
 if (patientData.targetVesselDiameter < 2) { endoStatus = 'contraindicated'; endoLevel = 'absolute'; endoReasons.push('Target vessel <2mm - not feasible for endovascular access'); endoAlts.push('Consider wound care only', 'Amputation evaluation if CLI'); }
 if (patientData.hasSepsis) { endoStatus = 'contraindicated'; endoLevel = 'absolute'; endoReasons.push('Active sepsis - procedural risk too high'); endoAlts.push('Stabilize sepsis first, reassess'); }
 if (patientData.hasContrastAllergy && endoStatus !== 'contraindicated') { endoStatus = 'caution'; endoLevel = 'relative'; endoReasons.push('Contrast allergy'); endoPrec.push('Premedicate with steroids/antihistamines', 'Consider CO2 angiography'); }
 if (patientData.hasCKDStage4Plus && endoStatus !== 'contraindicated') { endoStatus = 'caution'; endoLevel = 'relative'; endoReasons.push('CKD Stage 4+ - contrast nephropathy risk'); endoPrec.push('CO2 angiography preferred', 'Minimize contrast volume', 'Pre/post hydration protocol'); }
 if (patientData.inr > 2.5 && endoStatus !== 'contraindicated') { endoStatus = 'caution'; endoLevel = 'relative'; endoReasons.push('Elevated INR - bleeding risk'); endoPrec.push('Correct coagulopathy pre-procedure'); }
 results.push({ therapy: 'Endovascular Revascularization', status: endoStatus, level: endoLevel, reasons: endoReasons, alternatives: endoAlts, monitoring: endoMon, precautions: endoPrec });

 // Surgical Bypass
 let surgStatus: ContraindicationResult['status'] = 'safe';
 let surgLevel: ContraindicationResult['level'] = 'none';
 const surgReasons: string[] = []; const surgAlts: string[] = []; const surgMon: string[] = ['Graft surveillance duplex', 'Wound checks', 'Cardiac monitoring']; const surgPrec: string[] = [];
 if (patientData.functionalStatus === 'nonambulatory' && !patientData.hasNonHealingWound) { surgStatus = 'contraindicated'; surgLevel = 'absolute'; surgReasons.push('Non-ambulatory without wound - risk exceeds benefit'); surgAlts.push('Conservative management', 'Endovascular approach if feasible'); }
 if (!patientData.hasSaphenousVein && !patientData.hasAdequateRunoff) { surgStatus = 'contraindicated'; surgLevel = 'absolute'; surgReasons.push('No suitable conduit and no adequate runoff'); surgAlts.push('Endovascular revascularization', 'Wound care optimization'); }
 if (patientData.lvef < 20) { surgStatus = 'contraindicated'; surgLevel = 'absolute'; surgReasons.push('Prohibitive surgical risk (LVEF <20%)'); surgAlts.push('Endovascular approach', 'Medical optimization first'); }
 if (!patientData.hasSaphenousVein && surgStatus !== 'contraindicated') { surgStatus = 'caution'; surgLevel = 'relative'; surgReasons.push('No saphenous vein - prosthetic conduit required'); surgPrec.push('Consider arm vein mapping', 'Prosthetic graft for above-knee only'); }
 if (!patientData.hasAdequateRunoff && surgStatus !== 'contraindicated') { surgStatus = 'caution'; surgLevel = 'relative'; surgReasons.push('Poor runoff vessels'); surgPrec.push('Careful target vessel selection', 'Consider hybrid approach'); }
 if (patientData.hasPriorBypass && surgStatus !== 'contraindicated') { surgStatus = 'caution'; surgLevel = 'relative'; surgReasons.push('Prior bypass - redo surgery complexity'); surgPrec.push('Review prior operative notes', 'Consider endovascular first'); }
 results.push({ therapy: 'Surgical Bypass', status: surgStatus, level: surgLevel, reasons: surgReasons, alternatives: surgAlts, monitoring: surgMon, precautions: surgPrec });

 // Atherectomy
 let athStatus: ContraindicationResult['status'] = 'safe';
 let athLevel: ContraindicationResult['level'] = 'none';
 const athReasons: string[] = []; const athAlts: string[] = []; const athMon: string[] = ['Post-procedure imaging', 'Distal embolization watch']; const athPrec: string[] = [];
 if (patientData.targetVesselDiameter < 2) { athStatus = 'contraindicated'; athLevel = 'absolute'; athReasons.push('Vessel <2mm - atherectomy device too large'); athAlts.push('Balloon angioplasty alone', 'Drug-coated balloon'); }
 if (patientData.targetVesselDiameter > 7) { athStatus = 'caution'; athLevel = 'relative'; athReasons.push('Large vessel - limited atherectomy efficacy'); athPrec.push('Consider stenting instead'); }
 if (patientData.hasCKDStage4Plus && athStatus !== 'contraindicated') { athStatus = 'caution'; athLevel = 'relative'; athReasons.push('CKD - contrast and atheroemboli risk'); athPrec.push('Minimize contrast use', 'Embolic protection device'); }
 results.push({ therapy: 'Atherectomy', status: athStatus, level: athLevel, reasons: athReasons, alternatives: athAlts, monitoring: athMon, precautions: athPrec });

 // Drug-Coated Balloon (DCB)
 let dcbStatus: ContraindicationResult['status'] = 'safe';
 let dcbLevel: ContraindicationResult['level'] = 'none';
 const dcbReasons: string[] = []; const dcbAlts: string[] = []; const dcbMon: string[] = ['Duplex surveillance at 6 months', 'Clinical assessment']; const dcbPrec: string[] = [];
 if (patientData.targetVesselDiameter < 2) { dcbStatus = 'caution'; dcbLevel = 'relative'; dcbReasons.push('Small vessel - limited DCB sizes available'); dcbPrec.push('Verify DCB size availability'); }
 results.push({ therapy: 'Drug-Coated Balloon (DCB)', status: dcbStatus, level: dcbLevel, reasons: dcbReasons, alternatives: dcbAlts, monitoring: dcbMon, precautions: dcbPrec });

 return results;
  };

  const results = checkContraindications();

  const updatePatientData = (key: keyof PatientData, value: any) => {
 setPatientData(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: ContraindicationResult['status']) => {
 switch (status) {
 case 'contraindicated': return 'text-red-800 bg-red-100 border-red-300';
 case 'caution': return 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]';
 case 'monitor': return 'text-porsche-800 bg-porsche-100 border-porsche-300';
 case 'safe': return 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getStatusIcon = (status: ContraindicationResult['status']) => {
 switch (status) {
 case 'contraindicated': return <XCircle className="w-5 h-5" />;
 case 'caution': return <AlertTriangle className="w-5 h-5" />;
 case 'monitor': return <Clock className="w-5 h-5" />;
 case 'safe': return <CheckCircle className="w-5 h-5" />;
 default: return <Shield className="w-5 h-5" />;
 }
  };

  const getTherapyIcon = (therapy: string) => {
 switch (therapy) {
 case 'Endovascular Revascularization': return <Zap className="w-5 h-5" />;
 case 'Surgical Bypass': return <Scissors className="w-5 h-5" />;
 case 'Atherectomy': return <Activity className="w-5 h-5" />;
 case 'Drug-Coated Balloon (DCB)': return <Circle className="w-5 h-5" />;
 default: return <Shield className="w-5 h-5" />;
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Shield className="w-8 h-8 text-crimson-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">PAD Intervention Contraindication Checker</h2>
 <p className="text-titanium-600">Evidence-based safety screening for peripheral vascular interventions</p>
 </div>
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-1 space-y-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <h3 className="font-semibold text-porsche-800 mb-3">Vascular & Labs</h3>
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 {[{k:'abi',l:'ABI',s:0.01},{k:'targetVesselDiameter',l:'Vessel (mm)',s:0.1},{k:'creatinine',l:'Creatinine',s:0.1},{k:'eGFR',l:'eGFR',s:1},{k:'hemoglobin',l:'Hgb (g/dL)',s:0.1},{k:'plateletCount',l:'Platelets (K)',s:1},{k:'inr',l:'INR',s:0.1},{k:'lvef',l:'LVEF (%)',s:1},{k:'age',l:'Age',s:1}].map(({k,l,s}) => (
 <div key={k}>
 <label className="block text-sm font-medium text-titanium-700 mb-1">{l}</label>
 <input type="number" step={s} value={patientData[k as keyof PatientData] as number} onChange={e => updatePatientData(k as keyof PatientData, parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
 </div>
 ))}
 </div>
 </div>
 </div>
 <div className="p-4 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
 <h3 className="font-semibold text-[#6B7280] mb-3">Clinical Conditions</h3>
 <div className="space-y-2">
 {[{k:'hasContrastAllergy',l:'Contrast allergy'},{k:'hasCKDStage4Plus',l:'CKD Stage 4+'},{k:'hasActiveInfection',l:'Active infection'},{k:'hasNonHealingWound',l:'Non-healing wound'},{k:'hasSepsis',l:'Sepsis'},{k:'lifeExpectancyLessThan2Years',l:'Life expectancy <2 years'},{k:'hasAdequateRunoff',l:'Adequate runoff'},{k:'hasPriorBypass',l:'Prior bypass'},{k:'hasSaphenousVein',l:'Saphenous vein available'},{k:'hasCAD',l:'Coronary artery disease'},{k:'ambulatory',l:'Ambulatory'}].map(c => (
 <label key={c.k} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
 <input type="checkbox" checked={patientData[c.k as keyof PatientData] as boolean} onChange={e => updatePatientData(c.k as keyof PatientData, e.target.checked)} className="rounded text-[#6B7280]" />
 <span className="text-sm font-medium text-titanium-700">{c.l}</span>
 </label>
 ))}
 <div className="mt-2">
 <label className="block text-sm font-medium text-titanium-700 mb-1">Functional Status</label>
 <select value={patientData.functionalStatus} onChange={e => updatePatientData('functionalStatus', e.target.value)} className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value="independent">Independent</option>
 <option value="dependent">Dependent</option>
 <option value="nonambulatory">Non-ambulatory</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 <div className="lg:col-span-2 space-y-6">
 <div className="grid grid-cols-2 gap-4">
 {results.map((result) => (
 <div key={result.therapy} className={`p-6 rounded-xl border-2 ${getStatusColor(result.status)}`}>
 <div className="flex items-center gap-3 mb-4">
 {getTherapyIcon(result.therapy)}
 <div className="flex-1">
 <div className="font-bold text-lg">{result.therapy}</div>
 <div className="flex items-center gap-2 mt-1">
 {getStatusIcon(result.status)}
 <span className="text-sm font-medium capitalize">{result.status}</span>
 {result.level !== 'none' && (<span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">{result.level}</span>)}
 </div>
 </div>
 </div>
 {result.reasons.length > 0 && (
 <div className="mb-4">
 <div className="text-sm font-semibold mb-2">Concerns:</div>
 <ul className="text-sm space-y-1">{result.reasons.map((reason) => (<li key={reason} className="flex items-start gap-1"><div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />{reason}</li>))}</ul>
 </div>
 )}
 {result.precautions.length > 0 && (
 <div className="mb-3">
 <div className="text-sm font-semibold mb-1">Precautions:</div>
 <ul className="text-sm space-y-1">{result.precautions.map((p) => (<li key={p} className="flex items-start gap-1"><div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />{p}</li>))}</ul>
 </div>
 )}
 <div className="text-sm"><span className="font-semibold">Monitoring:</span> {result.monitoring.join(', ')}</div>
 </div>
 ))}
 </div>
 {results.some(r => r.alternatives.length > 0) && (
 <div className="p-6 bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl">
 <h3 className="text-lg font-semibold text-[#6B7280] mb-4">Alternative Approaches</h3>
 <div className="space-y-4">
 {results.filter(r => r.alternatives.length > 0).map((result) => (
 <div key={result.therapy}>
 <div className="font-semibold text-[#6B7280] mb-2">{result.therapy}:</div>
 <ul className="text-sm text-[#6B7280] space-y-1">{result.alternatives.map((alt) => (<li key={alt} className="flex items-start gap-1"><div className="w-1 h-1 bg-[#F0F5FA] rounded-full mt-2 flex-shrink-0" />{alt}</li>))}</ul>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 <div className="mt-6 bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
 <p className="text-sm text-[#6B7280]">
 <strong>Guidelines:</strong> 2024 ACC/AHA PAD Guideline; 2017 ESC PAD Guideline; TASC II Inter-Society Consensus; Global Vascular Guidelines (GVG) on CLTI.
 </p>
 </div>
 </div>
  );
};

export default InterventionContraindicationChecker;
