import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, CheckCircle, Info, BookOpen } from 'lucide-react';

interface WellsPEInputs {
  clinicalPESymptoms: boolean;
  alternativeDiagnosisLessLikely: boolean;
  heartRateOver100: boolean;
  immobilization: boolean;
  previousVTE: boolean;
  hemoptysis: boolean;
  malignancy: boolean;
}

interface WellsPERisk {
  score: number;
  probability: 'Low' | 'Moderate' | 'High';
  peRisk: string;
  color: string;
  interpretation: string;
  recommendations: string[];
}

const WellsPECalculator: React.FC = () => {
  const [inputs, setInputs] = useState<WellsPEInputs>({
 clinicalPESymptoms: false,
 alternativeDiagnosisLessLikely: false,
 heartRateOver100: false,
 immobilization: false,
 previousVTE: false,
 hemoptysis: false,
 malignancy: false
  });

  const [result, setResult] = useState<WellsPERisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const calculateWellsPE = (inputs: WellsPEInputs): WellsPERisk => {
 let score = 0;

 if (inputs.clinicalPESymptoms) score += 3;
 if (inputs.alternativeDiagnosisLessLikely) score += 3;
 if (inputs.heartRateOver100) score += 1.5;
 if (inputs.immobilization) score += 1.5;
 if (inputs.previousVTE) score += 1.5;
 if (inputs.hemoptysis) score += 1;
 if (inputs.malignancy) score += 1;

 let probability: 'Low' | 'Moderate' | 'High';
 let peRisk: string;
 let color: string;
 let interpretation: string;
 let recommendations: string[];

 if (score <= 4) {
 probability = 'Low';
 peRisk = '~12% PE prevalence';
 color = 'medical-green';
 interpretation = 'Low probability of pulmonary embolism. Consider D-dimer testing.';
 recommendations = [
 'Order D-dimer',
 'If D-dimer negative: PE ruled out',
 'If D-dimer positive: Consider CTPA',
 'No anticoagulation unless high clinical suspicion',
 'Consider alternative diagnoses'
 ];
 } else if (score <= 6) {
 probability = 'Moderate';
 peRisk = '~30% PE prevalence';
 color = 'medical-amber';
 interpretation = 'Moderate probability of pulmonary embolism. Imaging typically required.';
 recommendations = [
 'Consider CTPA or V/Q scan',
 'D-dimer less useful (often positive)',
 'Consider empiric anticoagulation if high clinical suspicion',
 'Assess bleeding risk before anticoagulation',
 'Consider age-adjusted D-dimer if used'
 ];
 } else {
 probability = 'High';
 peRisk = '~78% PE prevalence';
 color = 'medical-red';
 interpretation = 'High probability of pulmonary embolism. Imaging or empiric treatment indicated.';
 recommendations = [
 'Urgent CTPA (preferred) or V/Q scan',
 'Consider empiric anticoagulation if delay in imaging',
 'Assess hemodynamic stability',
 'Consider thrombolytic therapy if massive PE',
 'Monitor for right heart strain'
 ];
 }

 return {
 score,
 probability,
 peRisk,
 color,
 interpretation,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateWellsPE(inputs));
  }, [inputs]);

  const updateInput = (field: keyof WellsPEInputs, value: boolean) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  const wellsCriteria = [
 {
 key: 'clinicalPESymptoms',
 label: 'Clinical symptoms of PE (tachycardia, dyspnea, chest pain)',
 points: 3,
 description: 'Clinical signs and symptoms of PE (minimum of leg swelling and pain with palpation of deep veins)'
 },
 {
 key: 'alternativeDiagnosisLessLikely',
 label: 'Alternative diagnosis less likely than PE',
 points: 3,
 description: 'PE is the most likely diagnosis based on clinical presentation'
 },
 {
 key: 'heartRateOver100',
 label: 'Heart rate > 100 bpm',
 points: 1.5,
 description: 'Tachycardia at time of assessment'
 },
 {
 key: 'immobilization',
 label: 'Immobilization or surgery in previous 4 weeks',
 points: 1.5,
 description: 'Bed rest ≥3 days or surgery within 4 weeks'
 },
 {
 key: 'previousVTE',
 label: 'Previous PE or DVT',
 points: 1.5,
 description: 'History of objectively diagnosed PE or DVT'
 },
 {
 key: 'hemoptysis',
 label: 'Hemoptysis',
 points: 1,
 description: 'Coughing up blood'
 },
 {
 key: 'malignancy',
 label: 'Malignancy',
 points: 1,
 description: 'Treatment within 6 months or palliative care'
 }
  ];

  return (
 <div className="retina-card p-6">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-medical-amber-100 rounded-xl flex items-center justify-center">
 <Zap className="w-6 h-6 text-medical-amber-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">Wells PE Score</h3>
 <p className="text-titanium-600">Pulmonary Embolism Probability Assessment</p>
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
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Clinical Assessment</h4>
 
 <div className="space-y-4">
 {wellsCriteria.map((criterion) => (
 <div key={criterion.key} className="p-4 border border-titanium-200 rounded-xl bg-white hover:bg-titanium-50 transition-colors">
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id={criterion.key}
 checked={inputs[criterion.key as keyof WellsPEInputs]}
 onChange={(e) => updateInput(criterion.key as keyof WellsPEInputs, e.target.checked)}
 className="h-5 w-5 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded mt-0.5"
 />
 <div className="flex-1">
 <label htmlFor={criterion.key} className="text-sm font-medium text-titanium-900 cursor-pointer">
 {criterion.label}
 </label>
 <p className="text-xs text-titanium-600 mt-1">{criterion.description}</p>
 </div>
 </div>
 <div className="text-sm font-bold text-titanium-600 bg-titanium-100 px-2 py-1 rounded">
 {criterion.points} pts
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="mt-6 p-4 bg-titanium-50 rounded-xl">
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Notes</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Wells PE Score is most accurate when used with standardized clinical assessment</li>
 <li>• Consider age-adjusted D-dimer (age × 10 ng/mL if age {'>'} 50)</li>
 <li>• YEARS algorithm may be alternative in specific populations</li>
 <li>• Clinical gestalt remains important despite scoring systems</li>
 </ul>
 </div>
 </div>

 <div>
 {result && (
 <div className="space-y-4">
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.score}
 </div>
 <div className="text-sm font-medium text-titanium-600">Wells PE Score</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.probability === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.probability === 'Moderate' && <Info className="w-4 h-4" />}
 {result.probability === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.probability} Probability
 </div>
 <div className="text-sm text-titanium-600 mt-2">{result.peRisk}</div>
 </div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Interpretation</h5>
 <p className="text-sm text-titanium-700">{result.interpretation}</p>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Recommended Actions</h5>
 <div className="space-y-2">
 {result.recommendations.map((rec, index) => (
 <div key={index} className="flex items-start gap-2">
 <div className={`w-2 h-2 rounded-full bg-${result.color}-500 flex-shrink-0 mt-1.5`}></div>
 <span className="text-sm text-titanium-700">{rec}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Decision Tree</h5>
 <div className="text-sm text-titanium-700">
 {result.probability === 'Low' && (
 <div>
 <div className="font-medium text-green-700 mb-1">Low Probability (≤4 points)</div>
 <div>D-dimer → If negative: PE ruled out</div>
 <div>If positive: Consider CTPA</div>
 </div>
 )}
 {result.probability === 'Moderate' && (
 <div>
 <div className="font-medium text-amber-700 mb-1">Moderate Probability (4-6 points)</div>
 <div>CTPA or V/Q scan recommended</div>
 <div>Consider empiric anticoagulation if delay</div>
 </div>
 )}
 {result.probability === 'High' && (
 <div>
 <div className="font-medium text-red-700 mb-1">High Probability ({'>'}6 points)</div>
 <div>Urgent imaging or empiric treatment</div>
 <div>Consider thrombolysis if massive PE</div>
 </div>
 )}
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
 <h4 className="text-xl font-bold text-titanium-900">Wells PE Score Guidelines</h4>
 <button onClick={() => setShowGuidelines(false)} className="p-2 hover:bg-titanium-100 rounded-lg">×</button>
 </div>
 
 <div className="space-y-4">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Score Interpretation</h5>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between p-2 bg-green-50 rounded">
 <span>Low Probability (≤4 points)</span>
 <span className="font-semibold text-green-700">~12% PE prevalence</span>
 </div>
 <div className="flex justify-between p-2 bg-amber-50 rounded">
 <span>Moderate Probability (4-6 points)</span>
 <span className="font-semibold text-amber-700">~30% PE prevalence</span>
 </div>
 <div className="flex justify-between p-2 bg-red-50 rounded">
 <span>High Probability ({'>'}6 points)</span>
 <span className="font-semibold text-red-700">~78% PE prevalence</span>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Diagnostic Strategy</h5>
 <div className="space-y-3 text-sm">
 <div className="p-3 bg-green-50 rounded">
 <div className="font-medium text-green-800">Low Probability</div>
 <div>1. D-dimer testing</div>
 <div>2. If negative → PE excluded</div>
 <div>3. If positive → CTPA</div>
 </div>
 <div className="p-3 bg-amber-50 rounded">
 <div className="font-medium text-amber-800">Moderate Probability</div>
 <div>1. CTPA or V/Q scan</div>
 <div>2. D-dimer less reliable</div>
 <div>3. Consider age-adjusted D-dimer</div>
 </div>
 <div className="p-3 bg-red-50 rounded">
 <div className="font-medium text-red-800">High Probability</div>
 <div>1. Urgent CTPA</div>
 <div>2. Consider empiric anticoagulation</div>
 <div>3. Assess for massive PE</div>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Key Considerations</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Validated in emergency department and outpatient settings</li>
 <li>• Age-adjusted D-dimer: Age × 10 ng/mL (if age {'>'} 50)</li>
 <li>• PERC rule can be used to exclude PE in very low-risk patients</li>
 <li>• Clinical gestalt remains important supplement to scoring</li>
 <li>• Consider alternative diagnoses in low-probability patients</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">References</h5>
 <div className="text-sm text-titanium-700">
 <p>Wells PS, et al. Use of a clinical model for safe management of patients with suspected pulmonary embolism. Ann Intern Med. 1998.</p>
 <p className="mt-1">ESC Guidelines on acute pulmonary embolism. Eur Heart J. 2020.</p>
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

export default WellsPECalculator;