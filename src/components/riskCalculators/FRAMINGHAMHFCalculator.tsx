import React, { useState, useEffect } from 'react';
import { Heart, AlertTriangle, CheckCircle, Info, BookOpen } from 'lucide-react';

interface FraminghamHFInputs {
  age: number;
  male: boolean;
  bmi: number;
  systolicBP: number;
  heartRate: number;
  diabetes: boolean;
  valvularDisease: boolean;
  coronaryDisease: boolean;
}

interface FraminghamHFRisk {
  fourYearRisk: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  color: string;
  interpretation: string;
  recommendations: string[];
}

const FRAMINGHAMHFCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<FraminghamHFInputs>({
 age: 65,
 male: true,
 bmi: 27,
 systolicBP: 140,
 heartRate: 75,
 diabetes: false,
 valvularDisease: false,
 coronaryDisease: false
  });

  const [result, setResult] = useState<FraminghamHFRisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const calculateFraminghamHF = (inputs: FraminghamHFInputs): FraminghamHFRisk => {
 let score = 0;

 // Age scoring (per 10 years)
 const ageDecades = Math.floor(inputs.age / 10);
 if (inputs.male) {
 score += ageDecades * 0.5; // Simplified male age scoring
 } else {
 score += ageDecades * 0.4; // Simplified female age scoring
 }

 // BMI scoring
 if (inputs.bmi >= 30) score += 1.5;
 else if (inputs.bmi >= 25) score += 0.8;

 // Blood pressure scoring (simplified)
 if (inputs.systolicBP >= 160) score += 2.0;
 else if (inputs.systolicBP >= 140) score += 1.2;
 else if (inputs.systolicBP >= 120) score += 0.5;

 // Heart rate scoring
 if (inputs.heartRate >= 100) score += 1.0;
 else if (inputs.heartRate >= 80) score += 0.3;

 // Comorbidity scoring
 if (inputs.diabetes) score += 1.8;
 if (inputs.valvularDisease) score += 2.2;
 if (inputs.coronaryDisease) score += 1.5;

 // Convert score to 4-year risk percentage (simplified formula)
 const fourYearRisk = Math.min(Math.max((1 - Math.exp(-score * 0.15)) * 100, 0.1), 45);

 let riskCategory: 'Low' | 'Intermediate' | 'High';
 let color: string;
 let interpretation: string;
 let recommendations: string[];

 if (fourYearRisk < 5) {
 riskCategory = 'Low';
 color = 'medical-green';
 interpretation = 'Low risk of developing heart failure. Focus on primary prevention.';
 recommendations = [
 'Continue healthy lifestyle modifications',
 'Regular blood pressure monitoring',
 'Diabetes prevention if pre-diabetic',
 'Annual cardiovascular risk assessment',
 'Exercise and weight management'
 ];
 } else if (fourYearRisk < 15) {
 riskCategory = 'Intermediate';
 color = 'medical-amber';
 interpretation = 'Moderate risk of developing heart failure. Enhanced prevention strategies recommended.';
 recommendations = [
 'Aggressive BP control (target <130/80)',
 'Optimize diabetes management if present',
 'Consider ACE inhibitor/ARB if high-risk',
 'Weight management and exercise program',
 'Regular cardiology monitoring'
 ];
 } else {
 riskCategory = 'High';
 color = 'medical-red';
 interpretation = 'High risk of developing heart failure. Intensive prevention and monitoring required.';
 recommendations = [
 'Intensive BP management with GDMT',
 'ACE inhibitor/ARB strongly recommended',
 'Aggressive diabetes control',
 'Cardiology consultation',
 'Echo screening if symptoms develop',
 'Consider additional risk factors'
 ];
 }

 return {
 fourYearRisk,
 riskCategory,
 color,
 interpretation,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateFraminghamHF(inputs));
  }, [inputs]);

  const updateInput = (field: keyof FraminghamHFInputs, value: any) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="retina-card p-6">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-porsche-100 rounded-xl flex items-center justify-center">
 <Heart className="w-6 h-6 text-porsche-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">Framingham HF Risk Score</h3>
 <p className="text-titanium-600">Heart Failure Risk Prediction</p>
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
 <div className="lg:col-span-2">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Patient Characteristics</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="30"
 max="100"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">BMI (kg/m²)</label>
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

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Systolic BP (mmHg)</label>
 <input
 type="number"
 value={inputs.systolicBP}
 onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="90"
 max="250"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Heart Rate (bpm)</label>
 <input
 type="number"
 value={inputs.heartRate}
 onChange={(e) => updateInput('heartRate', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="50"
 max="150"
 />
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="male"
 checked={inputs.male}
 onChange={(e) => updateInput('male', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="male" className="ml-2 text-sm text-titanium-700">Male gender</label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="diabetes"
 checked={inputs.diabetes}
 onChange={(e) => updateInput('diabetes', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="diabetes" className="ml-2 text-sm text-titanium-700">Diabetes mellitus</label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="valvularDisease"
 checked={inputs.valvularDisease}
 onChange={(e) => updateInput('valvularDisease', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="valvularDisease" className="ml-2 text-sm text-titanium-700">Valvular heart disease</label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="coronaryDisease"
 checked={inputs.coronaryDisease}
 onChange={(e) => updateInput('coronaryDisease', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="coronaryDisease" className="ml-2 text-sm text-titanium-700">Coronary artery disease</label>
 </div>
 </div>
 </div>

 <div>
 {result && (
 <div className="space-y-4">
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.fourYearRisk.toFixed(1)}%
 </div>
 <div className="text-sm font-medium text-titanium-600">4-Year HF Risk</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.riskCategory === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.riskCategory === 'Intermediate' && <Info className="w-4 h-4" />}
 {result.riskCategory === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.riskCategory} Risk
 </div>
 </div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Interpretation</h5>
 <p className="text-sm text-titanium-700">{result.interpretation}</p>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Prevention Strategies</h5>
 <div className="space-y-2">
 {result.recommendations.map((rec, index) => (
 <div key={index} className="flex items-start gap-2">
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

 {showGuidelines && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-xl font-bold text-titanium-900">Framingham HF Risk Guidelines</h4>
 <button onClick={() => setShowGuidelines(false)} className="p-2 hover:bg-titanium-100 rounded-lg">×</button>
 </div>
 
 <div className="space-y-4">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Categories</h5>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between p-2 bg-green-50 rounded">
 <span>Low Risk (&lt;5%)</span>
 <span className="font-semibold text-green-700">Standard prevention</span>
 </div>
 <div className="flex justify-between p-2 bg-amber-50 rounded">
 <span>Intermediate Risk (5-15%)</span>
 <span className="font-semibold text-amber-700">Enhanced prevention</span>
 </div>
 <div className="flex justify-between p-2 bg-red-50 rounded">
 <span>High Risk (&gt;15%)</span>
 <span className="font-semibold text-red-700">Intensive prevention</span>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Key Risk Factors</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Advanced age (strongest predictor)</li>
 <li>• Hypertension (most modifiable)</li>
 <li>• Diabetes mellitus</li>
 <li>• Coronary artery disease</li>
 <li>• Valvular heart disease</li>
 <li>• Obesity (BMI ≥30)</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Prevention Strategies</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Blood pressure control (&lt;130/80)</li>
 <li>• ACE inhibitor/ARB for high-risk patients</li>
 <li>• Diabetes management (HbA1c &lt;7%)</li>
 <li>• Weight management and exercise</li>
 <li>• Smoking cessation</li>
 <li>• Limit alcohol consumption</li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default FRAMINGHAMHFCalculator;