import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Heart, Zap, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface PatientData {
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
  hasAnnularCalcification: boolean;
  hasVascularAccess: boolean;
  hasMitralAnnularCalcification: boolean;
  hasSevereMR: boolean;
  priorCardiacSurgery: boolean;
  hemodynamicInstability: boolean;
}

interface ContraindicationResult {
  therapy: 'TAVR' | 'SAVR' | 'MitraClip (TEER)' | 'Balloon Valvuloplasty';
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  considerations: string;
}

const ValveTherapyContraindicationChecker: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [patientData, setPatientData] = useState<PatientData>({
 age: ctx?.age ?? 78,
 bmi: ctx?.bmi ?? 26,
 stsScore: ctx?.stsScore ?? 5.2,
 euroScore: ctx?.euroScore ?? 4.8,
 lvef: ctx?.lvef ?? 45,
 frailtyIndex: ctx?.frailtyIndex ?? 3,
 hasPortalHTN: false,
 hasSevereRenalDisease: ctx?.dialysis ?? false,
 hasActiveEndocarditis: ctx?.activeEndocarditis ?? false,
 hasSeverePulmonaryHTN: false,
 hasLifeExpectancyLessThan1Year: false,
 hasBicuspidValve: false,
 hasAnnularCalcification: false,
 hasVascularAccess: true,
 hasMitralAnnularCalcification: false,
 hasSevereMR: true,
 priorCardiacSurgery: ctx?.priorCardiacSurgery ?? false,
 hemodynamicInstability: false,
  });

  const checkContraindications = (): ContraindicationResult[] => {
 const results: ContraindicationResult[] = [];

 // TAVR Assessment
 let tavrStatus: ContraindicationResult['status'] = 'safe';
 let tavrLevel: ContraindicationResult['level'] = 'none';
 const tavrReasons: string[] = [];
 const tavrAlternatives: string[] = [];
 const tavrMonitoring: string[] = ['Post-procedure echocardiography', 'Vascular access site monitoring', 'Rhythm monitoring for conduction disease'];

 if (patientData.hasActiveEndocarditis) {
 tavrStatus = 'contraindicated'; tavrLevel = 'absolute';
 tavrReasons.push('Active endocarditis'); tavrAlternatives.push('Treat infection first, then reassess');
 }
 if (patientData.hasLifeExpectancyLessThan1Year) {
 tavrStatus = 'contraindicated'; tavrLevel = 'absolute';
 tavrReasons.push('Life expectancy <1 year'); tavrAlternatives.push('Palliative care pathway', 'Balloon valvuloplasty as bridge');
 }
 if (patientData.hasBicuspidValve && tavrStatus !== 'contraindicated') {
 tavrStatus = 'caution'; tavrLevel = 'relative';
 tavrReasons.push('Bicuspid aortic valve (expanding indications)');
 tavrMonitoring.push('CT planning for bicuspid morphology', 'Consider newer-generation valves');
 }
 if (!patientData.hasVascularAccess && tavrStatus !== 'contraindicated') {
 tavrStatus = 'caution'; tavrLevel = 'relative';
 tavrReasons.push('Inadequate vascular access');
 tavrAlternatives.push('Transapical approach', 'Subclavian access', 'SAVR if feasible');
 }
 if (patientData.stsScore < 3 && tavrStatus !== 'contraindicated') {
 tavrStatus = 'monitor'; tavrLevel = 'relative';
 tavrReasons.push('Low surgical risk (STS <3%) - SAVR may be preferred');
 tavrMonitoring.push('Heart Team discussion for optimal approach');
 }
 if (patientData.hasAnnularCalcification && tavrStatus === 'safe') {
 tavrStatus = 'monitor';
 tavrReasons.push('Severe annular calcification - higher paravalvular leak risk');
 tavrMonitoring.push('CT calcium distribution assessment');
 }

 results.push({
 therapy: 'TAVR', status: tavrStatus, level: tavrLevel,
 reasons: tavrReasons, alternatives: tavrAlternatives, monitoring: tavrMonitoring,
 considerations: tavrStatus === 'safe' ? 'Suitable candidate for TAVR - proceed with CT planning' : 'Review specific concerns before proceeding',
 });

 // SAVR Assessment
 let savrStatus: ContraindicationResult['status'] = 'safe';
 let savrLevel: ContraindicationResult['level'] = 'none';
 const savrReasons: string[] = [];
 const savrAlternatives: string[] = [];
 const savrMonitoring: string[] = ['Standard post-surgical monitoring', 'Anticoagulation management', 'Wound care and recovery'];

 if (patientData.stsScore > 8) {
 savrStatus = 'contraindicated'; savrLevel = 'absolute';
 savrReasons.push('Prohibitive surgical risk (STS >8%)');
 savrAlternatives.push('TAVR preferred', 'Balloon valvuloplasty as bridge');
 }
 if (patientData.frailtyIndex >= 5 && savrStatus !== 'contraindicated') {
 savrStatus = 'caution'; savrLevel = 'relative';
 savrReasons.push('Significant frailty (index >= 5)');
 savrMonitoring.push('Frailty-directed prehabilitation', 'Consider TAVR alternative');
 }
 if (patientData.priorCardiacSurgery && savrStatus !== 'contraindicated') {
 savrStatus = 'caution'; savrLevel = 'relative';
 savrReasons.push('Prior cardiac surgery (redo sternotomy risk)');
 savrMonitoring.push('CT chest for sternal wire/graft proximity', 'Consider minimally invasive approach');
 savrAlternatives.push('TAVR to avoid redo sternotomy');
 }
 if (patientData.hasSevereRenalDisease && savrStatus === 'safe') {
 savrStatus = 'monitor';
 savrReasons.push('Severe renal disease - increased perioperative risk');
 savrMonitoring.push('Nephrology consultation', 'Dialysis planning');
 }

 results.push({
 therapy: 'SAVR', status: savrStatus, level: savrLevel,
 reasons: savrReasons, alternatives: savrAlternatives, monitoring: savrMonitoring,
 considerations: savrStatus === 'safe' ? 'Suitable for surgical aortic valve replacement' : 'Review risk-benefit with Heart Team',
 });

 // MitraClip (TEER) Assessment
 let mcStatus: ContraindicationResult['status'] = 'safe';
 let mcLevel: ContraindicationResult['level'] = 'none';
 const mcReasons: string[] = [];
 const mcAlternatives: string[] = [];
 const mcMonitoring: string[] = ['TEE-guided procedure monitoring', 'Post-procedure echocardiography', 'Heart failure symptom assessment'];

 if (!patientData.hasSevereMR) {
 mcStatus = 'contraindicated'; mcLevel = 'absolute';
 mcReasons.push('MR not suitable anatomy or not severe');
 mcAlternatives.push('Medical therapy optimization', 'Surgical mitral repair if indicated');
 }
 if (patientData.hasActiveEndocarditis && mcStatus !== 'contraindicated') {
 mcStatus = 'contraindicated'; mcLevel = 'absolute';
 mcReasons.push('Active endocarditis');
 mcAlternatives.push('Treat infection first');
 }
 if (patientData.lvef < 20 && mcStatus !== 'contraindicated') {
 mcStatus = 'caution'; mcLevel = 'relative';
 mcReasons.push('Severely reduced EF (<20%) - limited benefit');
 mcMonitoring.push('Advanced HF evaluation', 'LVAD/transplant consideration');
 }
 if (patientData.hasSeverePulmonaryHTN && mcStatus !== 'contraindicated') {
 mcStatus = 'caution'; mcLevel = 'relative';
 mcReasons.push('Severe pulmonary hypertension');
 mcMonitoring.push('Right heart catheterization', 'Pulmonary vasodilator assessment');
 }
 if (patientData.hasMitralAnnularCalcification && mcStatus === 'safe') {
 mcStatus = 'monitor';
 mcReasons.push('Mitral annular calcification may affect clip placement');
 mcMonitoring.push('3D TEE assessment of anatomy');
 }

 results.push({
 therapy: 'MitraClip (TEER)', status: mcStatus, level: mcLevel,
 reasons: mcReasons, alternatives: mcAlternatives, monitoring: mcMonitoring,
 considerations: mcStatus === 'safe' ? 'Candidate for transcatheter edge-to-edge repair' : 'Anatomic and clinical suitability concerns identified',
 });

 // Balloon Valvuloplasty Assessment
 let bvStatus: ContraindicationResult['status'] = 'safe';
 let bvLevel: ContraindicationResult['level'] = 'none';
 const bvReasons: string[] = [];
 const bvAlternatives: string[] = [];
 const bvMonitoring: string[] = ['Hemodynamic monitoring during procedure', 'Post-procedure gradient assessment', 'Follow-up planning for definitive therapy'];

 if (patientData.lvef < 30) {
 bvStatus = 'caution'; bvLevel = 'relative';
 bvReasons.push('Severe aortic regurgitation risk with low EF');
 bvMonitoring.push('Careful balloon sizing', 'Hemodynamic support standby');
 }
 if (patientData.hasAnnularCalcification) {
 bvStatus = 'caution'; bvLevel = 'relative';
 bvReasons.push('Heavy calcification - limited durability and higher complication risk');
 bvAlternatives.push('TAVR if anatomically suitable');
 }
 if (patientData.hemodynamicInstability && bvStatus === 'safe') {
 bvStatus = 'monitor';
 bvReasons.push('Hemodynamic instability - bridge procedure only');
 bvMonitoring.push('Plan definitive intervention within 30 days');
 }

 results.push({
 therapy: 'Balloon Valvuloplasty', status: bvStatus, level: bvLevel,
 reasons: bvReasons, alternatives: bvAlternatives, monitoring: bvMonitoring,
 considerations: bvStatus === 'safe' ? 'Can be performed as bridge to definitive therapy' : 'Temporary measure only - plan definitive intervention',
 });

 return results;
  };

  const results = checkContraindications();

  const updatePatientData = (key: keyof PatientData, value: any) => {
 setPatientData(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: ContraindicationResult['status']) => {
 switch (status) {
 case 'contraindicated': return 'text-crimson-800 bg-crimson-100 border-crimson-300';
 case 'caution': return 'text-amber-800 bg-amber-100 border-amber-300';
 case 'monitor': return 'text-porsche-800 bg-porsche-100 border-porsche-300';
 case 'safe': return 'text-green-800 bg-green-100 border-green-300';
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
 case 'TAVR': return <Heart className="w-5 h-5" />;
 case 'SAVR': return <Activity className="w-5 h-5" />;
 case 'MitraClip (TEER)': return <Zap className="w-5 h-5" />;
 case 'Balloon Valvuloplasty': return <Shield className="w-5 h-5" />;
 default: return <Heart className="w-5 h-5" />;
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Shield className="w-8 h-8 text-crimson-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">Valve Therapy Contraindication Checker</h2>
 <p className="text-titanium-600">Evidence-based safety screening for valve interventions</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-1 space-y-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <h3 className="font-semibold text-porsche-800 mb-3">Risk Scores & Vitals</h3>
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 {[
 {key: 'age', label: 'Age', step: '1'},
 {key: 'bmi', label: 'BMI', step: '0.1'},
 {key: 'stsScore', label: 'STS Score (%)', step: '0.1'},
 {key: 'euroScore', label: 'EuroSCORE II (%)', step: '0.1'},
 {key: 'lvef', label: 'LVEF (%)', step: '1'},
 {key: 'frailtyIndex', label: 'Frailty Index', step: '1'},
 ].map(({key, label, step}) => (
 <div key={key}>
 <label className="block text-sm font-medium text-titanium-700 mb-1">{label}</label>
 <input
 type="number"
 step={step}
 value={patientData[key as keyof PatientData] as number}
 onChange={(e) => updatePatientData(key as keyof PatientData, parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
 <h3 className="font-semibold text-amber-800 mb-3">Clinical Conditions</h3>
 <div className="space-y-3">
 {[
 { key: 'hasActiveEndocarditis', label: 'Active endocarditis' },
 { key: 'hasLifeExpectancyLessThan1Year', label: 'Life expectancy <1 year' },
 { key: 'hasBicuspidValve', label: 'Bicuspid aortic valve' },
 { key: 'hasAnnularCalcification', label: 'Severe annular calcification' },
 { key: 'hasVascularAccess', label: 'Adequate vascular access' },
 { key: 'hasSeverePulmonaryHTN', label: 'Severe pulmonary HTN' },
 { key: 'hasSevereRenalDisease', label: 'Severe renal disease (eGFR <20)' },
 { key: 'hasSevereMR', label: 'Severe mitral regurgitation' },
 { key: 'hasMitralAnnularCalcification', label: 'Mitral annular calcification' },
 { key: 'hasPortalHTN', label: 'Portal hypertension' },
 { key: 'priorCardiacSurgery', label: 'Prior cardiac surgery' },
 { key: 'hemodynamicInstability', label: 'Hemodynamic instability' },
 ].map((condition) => (
 <label key={condition.key} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={patientData[condition.key as keyof PatientData] as boolean}
 onChange={(e) => updatePatientData(condition.key as keyof PatientData, e.target.checked)}
 className="rounded text-amber-600"
 />
 <span className="text-sm font-medium text-titanium-700">{condition.label}</span>
 </label>
 ))}
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
 {result.level !== 'none' && (
 <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
 {result.level}
 </span>
 )}
 </div>
 </div>
 </div>

 {result.reasons.length > 0 && (
 <div className="mb-4">
 <div className="text-sm font-semibold mb-2">Concerns:</div>
 <ul className="text-sm space-y-1">
 {result.reasons.map((reason) => (
 <li key={reason} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></div>
 {reason}
 </li>
 ))}
 </ul>
 </div>
 )}

 <div className="text-sm mt-3 p-2 bg-white bg-opacity-50 rounded">
 <span className="font-semibold">Assessment:</span> {result.considerations}
 </div>
 </div>
 ))}
 </div>

 <div className="p-6 bg-white rounded-xl border border-titanium-200 shadow-chrome-card-hover">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4">Monitoring Requirements</h3>
 <div className="grid grid-cols-2 gap-6">
 {results.map((result) => (
 <div key={result.therapy} className="space-y-3">
 <div className="font-semibold text-titanium-900 flex items-center gap-2">
 {getTherapyIcon(result.therapy)}
 {result.therapy}
 </div>
 <ul className="text-sm text-titanium-700 space-y-1">
 {result.monitoring.map((item) => (
 <li key={item} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-titanium-400 rounded-full mt-2 flex-shrink-0"></div>
 {item}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>

 {results.some(r => r.alternatives.length > 0) && (
 <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
 <h3 className="text-lg font-semibold text-amber-800 mb-4">Alternative Pathways</h3>
 <div className="space-y-4">
 {results.filter(r => r.alternatives.length > 0).map((result) => (
 <div key={result.therapy}>
 <div className="font-semibold text-amber-800 mb-2">{result.therapy} Alternatives:</div>
 <ul className="text-sm text-amber-700 space-y-1">
 {result.alternatives.map((alt) => (
 <li key={alt} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
 {alt}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Guidelines:</strong> 2020 ACC/AHA Valvular Heart Disease Guideline; 2021 ESC/EACTS Valvular Heart Disease Guideline; STS/ACC TVT Registry Standards.
 </p>
 </div>
 </div>
  );
};

export default ValveTherapyContraindicationChecker;
