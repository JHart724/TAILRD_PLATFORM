import React, { useState, useEffect } from 'react';
import { Heart, TrendingDown, AlertTriangle, CheckCircle, Info, BookOpen } from 'lucide-react';
import { toFixed } from '../../utils/formatters';

interface MAGGICInputs {
  age: number;
  ejectionFraction: number;
  creatinine: number;
  systolicBP: number;
  nyhaClass: number;
  bmi: number;
  male: boolean;
  smoker: boolean;
  diabetic: boolean;
  copd: boolean;
  firstHFDiagnosis: boolean;
  betaBlocker: boolean;
  ace: boolean;
  diagnosisYears: number;
}

interface MAGGICRisk {
  score: number;
  oneYearMortality: number;
  threeYearMortality: number;
  riskCategory: 'Low' | 'Medium' | 'High';
  color: string;
  interpretation: string;
  recommendations: string[];
}

const MAGGICCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<MAGGICInputs>({
 age: 70,
 ejectionFraction: 35,
 creatinine: 1.2,
 systolicBP: 120,
 nyhaClass: 2,
 bmi: 25,
 male: true,
 smoker: false,
 diabetic: false,
 copd: false,
 firstHFDiagnosis: true,
 betaBlocker: true,
 ace: true,
 diagnosisYears: 2
  });

  const [result, setResult] = useState<MAGGICRisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const calculateMAGGIC = (inputs: MAGGICInputs): MAGGICRisk => {
 let score = 0;

 // Age (per year > 70)
 if (inputs.age > 70) {
 score += (inputs.age - 70) * 1;
 }

 // EF < 30%
 if (inputs.ejectionFraction < 30) {
 score += 6;
 }

 // Creatinine ≥ 1.5 mg/dL
 if (inputs.creatinine >= 1.5) {
 score += 2;
 }

 // Systolic BP < 120 mmHg
 if (inputs.systolicBP < 120) {
 score += 3;
 }

 // NYHA class III-IV
 if (inputs.nyhaClass >= 3) {
 score += 6;
 }

 // BMI < 25
 if (inputs.bmi < 25) {
 score += 5;
 }

 // Male gender
 if (inputs.male) {
 score += 1;
 }

 // Current smoker
 if (inputs.smoker) {
 score += 1;
 }

 // Diabetes
 if (inputs.diabetic) {
 score += 3;
 }

 // COPD
 if (inputs.copd) {
 score += 2;
 }

 // First diagnosis of HF ≤ 18 months
 if (inputs.firstHFDiagnosis && inputs.diagnosisYears <= 1.5) {
 score += 2;
 }

 // No beta-blocker
 if (!inputs.betaBlocker) {
 score += 3;
 }

 // No ACE inhibitor/ARB
 if (!inputs.ace) {
 score += 1;
 }

 // Calculate mortality risks based on score
 let oneYearMortality: number;
 let threeYearMortality: number;

 // Risk calculations based on MAGGIC validation
 if (score <= 15) {
 oneYearMortality = 3.5;
 threeYearMortality = 10.2;
 } else if (score <= 20) {
 oneYearMortality = 5.8;
 threeYearMortality = 16.4;
 } else if (score <= 25) {
 oneYearMortality = 9.3;
 threeYearMortality = 25.1;
 } else if (score <= 30) {
 oneYearMortality = 14.7;
 threeYearMortality = 36.2;
 } else {
 oneYearMortality = 22.5;
 threeYearMortality = 49.8;
 }

 // Risk categorization
 let riskCategory: 'Low' | 'Medium' | 'High';
 let color: string;
 let interpretation: string;
 let recommendations: string[];

 if (score <= 15) {
 riskCategory = 'Low';
 color = 'chrome-blue';
 interpretation = 'Low risk of mortality. Standard heart failure management with regular monitoring.';
 recommendations = [
 'Continue current GDMT (ACE/ARB + Beta-blocker)',
 'Add MRA if appropriate',
 'Consider ICD if EF ≤35% despite optimal therapy',
 'Regular cardiology follow-up every 6 months',
 'Patient education on self-care'
 ];
 } else if (score <= 25) {
 riskCategory = 'Medium';
 color = 'crimson';
 interpretation = 'Moderate risk of mortality. Optimize therapy and consider advanced interventions.';
 recommendations = [
 'Maximize GDMT dosing',
 'Add SGLT2 inhibitor if appropriate',
 'Consider CRT if QRS ≥130ms and LBBB',
 'ICD evaluation if EF ≤35%',
 'Enhanced monitoring with telehealth',
 'Consider HF clinic enrollment'
 ];
 } else {
 riskCategory = 'High';
 color = 'medical-red';
 interpretation = 'High risk of mortality. Consider advanced heart failure therapies and palliative care.';
 recommendations = [
 'Urgent heart failure specialist referral',
 'Optimize all GDMT including SGLT2i',
 'CRT-D evaluation if indicated',
 'Consider advanced therapies (LVAD, transplant)',
 'Palliative care consultation',
 'Frequent monitoring and hospitalization prevention'
 ];
 }

 return {
 score,
 oneYearMortality,
 threeYearMortality,
 riskCategory,
 color,
 interpretation,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateMAGGIC(inputs));
  }, [inputs]);

  const updateInput = (field: keyof MAGGICInputs, value: any) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="retina-card p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-porsche-100 rounded-xl flex items-center justify-center">
 <TrendingDown className="w-6 h-6 text-porsche-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">MAGGIC Risk Calculator</h3>
 <p className="text-titanium-600">Heart Failure Mortality Risk Assessment</p>
 </div>
 </div>
 <button
 onClick={() => setShowGuidelines(!showGuidelines)}
 className="flex items-center gap-2 px-4 py-2 bg-titanium-100 hover:bg-titanium-200 rounded-lg transition-colors"
 >
 <BookOpen className="w-4 h-4" />
 Guidelines
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Input Form */}
 <div className="lg:col-span-2">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Patient Characteristics</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 {/* Age */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Age (years)
 </label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="18"
 max="100"
 />
 </div>

 {/* Ejection Fraction */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Ejection Fraction (%)
 </label>
 <input
 type="number"
 value={inputs.ejectionFraction}
 onChange={(e) => updateInput('ejectionFraction', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="10"
 max="80"
 />
 </div>

 {/* Creatinine */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Creatinine (mg/dL)
 </label>
 <input
 type="number"
 value={inputs.creatinine}
 onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="0.5"
 max="5.0"
 step="0.1"
 />
 </div>

 {/* Systolic BP */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Systolic BP (mmHg)
 </label>
 <input
 type="number"
 value={inputs.systolicBP}
 onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="70"
 max="200"
 />
 </div>

 {/* NYHA Class */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 NYHA Class
 </label>
 <select
 value={inputs.nyhaClass}
 onChange={(e) => updateInput('nyhaClass', parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 >
 <option value={1}>Class I - No limitation</option>
 <option value={2}>Class II - Slight limitation</option>
 <option value={3}>Class III - Marked limitation</option>
 <option value={4}>Class IV - Severe limitation</option>
 </select>
 </div>

 {/* BMI */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 BMI (kg/m²)
 </label>
 <input
 type="number"
 value={inputs.bmi}
 onChange={(e) => updateInput('bmi', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="15"
 max="50"
 step="0.1"
 />
 </div>

 {/* Years since diagnosis */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Years since HF diagnosis
 </label>
 <input
 type="number"
 value={inputs.diagnosisYears}
 onChange={(e) => updateInput('diagnosisYears', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="0"
 max="20"
 step="0.5"
 />
 </div>
 </div>

 {/* Demographics and Comorbidities */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">Demographics</h5>
 <div className="space-y-3">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="male"
 checked={inputs.male}
 onChange={(e) => updateInput('male', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="male" className="ml-2 text-sm text-titanium-700">
 Male gender
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="smoker"
 checked={inputs.smoker}
 onChange={(e) => updateInput('smoker', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="smoker" className="ml-2 text-sm text-titanium-700">
 Current smoker
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="firstHFDiagnosis"
 checked={inputs.firstHFDiagnosis}
 onChange={(e) => updateInput('firstHFDiagnosis', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="firstHFDiagnosis" className="ml-2 text-sm text-titanium-700">
 First HF diagnosis ≤18 months
 </label>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">Comorbidities & Medications</h5>
 <div className="space-y-3">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="diabetic"
 checked={inputs.diabetic}
 onChange={(e) => updateInput('diabetic', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="diabetic" className="ml-2 text-sm text-titanium-700">
 Diabetes mellitus
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="copd"
 checked={inputs.copd}
 onChange={(e) => updateInput('copd', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="copd" className="ml-2 text-sm text-titanium-700">
 COPD
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="betaBlocker"
 checked={inputs.betaBlocker}
 onChange={(e) => updateInput('betaBlocker', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="betaBlocker" className="ml-2 text-sm text-titanium-700">
 On beta-blocker
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="ace"
 checked={inputs.ace}
 onChange={(e) => updateInput('ace', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="ace" className="ml-2 text-sm text-titanium-700">
 On ACE inhibitor/ARB
 </label>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Results Panel */}
 <div>
 {result && (
 <div className="space-y-4">
 {/* Score Display */}
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.score}
 </div>
 <div className="text-sm font-medium text-titanium-600">MAGGIC Score</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.riskCategory === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.riskCategory === 'Medium' && <Info className="w-4 h-4" />}
 {result.riskCategory === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.riskCategory} Risk
 </div>
 </div>
 </div>

 {/* Mortality Risk */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Mortality Risk</h5>
 <div className="space-y-2">
 <div className="flex justify-between">
 <span className="text-sm text-titanium-600">1-Year Mortality</span>
 <span className="text-sm font-bold text-titanium-900">{toFixed(result.oneYearMortality, 1)}%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-sm text-titanium-600">3-Year Mortality</span>
 <span className="text-sm font-bold text-titanium-900">{toFixed(result.threeYearMortality, 1)}%</span>
 </div>
 </div>
 </div>

 {/* Interpretation */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Interpretation</h5>
 <p className="text-sm text-titanium-700">{result.interpretation}</p>
 </div>

 {/* Recommendations */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Management Recommendations</h5>
 <div className="space-y-2">
 {result.recommendations.map((rec, index) => (
 <div key={rec} className="flex items-start gap-2">
 <div className={`w-2 h-2 rounded-full bg-${result.color}-500 flex-shrink-0 mt-1.5`}></div>
 <span className="text-sm text-titanium-700">{rec}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Guidelines Modal */}
 {showGuidelines && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-xl font-bold text-titanium-900">MAGGIC Risk Calculator Guidelines</h4>
 <button
 onClick={() => setShowGuidelines(false)}
 className="p-2 hover:bg-titanium-100 rounded-lg"
 >
 ×
 </button>
 </div>
 
 <div className="space-y-4">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Categories</h5>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between p-2 bg-green-50 rounded">
 <span>Low Risk (0-15 points)</span>
 <span className="font-semibold text-green-600">3.5% 1-year mortality</span>
 </div>
 <div className="flex justify-between p-2 bg-chrome-50 rounded">
 <span>Medium Risk (16-25 points)</span>
 <span className="font-semibold text-amber-600">5.8-14.7% 1-year mortality</span>
 </div>
 <div className="flex justify-between p-2 bg-red-50 rounded">
 <span>High Risk (&gt;25 points)</span>
 <span className="font-semibold text-red-700">&gt;22% 1-year mortality</span>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Applications</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Validated in both HFrEF and HFpEF populations</li>
 <li>• Guides intensity of monitoring and intervention</li>
 <li>• Assists in advanced therapy decision-making</li>
 <li>• Risk stratification for clinical trials</li>
 <li>• Palliative care referral considerations</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Key Risk Factors</h5>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">Age &gt;70 years</div>
 <div className="text-xs text-titanium-600">1 point per year</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">EF &lt;30%</div>
 <div className="text-xs text-titanium-600">6 points</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">NYHA III-IV</div>
 <div className="text-xs text-titanium-600">6 points</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">BMI &lt;25</div>
 <div className="text-xs text-titanium-600">5 points</div>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">References</h5>
 <div className="text-sm text-titanium-700">
 <p>Pocock SJ, et al. Predicting survival in heart failure: a risk score based on 39 372 patients from 30 studies. Eur Heart J. 2013;34(19):1404-13.</p>
 <p className="mt-1">2022 AHA/ACC/HFSA Heart Failure Guideline</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default MAGGICCalculator;