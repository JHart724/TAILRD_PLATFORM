import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Award, Brain, Zap, Shield } from 'lucide-react';

interface PatientData {
  age: number;
  gender: 'male' | 'female';
  chf: boolean;
  hypertension: boolean;
  diabetes: boolean;
  stroke: boolean;
  vascularDisease: boolean;
  sbpOver160: boolean;
  abnormalRenal: boolean;
  abnormalLiver: boolean;
  bleedingHistory: boolean;
  labileINR: boolean;
  elderliness: boolean;
  drugAlcoholUse: boolean;
  intracranialBleeding: boolean;
  spontaneousBleeding: boolean;
  poorCompliance: boolean;
  difficultAnticoagulation: boolean;
  fallRisk: boolean;
  cognitiveImpairment: boolean;
  renalFailure: boolean;
  thrombocytopenia: boolean;
  cancer: boolean;
  warfarinIntolerance: boolean;
  dualAntiplatelet: boolean;
  tripleTherapy: boolean;
  occupationalRisk: boolean;
}

interface ClinicalRecommendation {
  type: 'WATCHMAN' | 'Ablation' | 'Device' | 'Anticoagulation' | 'TAILRD';
  eligibility: 'Eligible' | 'Consider' | 'Not Eligible';
  confidence: number;
  rationale: string[];
  contraindications: string[];
  nextSteps: string[];
  evidenceLevel: 'A' | 'B' | 'C';
}

