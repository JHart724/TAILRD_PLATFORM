import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, Shield, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface CoronaryRiskInputs {
  age: number;
  heartRate: number;
  systolicBP: number;
  creatinine: number;
  killipClass: 1 | 2 | 3 | 4;
  stElevation: boolean;
  elevatedBiomarkers: boolean;
  cardiacArrest: boolean;
  numberOfLesions: number;
  bifurcationLesions: boolean;
  totalOcclusion: boolean;
  calcification: 'none' | 'moderate' | 'severe';
  leftMainDisease: boolean;
  proximalLAD: boolean;
  thrombus: boolean;
  diabetes: boolean;
  hypertension: boolean;
  smoking: boolean;
  priorCAD: boolean;
  aspirinUse: boolean;
  anginaEvents: number;
}

interface GRACEResult {
  score: number;
  sixMonthMortality: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  interpretation: string;
}

interface SYNTAXResult {
  score: number;
  complexity: 'Low' | 'Intermediate' | 'High';
  recommendedStrategy: string;
  interpretation: string;
}

interface TIMIResult {
  score: number;
  fourteenDayRisk: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  interpretation: string;
}

interface CombinedResults {
  grace: GRACEResult;
  syntax: SYNTAXResult;
  timi: TIMIResult;
  combinedRecommendation: string;
}

const CoronaryRiskScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<CoronaryRiskInputs>({
 age: patientData?.age ?? 62,
 heartRate: patientData?.heartRate ?? 78,
 systolicBP: patientData?.systolicBP ?? 138,
 creatinine: patientData?.creatinine ?? 1.1,
 killipClass: 1,
 stElevation: false,
 elevatedBiomarkers: true,
 cardiacArrest: false,
 numberOfLesions: 2,
 bifurcationLesions: false,
 totalOcclusion: false,
 calcification: 'moderate',
 leftMainDisease: false,
 proximalLAD: true,
 thrombus: false,
 diabetes: patientData?.diabetes ?? true,
 hypertension: patientData?.hypertension ?? true,
 smoking: false,
 priorCAD: patientData?.cad ?? true,
 aspirinUse: true,
 anginaEvents: 1,
  });

  const calculateScores = (): CombinedResults => {
 // --- GRACE Score Calculation ---
 let graceScore = 0;

 // Age points
 if (inputs.age < 30) graceScore += 0;
 else if (inputs.age < 40) graceScore += 8;
 else if (inputs.age < 50) graceScore += 25;
 else if (inputs.age < 60) graceScore += 41;
 else if (inputs.age < 70) graceScore += 58;
 else if (inputs.age < 80) graceScore += 75;
 else graceScore += 91;

 // Heart rate points
 if (inputs.heartRate < 50) graceScore += 0;
 else if (inputs.heartRate < 70) graceScore += 3;
 else if (inputs.heartRate < 90) graceScore += 9;
 else if (inputs.heartRate < 110) graceScore += 15;
 else if (inputs.heartRate < 150) graceScore += 24;
 else graceScore += 38;

 // SBP points (inverse)
 if (inputs.systolicBP < 80) graceScore += 58;
 else if (inputs.systolicBP < 100) graceScore += 53;
 else if (inputs.systolicBP < 120) graceScore += 43;
 else if (inputs.systolicBP < 140) graceScore += 34;
 else if (inputs.systolicBP < 160) graceScore += 24;
 else if (inputs.systolicBP < 200) graceScore += 10;
 else graceScore += 0;

 // Creatinine points
 if (inputs.creatinine < 0.8) graceScore += 1;
 else if (inputs.creatinine < 1.2) graceScore += 4;
 else if (inputs.creatinine < 1.6) graceScore += 7;
 else if (inputs.creatinine < 2.0) graceScore += 10;
 else if (inputs.creatinine < 4.0) graceScore += 21;
 else graceScore += 28;

 // Killip class
 if (inputs.killipClass === 2) graceScore += 20;
 else if (inputs.killipClass === 3) graceScore += 39;
 else if (inputs.killipClass === 4) graceScore += 59;

 // ST elevation
 if (inputs.stElevation) graceScore += 28;

 // Elevated biomarkers
 if (inputs.elevatedBiomarkers) graceScore += 14;

 // Cardiac arrest
 if (inputs.cardiacArrest) graceScore += 39;

 // Map GRACE to 6-month mortality
 let graceMortality: number;
 if (graceScore <= 88) graceMortality = 1.0;
 else if (graceScore <= 108) graceMortality = 3.0;
 else if (graceScore <= 118) graceMortality = 5.0;
 else if (graceScore <= 133) graceMortality = 8.0;
 else if (graceScore <= 148) graceMortality = 12.0;
 else if (graceScore <= 163) graceMortality = 18.0;
 else if (graceScore <= 183) graceMortality = 26.0;
 else graceMortality = 40.0;

 let graceCategory: 'Low' | 'Intermediate' | 'High';
 let graceInterpretation: string;
 if (graceScore <= 108) {
 graceCategory = 'Low';
 graceInterpretation = 'Low risk of 6-month mortality. Standard care pathway with medical management.';
 } else if (graceScore <= 140) {
 graceCategory = 'Intermediate';
 graceInterpretation = 'Intermediate risk. Consider early invasive strategy within 24-72 hours.';
 } else {
 graceCategory = 'High';
 graceInterpretation = 'High risk. Urgent invasive strategy recommended within 24 hours.';
 }

 // --- SYNTAX Score Calculation ---
 let syntaxScore = 0;
 syntaxScore += inputs.numberOfLesions * 3;
 if (inputs.bifurcationLesions) syntaxScore += inputs.numberOfLesions * 2;
 if (inputs.totalOcclusion) syntaxScore += 5;
 if (inputs.calcification === 'moderate') syntaxScore += 1;
 if (inputs.calcification === 'severe') syntaxScore += 2;
 if (inputs.leftMainDisease) syntaxScore += 5;
 if (inputs.proximalLAD) syntaxScore += 3;
 if (inputs.thrombus) syntaxScore += 1;

 let syntaxComplexity: 'Low' | 'Intermediate' | 'High';
 let syntaxStrategy: string;
 let syntaxInterpretation: string;
 if (syntaxScore <= 22) {
 syntaxComplexity = 'Low';
 syntaxStrategy = 'PCI is reasonable';
 syntaxInterpretation = 'Low anatomic complexity. PCI with comparable outcomes to CABG. Patient preference and comorbidities may guide decision.';
 } else if (syntaxScore <= 32) {
 syntaxComplexity = 'Intermediate';
 syntaxStrategy = 'Heart Team discussion recommended';
 syntaxInterpretation = 'Intermediate complexity. Heart Team discussion is recommended. Both PCI and CABG are options depending on clinical factors.';
 } else {
 syntaxComplexity = 'High';
 syntaxStrategy = 'CABG preferred';
 syntaxInterpretation = 'High anatomic complexity. CABG is generally preferred based on SYNTAX trial data. PCI reserved if CABG contraindicated.';
 }

 // --- TIMI Score Calculation ---
 let timiScore = 0;
 if (inputs.age >= 65) timiScore += 1;

 // >=3 CAD risk factors
 let riskFactorCount = 0;
 if (inputs.diabetes) riskFactorCount++;
 if (inputs.hypertension) riskFactorCount++;
 if (inputs.smoking) riskFactorCount++;
 if (inputs.priorCAD) riskFactorCount++;
 if (riskFactorCount >= 3) timiScore += 1;

 if (inputs.priorCAD) timiScore += 1;
 if (inputs.aspirinUse) timiScore += 1;
 if (inputs.anginaEvents >= 2) timiScore += 1;
 if (inputs.stElevation) timiScore += 1;
 if (inputs.elevatedBiomarkers) timiScore += 1;

 // Map TIMI to 14-day event risk
 let timiRisk: number;
 if (timiScore <= 1) timiRisk = 4.7;
 else if (timiScore === 2) timiRisk = 8.3;
 else if (timiScore === 3) timiRisk = 13.2;
 else if (timiScore === 4) timiRisk = 19.9;
 else if (timiScore === 5) timiRisk = 26.2;
 else if (timiScore === 6) timiRisk = 40.9;
 else timiRisk = 40.9;

 let timiCategory: 'Low' | 'Intermediate' | 'High';
 let timiInterpretation: string;
 if (timiScore <= 2) {
 timiCategory = 'Low';
 timiInterpretation = 'Low 14-day event risk. Conservative management with close monitoring is appropriate.';
 } else if (timiScore <= 4) {
 timiCategory = 'Intermediate';
 timiInterpretation = 'Intermediate risk. Early invasive strategy improves outcomes. Consider angiography within 24-72h.';
 } else {
 timiCategory = 'High';
 timiInterpretation = 'High risk. Urgent invasive strategy with aggressive antithrombotic therapy recommended.';
 }

 // --- Combined Recommendation ---
 const highCount = [graceCategory, syntaxComplexity, timiCategory].filter(c => c === 'High').length;
 let combinedRecommendation: string;
 if (highCount >= 2) {
 combinedRecommendation = 'Multiple high-risk scores detected. Recommend urgent invasive evaluation with Heart Team consultation for revascularization strategy. Aggressive medical therapy with dual antiplatelet and anticoagulation indicated.';
 } else if (highCount === 1 || graceCategory === 'Intermediate' || timiCategory === 'Intermediate') {
 combinedRecommendation = 'Mixed risk profile. Early invasive strategy within 24-72 hours recommended. Optimize medical therapy while awaiting catheterization. Heart Team review for revascularization approach.';
 } else {
 combinedRecommendation = 'Low-risk profile across all scores. Consider non-invasive testing first. Optimize guideline-directed medical therapy with close outpatient follow-up.';
 }

 return {
 grace: { score: graceScore, sixMonthMortality: graceMortality, riskCategory: graceCategory, interpretation: graceInterpretation },
 syntax: { score: syntaxScore, complexity: syntaxComplexity, recommendedStrategy: syntaxStrategy, interpretation: syntaxInterpretation },
 timi: { score: timiScore, fourteenDayRisk: timiRisk, riskCategory: timiCategory, interpretation: timiInterpretation },
 combinedRecommendation,
 };
  };

  const results = calculateScores();

  const updateInput = (key: keyof CoronaryRiskInputs, value: any) => {
 setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-[#2D6147] bg-[#F0F7F4] border-[#2C4A60]';
 case 'Intermediate': return 'text-[#8B6914] bg-[#FAF6E8] border-[#C8D4DC]';
 case 'High': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Calculator className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">Coronary Risk Score Calculator</h2>
 <p className="text-titanium-600">Combined GRACE + SYNTAX + TIMI risk assessment</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Input Section */}
 <div className="lg:col-span-2 space-y-6">
 {/* Vital Signs & Labs */}
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <h3 className="font-semibold text-porsche-800 mb-3">Vital Signs & Labs (GRACE)</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 min="18" max="120"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Heart Rate (bpm)</label>
 <input
 type="number"
 value={inputs.heartRate}
 onChange={(e) => updateInput('heartRate', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Systolic BP (mmHg)</label>
 <input
 type="number"
 value={inputs.systolicBP}
 onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Creatinine (mg/dL)</label>
 <input
 type="number"
 step="0.1"
 value={inputs.creatinine}
 onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Killip Class</label>
 <select
 value={inputs.killipClass}
 onChange={(e) => updateInput('killipClass', parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 >
 <option value={1}>I - No HF</option>
 <option value={2}>II - Rales/JVD</option>
 <option value={3}>III - Pulmonary Edema</option>
 <option value={4}>IV - Cardiogenic Shock</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Angina Events (24h)</label>
 <input
 type="number"
 value={inputs.anginaEvents}
 onChange={(e) => updateInput('anginaEvents', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 min="0" max="20"
 />
 </div>
 </div>
 </div>

 {/* Presentation */}
 <div className="p-4 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
 <h3 className="font-semibold text-[#6B7280] mb-3">Presentation (GRACE + TIMI)</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { key: 'stElevation', label: 'ST Elevation/Depression' },
 { key: 'elevatedBiomarkers', label: 'Elevated Troponin/CK-MB' },
 { key: 'cardiacArrest', label: 'Cardiac Arrest at Presentation' },
 { key: 'aspirinUse', label: 'Aspirin Use (past 7 days)' },
 ].map((item) => (
 <label key={item.key} className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-titanium-50">
 <input
 type="checkbox"
 checked={inputs[item.key as keyof CoronaryRiskInputs] as boolean}
 onChange={(e) => updateInput(item.key as keyof CoronaryRiskInputs, e.target.checked)}
 className="rounded text-[#6B7280]"
 />
 <span className="text-sm font-medium text-titanium-700">{item.label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Anatomy - SYNTAX */}
 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <h3 className="font-semibold text-crimson-800 mb-3">Coronary Anatomy (SYNTAX)</h3>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Number of Lesions</label>
 <input
 type="number"
 value={inputs.numberOfLesions}
 onChange={(e) => updateInput('numberOfLesions', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 min="0" max="20"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Calcification</label>
 <select
 value={inputs.calcification}
 onChange={(e) => updateInput('calcification', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-porsche-500"
 >
 <option value="none">None</option>
 <option value="moderate">Moderate</option>
 <option value="severe">Severe</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { key: 'bifurcationLesions', label: 'Bifurcation Lesion(s)' },
 { key: 'totalOcclusion', label: 'Total Occlusion (CTO)' },
 { key: 'leftMainDisease', label: 'Left Main Disease' },
 { key: 'proximalLAD', label: 'Proximal LAD' },
 { key: 'thrombus', label: 'Thrombus Present' },
 ].map((item) => (
 <label key={item.key} className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-titanium-50">
 <input
 type="checkbox"
 checked={inputs[item.key as keyof CoronaryRiskInputs] as boolean}
 onChange={(e) => updateInput(item.key as keyof CoronaryRiskInputs, e.target.checked)}
 className="rounded text-crimson-600"
 />
 <span className="text-sm font-medium text-titanium-700">{item.label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Risk Factors - TIMI */}
 <div className="p-4 bg-[#F0F7F4] border border-[#D8EDE6] rounded-lg">
 <h3 className="font-semibold text-[#2C4A60] mb-3">Risk Factors (TIMI)</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {[
 { key: 'diabetes', label: 'Diabetes Mellitus' },
 { key: 'hypertension', label: 'Hypertension' },
 { key: 'smoking', label: 'Current Smoker' },
 { key: 'priorCAD', label: 'Known CAD (>50% stenosis)' },
 ].map((item) => (
 <label key={item.key} className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-titanium-50">
 <input
 type="checkbox"
 checked={inputs[item.key as keyof CoronaryRiskInputs] as boolean}
 onChange={(e) => updateInput(item.key as keyof CoronaryRiskInputs, e.target.checked)}
 className="rounded text-[#2C4A60]"
 />
 <span className="text-sm font-medium text-titanium-700">{item.label}</span>
 </label>
 ))}
 </div>
 </div>
 </div>

 {/* Results Section */}
 <div className="space-y-6">
 {/* GRACE Result */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(results.grace.riskCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Heart className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">GRACE Score</div>
 <div className="text-sm opacity-80">{results.grace.riskCategory} Risk</div>
 </div>
 </div>
 <div className="space-y-3">
 <div>
 <div className="text-sm opacity-80">Score</div>
 <div className="text-3xl font-bold font-sf">{results.grace.score}</div>
 </div>
 <div>
 <div className="text-sm opacity-80">6-Month Mortality</div>
 <div className="text-xl font-semibold">{results.grace.sixMonthMortality}%</div>
 </div>
 </div>
 <div className="mt-3 pt-3 border-t border-current border-opacity-20">
 <p className="text-sm">{results.grace.interpretation}</p>
 </div>
 </div>

 {/* SYNTAX Result */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(results.syntax.complexity)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Activity className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">SYNTAX Score</div>
 <div className="text-sm opacity-80">{results.syntax.complexity} Complexity</div>
 </div>
 </div>
 <div className="space-y-3">
 <div>
 <div className="text-sm opacity-80">Score</div>
 <div className="text-3xl font-bold font-sf">{results.syntax.score}</div>
 </div>
 <div>
 <div className="text-sm opacity-80">Strategy</div>
 <div className="text-base font-semibold">{results.syntax.recommendedStrategy}</div>
 </div>
 </div>
 <div className="mt-3 pt-3 border-t border-current border-opacity-20">
 <p className="text-sm">{results.syntax.interpretation}</p>
 </div>
 </div>

 {/* TIMI Result */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(results.timi.riskCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Shield className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">TIMI Score</div>
 <div className="text-sm opacity-80">{results.timi.riskCategory} Risk</div>
 </div>
 </div>
 <div className="space-y-3">
 <div>
 <div className="text-sm opacity-80">Score</div>
 <div className="text-3xl font-bold font-sf">{results.timi.score}/7</div>
 </div>
 <div>
 <div className="text-sm opacity-80">14-Day Event Risk</div>
 <div className="text-xl font-semibold">{results.timi.fourteenDayRisk}%</div>
 </div>
 </div>
 <div className="mt-3 pt-3 border-t border-current border-opacity-20">
 <p className="text-sm">{results.timi.interpretation}</p>
 </div>
 </div>

 {/* Score Reference */}
 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">Score Thresholds</div>
 <div className="space-y-2 text-xs">
 <div>
 <div className="font-semibold">GRACE:</div>
 <div>Low: 1-108 | Intermediate: 109-140 | High: &gt;140</div>
 </div>
 <div>
 <div className="font-semibold">SYNTAX:</div>
 <div>Low: 0-22 | Intermediate: 23-32 | High: &gt;33</div>
 </div>
 <div>
 <div className="font-semibold">TIMI:</div>
 <div>Low: 0-2 | Intermediate: 3-4 | High: 5-7</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Combined Recommendation Panel */}
 <div className="mt-6 p-6 bg-porsche-50 border border-porsche-200 rounded-xl">
 <div className="flex items-start gap-3">
 <Info className="w-6 h-6 text-porsche-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="text-lg font-bold text-porsche-800 mb-2">Combined Risk Assessment & Recommendation</h3>
 <p className="text-sm text-porsche-700">{results.combinedRecommendation}</p>
 <div className="mt-4 grid grid-cols-3 gap-4">
 <div className={`p-3 rounded-lg border ${getRiskColor(results.grace.riskCategory)}`}>
 <div className="text-xs font-semibold">GRACE</div>
 <div className="text-lg font-bold">{results.grace.riskCategory}</div>
 </div>
 <div className={`p-3 rounded-lg border ${getRiskColor(results.syntax.complexity)}`}>
 <div className="text-xs font-semibold">SYNTAX</div>
 <div className="text-lg font-bold">{results.syntax.complexity}</div>
 </div>
 <div className={`p-3 rounded-lg border ${getRiskColor(results.timi.riskCategory)}`}>
 <div className="text-xs font-semibold">TIMI</div>
 <div className="text-lg font-bold">{results.timi.riskCategory}</div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
 <p className="text-xs text-red-800">
 <strong>Disclaimer:</strong> This calculator is for informational and educational purposes only. It is not intended to replace clinical judgment or serve as a substitute for professional medical evaluation. Risk scores should be interpreted in the context of individual patient characteristics by qualified healthcare providers. GRACE and SYNTAX scores are validated risk stratification tools. Individual patient management should incorporate clinical assessment beyond calculated scores.
 </p>
 </div>
 </div>
  );
};

export default CoronaryRiskScoreCalculator;