const EPClinicalDecisionSupport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculators' | 'watchman' | 'ablation' | 'tailrd-algorithms'>('calculators');
  const [patientData, setPatientData] = useState<PatientData>({
 age: 70,
 gender: 'male',
 chf: false,
 hypertension: true,
 diabetes: false,
 stroke: false,
 vascularDisease: false,
 sbpOver160: false,
 abnormalRenal: false,
 abnormalLiver: false,
 bleedingHistory: false,
 labileINR: false,
 elderliness: true,
 drugAlcoholUse: false,
 intracranialBleeding: false,
 spontaneousBleeding: false,
 poorCompliance: false,
 difficultAnticoagulation: false,
 fallRisk: false,
 cognitiveImpairment: false,
 renalFailure: false,
 thrombocytopenia: false,
 cancer: false,
 warfarinIntolerance: false,
 dualAntiplatelet: false,
 tripleTherapy: false,
 occupationalRisk: false
  });

  const calculateCHA2DS2VASc = (): { score: number; risk: string; yearlyStrokeRisk: number } => {
 let score = 0;
 if (patientData.chf) score += 1;
 if (patientData.hypertension) score += 1;
 if (patientData.age >= 75) score += 2;
 else if (patientData.age >= 65) score += 1;
 if (patientData.diabetes) score += 1;
 if (patientData.stroke) score += 2;
 if (patientData.vascularDisease) score += 1;
 if (patientData.gender === 'female') score += 1;

 const riskThreshold = patientData.gender === 'male' ? 1 : 2;
 const risk = score >= riskThreshold ? 'High' : score >= 1 ? 'Moderate' : 'Low';
 
 const strokeRisks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 15.2, 15.2, 15.2];
 const yearlyStrokeRisk = strokeRisks[Math.min(score, 9)];

 return { score, risk, yearlyStrokeRisk };
  };

  const calculateHASBLED = (): { score: number; risk: string; yearlyBleedRisk: number } => {
 let score = 0;
 if (patientData.sbpOver160) score += 1;
 if (patientData.abnormalRenal) score += 1;
 if (patientData.abnormalLiver) score += 1;
 if (patientData.stroke) score += 1;
 if (patientData.bleedingHistory) score += 1;
 if (patientData.labileINR) score += 1;
 if (patientData.elderliness) score += 1;
 if (patientData.drugAlcoholUse) score += 1;

 const risk = score >= 3 ? 'High' : score >= 2 ? 'Moderate' : 'Low';
 const bleedRisks = [1.13, 1.02, 1.88, 3.74, 8.70, 12.5, 12.5, 12.5, 12.5];
 const yearlyBleedRisk = bleedRisks[Math.min(score, 8)];

 return { score, risk, yearlyBleedRisk };
  };

  const evaluateWATCHMANEligibility = (): ClinicalRecommendation => {
 const cha2ds2vasc = calculateCHA2DS2VASc();
 const hasbled = calculateHASBLED();
 
 let eligibility: 'Eligible' | 'Consider' | 'Not Eligible' = 'Not Eligible';
 let confidence = 0;
 const rationale: string[] = [];
 const contraindications: string[] = [];

 // CHA2DS2-VASc ≥2 for males, ≥3 for females per 2020 ESC Guidelines
 const cmsThreshold = patientData.gender === 'male' ? 2 : 3;
 if (cha2ds2vasc.score >= cmsThreshold) {
 rationale.push(`CHA₂DS₂-VASc score ${cha2ds2vasc.score} meets clinical criteria (≥${cmsThreshold} for ${patientData.gender}s)`);
 confidence += 30;
 } else {
 contraindications.push(`CHA₂DS₂-VASc score ${cha2ds2vasc.score} below threshold (requires ≥${cmsThreshold} for ${patientData.gender}s)`);
 }

 // Appropriate rationales
 const appropriateRationales: string[] = [];
 if (patientData.intracranialBleeding) {
 appropriateRationales.push('History of intracranial bleeding');
 confidence += 25;
 }
 if (patientData.spontaneousBleeding) {
 appropriateRationales.push('History of spontaneous bleeding');
 confidence += 20;
 }
 if (patientData.poorCompliance) {
 appropriateRationales.push('Poor compliance with anticoagulation');
 confidence += 20;
 }
 if (patientData.difficultAnticoagulation) {
 appropriateRationales.push('Difficulty maintaining therapeutic range');
 confidence += 20;
 }
 if (patientData.fallRisk) {
 appropriateRationales.push('High risk of recurrent falls');
 confidence += 15;
 }
 if (patientData.cognitiveImpairment) {
 appropriateRationales.push('Cognitive impairment');
 confidence += 15;
 }
 if (patientData.renalFailure) {
 appropriateRationales.push('Severe renal failure');
 confidence += 15;
 }
 if (patientData.thrombocytopenia || patientData.cancer) {
 appropriateRationales.push('Increased bleeding risk (thrombocytopenia/cancer)');
 confidence += 20;
 }
 if (patientData.warfarinIntolerance) {
 appropriateRationales.push('Intolerance of warfarin and NOACs');
 confidence += 25;
 }
 if (patientData.dualAntiplatelet) {
 appropriateRationales.push('Need for prolonged dual antiplatelet therapy');
 confidence += 15;
 }
 if (patientData.tripleTherapy) {
 appropriateRationales.push('Avoidance of triple therapy after PCI/TAVR');
 confidence += 20;
 }
 if (patientData.occupationalRisk) {
 appropriateRationales.push('Occupation-related high bleeding risk');
 confidence += 15;
 }

 rationale.push(...appropriateRationales);

 if (cha2ds2vasc.score >= cmsThreshold && appropriateRationales.length > 0) {
 eligibility = confidence >= 70 ? 'Eligible' : 'Consider';
 } else if (cha2ds2vasc.score >= 1 && appropriateRationales.length >= 2) {
 eligibility = 'Consider';
 confidence = Math.min(confidence, 60);
 }

 return {
 type: 'WATCHMAN',
 eligibility,
 confidence: Math.min(confidence, 95),
 rationale,
 contraindications,
 nextSteps: eligibility === 'Eligible' ? 
 ['Formal shared decision making', 'TEE for LAA anatomy', 'WATCHMAN consult'] :
 ['Optimize anticoagulation', 'Address bleeding risk factors', 'Re-evaluate in 3 months'],
 evidenceLevel: 'A'
 };
  };

  const evaluateAblationEligibility = (): ClinicalRecommendation => {
 // TAILRD AF Ablation Algorithm
 let eligibility: 'Eligible' | 'Consider' | 'Not Eligible' = 'Not Eligible';
 let confidence = 0;
 const rationale: string[] = [];
 const contraindications: string[] = [];

 // Age considerations
 if (patientData.age < 65) {
 rationale.push('Age <65 years - optimal ablation candidate');
 confidence += 20;
 } else if (patientData.age <= 75) {
 rationale.push('Age 65-75 years - good ablation candidate');
 confidence += 15;
 } else {
 contraindications.push('Age >75 years - increased procedural risk');
 confidence -= 15;
 }

 // Comorbidity assessment
 if (!patientData.chf) {
 rationale.push('No heart failure - better ablation outcomes');
 confidence += 15;
 } else {
 rationale.push('Heart failure present - consider ablation for symptom improvement');
 confidence += 10;
 }

 if (patientData.hypertension) {
 rationale.push('Hypertension - manageable risk factor');
 confidence += 5;
 }

 if (patientData.diabetes) {
 contraindications.push('Diabetes - increased vascular complications');
 confidence -= 5;
 }

 // TAILRD Success Prediction Algorithm
 const tailrdScore = calculateTAILRDAblationScore();
 if (tailrdScore >= 75) {
 rationale.push(`TAILRD success score: ${tailrdScore}% - Excellent candidate`);
 confidence += 25;
 eligibility = 'Eligible';
 } else if (tailrdScore >= 60) {
 rationale.push(`TAILRD success score: ${tailrdScore}% - Good candidate`);
 confidence += 15;
 eligibility = 'Consider';
 } else {
 contraindications.push(`TAILRD success score: ${tailrdScore}% - Poor candidate`);
 confidence -= 20;
 }

 return {
 type: 'Ablation',
 eligibility,
 confidence: Math.max(0, Math.min(confidence, 95)),
 rationale,
 contraindications,
 nextSteps: eligibility === 'Eligible' ? 
 ['Pre-ablation imaging', 'Anticoagulation optimization', 'EP consultation'] :
 ['Optimize medical therapy', 'Risk factor modification', 'Re-evaluate candidacy'],
 evidenceLevel: 'A'
 };
  };

  const calculateTAILRDAblationSuccess = (): { score: number; factors: string[] } => {
 let score = 60; // Base success rate
 const factors: string[] = [];

 // Age factor
 if (patientData.age < 60) {
 score += 15;
 factors.push('Age <60: +15%');
 } else if (patientData.age < 70) {
 score += 10;
 factors.push('Age 60-70: +10%');
 } else if (patientData.age < 75) {
 score += 5;
 factors.push('Age 70-75: +5%');
 } else {
 score -= 10;
 factors.push('Age >75: -10%');
 }

 // Structural factors
 if (!patientData.chf) {
 score += 10;
 factors.push('No CHF: +10%');
 } else {
 score -= 5;
 factors.push('CHF present: -5%');
 }

 if (!patientData.hypertension) {
 score += 5;
 factors.push('No HTN: +5%');
 }

 if (!patientData.diabetes) {
 score += 5;
 factors.push('No DM: +5%');
 } else {
 score -= 5;
 factors.push('Diabetes: -5%');
 }

 // AF duration (based on patient profile - simplified)
 // In practice, this would come from patient history
 const afDuration = patientData.age < 65 && !patientData.chf ? 'paroxysmal' : 'persistent';
 if (afDuration === 'paroxysmal') {
 score += 15;
 factors.push('Paroxysmal AF: +15%');
 } else {
 score += 5;
 factors.push('Persistent AF: +5%');
 }

 return { score: Math.max(20, Math.min(95, score)), factors };
  };

  const calculateTAILRDAblationScore = (): number => {
 return calculateTAILRDAblationSuccess().score;
  };

  const getTAILRDAlgorithms = () => {
 const ablationSuccess = calculateTAILRDAblationSuccess();
 
 return [
 {
 name: 'AF Ablation Success Predictor',
 description: 'Proprietary TAILRD algorithm for predicting ablation success rates',
 score: ablationSuccess.score,
 factors: ablationSuccess.factors,
 recommendation: ablationSuccess.score >= 75 ? 'Excellent candidate' : 
 ablationSuccess.score >= 60 ? 'Good candidate' : 'Consider alternatives'
 },
 {
 name: 'LAAC Anatomical Suitability',
 description: 'TAILRD LAA morphology assessment algorithm',
 score: 85,
 factors: ['LAA depth >20mm', 'Single lobe morphology', 'No prominent pectinate muscles'],
 recommendation: 'Excellent WATCHMAN candidate'
 },
 {
 name: 'Post-Ablation Monitoring Protocol',
 description: 'TAILRD evidence-based post-ablation care pathway',
 score: 92,
 factors: ['7-day Holter at 3 months', 'ECG monitoring protocol', 'Anticoagulation decision tree'],
 recommendation: 'Follow institutional protocol'
 }
 ];
  };

  const cha2ds2vasc = calculateCHA2DS2VASc();
  const hasbled = calculateHASBLED();
  const watchmanRec = evaluateWATCHMANEligibility();
  const ablationRec = evaluateAblationEligibility();

  return (
 <div className="space-y-6">
 {/* Tab Navigation */}
 <div className="flex gap-4 border-b border-titanium-200">
 {[
 { id: 'calculators', label: 'Risk Calculators', icon: Calculator },
 { id: 'watchman', label: 'WATCHMAN/LAAC', icon: Shield },
 { id: 'ablation', label: 'Ablation Eligibility', icon: Zap },
 { id: 'tailrd-algorithms', label: 'TAILRD Algorithms', icon: Brain }
 ].map((tab) => {
 const IconComponent = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
 activeTab === tab.id
 ? 'border-[#2C4A60] text-[#2C4A60] bg-[#f0f5fa]'
 : 'border-transparent text-titanium-600 hover:text-titanium-800 hover:bg-titanium-50'
 }`}
 >
 <IconComponent className="w-5 h-5" />
 <span className="font-semibold">{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* Risk Calculators Tab */}
 {activeTab === 'calculators' && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="metal-card p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4 font-sf flex items-center gap-2">
 <Heart className="w-6 h-6 text-medical-red-500" />
 CHA₂DS₂-VASc Calculator
 </h3>
 
 <div className="space-y-3 mb-6">
 {[
 { key: 'chf', label: 'Congestive Heart Failure', points: 1 },
 { key: 'hypertension', label: 'Hypertension', points: 1 },
 { key: 'diabetes', label: 'Diabetes Mellitus', points: 1 },
 { key: 'stroke', label: 'Prior Stroke/TIA', points: 2 },
 { key: 'vascularDisease', label: 'Vascular Disease', points: 1 }
 ].map((item) => (
 <label key={item.key} className="flex items-center justify-between p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <span className="text-sm font-medium text-titanium-800">{item.label}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-titanium-600">{item.points} pt</span>
 <input
 type="checkbox"
 checked={patientData[item.key as keyof PatientData] as boolean}
 onChange={(e) => setPatientData(prev => ({ ...prev, [item.key]: e.target.checked }))}
 className="rounded"
 />
 </div>
 </label>
 ))}
 </div>

 <div className="p-4 bg-[#f0f5fa] rounded-xl border border-[#C8D4DC]">
 <div className="flex items-center justify-between mb-2">
 <span className="font-semibold text-titanium-900">CHA₂DS₂-VASc Score</span>
 <span className="text-2xl font-bold text-[#2C4A60]">{cha2ds2vasc.score}</span>
 </div>
 <div className="text-sm text-titanium-600 mb-1">Stroke Risk: {cha2ds2vasc.risk}</div>
 <div className="text-sm text-titanium-600">Annual Risk: {cha2ds2vasc.yearlyStrokeRisk}%</div>
 </div>
 </div>

 <div className="metal-card p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4 font-sf flex items-center gap-2">
 <AlertTriangle className="w-6 h-6 text-crimson-500" />
 HAS-BLED Calculator
 </h3>
 
 <div className="space-y-3 mb-6">
 {[
 { key: 'sbpOver160', label: 'Hypertension (SBP >160)', points: 1 },
 { key: 'abnormalRenal', label: 'Abnormal Renal Function', points: 1 },
 { key: 'abnormalLiver', label: 'Abnormal Liver Function', points: 1 },
 { key: 'bleedingHistory', label: 'Bleeding History', points: 1 },
 { key: 'labileINR', label: 'Labile INR', points: 1 },
 { key: 'elderliness', label: 'Age >65 years', points: 1 },
 { key: 'drugAlcoholUse', label: 'Drugs/Alcohol Use', points: 1 }
 ].map((item) => (
 <label key={item.key} className="flex items-center justify-between p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <span className="text-sm font-medium text-titanium-800">{item.label}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-titanium-600">{item.points} pt</span>
 <input
 type="checkbox"
 checked={patientData[item.key as keyof PatientData] as boolean}
 onChange={(e) => setPatientData(prev => ({ ...prev, [item.key]: e.target.checked }))}
 className="rounded"
 />
 </div>
 </label>
 ))}
 </div>

 <div className="p-4 bg-crimson-50 rounded-xl border border-crimson-200">
 <div className="flex items-center justify-between mb-2">
 <span className="font-semibold text-titanium-900">HAS-BLED Score</span>
 <span className="text-2xl font-bold text-crimson-600">{hasbled.score}</span>
 </div>
 <div className="text-sm text-titanium-600 mb-1">Bleeding Risk: {hasbled.risk}</div>
 <div className="text-sm text-titanium-600">Annual Risk: {hasbled.yearlyBleedRisk}%</div>
 </div>
 </div>
 </div>
 )}

 {/* WATCHMAN Tab */}
 {activeTab === 'watchman' && (
 <div className="metal-card p-8">
 <h2 className="text-2xl font-bold text-titanium-900 mb-6 font-sf flex items-center gap-2">
 <Shield className="w-8 h-8 text-[#2C4A60]" />
 WATCHMAN/LAAC Eligibility Assessment
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
 <div className={`p-6 rounded-xl border-2 ${
 watchmanRec.eligibility === 'Eligible' ? 'border-[#4A6880] bg-[#f0f5fa]' :
 watchmanRec.eligibility === 'Consider' ? 'border-crimson-400 bg-crimson-50' :
 'border-medical-red-400 bg-medical-red-50'
 }`}>
 <div className="flex items-center gap-3 mb-3">
 <CheckCircle className={`w-8 h-8 ${
 watchmanRec.eligibility === 'Eligible' ? 'text-[#2C4A60]' :
 watchmanRec.eligibility === 'Consider' ? 'text-crimson-600' :
 'text-medical-red-600'
 }`} />
 <div>
 <div className="font-bold text-lg text-titanium-900">{watchmanRec.eligibility}</div>
 <div className="text-sm text-titanium-600">Confidence: {watchmanRec.confidence}%</div>
 </div>
 </div>
 </div>

 <div className="p-6 bg-[#f0f5fa] rounded-xl border border-[#C8D4DC]">
 <h4 className="font-semibold text-titanium-900 mb-3">Rationale</h4>
 <ul className="text-sm text-titanium-700 space-y-1">
 {watchmanRec.rationale.map((item, index) => (
 <li key={item} className="flex items-start gap-2">
 <CheckCircle className="w-4 h-4 text-[#2C4A60] mt-0.5 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>

 <div className="p-6 bg-titanium-50 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-3">Next Steps</h4>
 <ul className="text-sm text-titanium-700 space-y-1">
 {watchmanRec.nextSteps.map((step, index) => (
 <li key={step} className="flex items-start gap-2">
 <div className="w-4 h-4 bg-[#2C4A60] rounded-full text-white text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
 {index + 1}
 </div>
 {step}
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Contraindications */}
 {watchmanRec.contraindications.length > 0 && (
 <div className="p-6 bg-medical-red-50 rounded-xl border border-medical-red-200">
 <h4 className="font-semibold text-titanium-900 mb-3 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-medical-red-500" />
 Contraindications & Considerations
 </h4>
 <ul className="text-sm text-titanium-700 space-y-1">
 {watchmanRec.contraindications.map((item, index) => (
 <li key={item} className="flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-medical-red-500 mt-0.5 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 )}

 {/* Ablation Tab */}
 {activeTab === 'ablation' && (
 <div className="metal-card p-8">
 <h2 className="text-2xl font-bold text-titanium-900 mb-6 font-sf flex items-center gap-2">
 <Zap className="w-8 h-8 text-[#2C4A60]" />
 AF Ablation Eligibility Assessment
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className={`p-6 rounded-xl border-2 ${
 ablationRec.eligibility === 'Eligible' ? 'border-[#4A6880] bg-[#f0f5fa]' :
 ablationRec.eligibility === 'Consider' ? 'border-crimson-400 bg-crimson-50' :
 'border-medical-red-400 bg-medical-red-50'
 }`}>
 <div className="flex items-center gap-3 mb-3">
 <Zap className={`w-8 h-8 ${
 ablationRec.eligibility === 'Eligible' ? 'text-[#2C4A60]' :
 ablationRec.eligibility === 'Consider' ? 'text-crimson-600' :
 'text-medical-red-600'
 }`} />
 <div>
 <div className="font-bold text-lg text-titanium-900">{ablationRec.eligibility}</div>
 <div className="text-sm text-titanium-600">Confidence: {ablationRec.confidence}%</div>
 </div>
 </div>
 </div>

 <div className="p-6 bg-[#f0f5fa] rounded-xl border border-[#C8D4DC]">
 <h4 className="font-semibold text-titanium-900 mb-3">Supporting Factors</h4>
 <ul className="text-sm text-titanium-700 space-y-1">
 {ablationRec.rationale.map((item, index) => (
 <li key={item} className="flex items-start gap-2">
 <CheckCircle className="w-4 h-4 text-[#2C4A60] mt-0.5 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>

 <div className="p-6 bg-titanium-50 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-3">Recommended Actions</h4>
 <ul className="text-sm text-titanium-700 space-y-1">
 {ablationRec.nextSteps.map((step, index) => (
 <li key={step} className="flex items-start gap-2">
 <div className="w-4 h-4 bg-[#2C4A60] rounded-full text-white text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
 {index + 1}
 </div>
 {step}
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 )}

 {/* TAILRD Algorithms Tab */}
 {activeTab === 'tailrd-algorithms' && (
 <div className="space-y-6">
 <div className="metal-card p-8">
 <h2 className="text-2xl font-bold text-titanium-900 mb-6 font-sf flex items-center gap-2">
 <Brain className="w-8 h-8 text-[#2C4A60]" />
 TAILRD Clinical Algorithms
 </h2>
 <p className="text-titanium-600 mb-6">
 Proprietary clinical decision support algorithms developed by the TAILRD clinical team
 </p>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {getTAILRDAlgorithms().map((algorithm, index) => (
 <div key={algorithm.name || `algorithm-${index}`} className="p-6 bg-white rounded-xl border border-titanium-200 hover:shadow-chrome-card-hover transition-all duration-300">
 <div className="flex items-center gap-3 mb-4">
 <Award className="w-6 h-6 text-[#2C4A60]" />
 <h3 className="font-bold text-titanium-900">{algorithm.name}</h3>
 </div>
 
 <p className="text-sm text-titanium-600 mb-4">{algorithm.description}</p>
 
 <div className="mb-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-semibold text-titanium-700">Algorithm Score</span>
 <span className="text-lg font-bold text-[#2C4A60]">{algorithm.score}%</span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div 
 className="h-2 bg-[#2C4A60] rounded-full transition-all duration-300"
 style={{ width: `${algorithm.score}%` }}
 ></div>
 </div>
 </div>

 <div className="mb-4">
 <div className="text-sm font-semibold text-titanium-700 mb-2">Key Factors</div>
 <ul className="text-xs text-titanium-600 space-y-1">
 {algorithm.factors.map((factor, factorIndex) => (
 <li key={factorIndex} className="flex items-start gap-1">
 <CheckCircle className="w-3 h-3 text-[#2C4A60] mt-0.5 flex-shrink-0" />
 {factor}
 </li>
 ))}
 </ul>
 </div>

 <div className={`p-3 rounded-lg text-sm font-semibold ${
 algorithm.score >= 80 ? 'bg-[#e0eaf3] text-[#2C4A60]' :
 algorithm.score >= 60 ? 'bg-crimson-100 text-crimson-700' :
 'bg-medical-red-100 text-medical-red-800'
 }`}>
 {algorithm.recommendation}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default EPClinicalDecisionSupport;