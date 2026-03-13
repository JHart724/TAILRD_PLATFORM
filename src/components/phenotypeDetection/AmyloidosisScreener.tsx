import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, ArrowRight, Zap, Activity } from 'lucide-react';

interface ScreeningCriterion {
  category: string;
  name: string;
  present: boolean | null;
  weight: number;
  description: string;
}

interface ScreeningResult {
  riskScore: number;
  riskLevel: 'Low' | 'Intermediate' | 'High';
  recommendation: string;
  nextSteps: string[];
  color: string;
}

const AmyloidosisScreener: React.FC = () => {
  const [criteria, setCriteria] = useState<ScreeningCriterion[]>([
 {
 category: 'Heart Failure Phenotype',
 name: 'HFpEF (EF ≥50%)',
 present: null,
 weight: 2,
 description: 'Heart failure with preserved ejection fraction'
 },
 {
 category: 'Heart Failure Phenotype',
 name: 'Unexplained LV hypertrophy',
 present: null,
 weight: 3,
 description: 'LV wall thickness >12mm without adequate explanation'
 },
 {
 category: 'ECG Red Flags',
 name: 'Low voltage ECG',
 present: null,
 weight: 2,
 description: 'QRS <0.5mV in limb leads despite LVH'
 },
 {
 category: 'ECG Red Flags',
 name: 'Conduction abnormalities',
 present: null,
 weight: 2,
 description: 'AV block, bundle branch blocks, or atrial arrhythmias'
 },
 {
 category: 'Clinical Features',
 name: 'Carpal tunnel syndrome',
 present: null,
 weight: 1,
 description: 'History of carpal tunnel syndrome (especially bilateral)'
 },
 {
 category: 'Clinical Features',
 name: 'Spinal stenosis',
 present: null,
 weight: 1,
 description: 'Lumbar spinal stenosis requiring surgery'
 },
 {
 category: 'Laboratory',
 name: 'Elevated troponin',
 present: null,
 weight: 1,
 description: 'Chronically elevated troponin without ACS'
 },
 {
 category: 'Laboratory',
 name: 'Elevated BNP/NT-proBNP',
 present: null,
 weight: 1,
 description: 'Disproportionately elevated natriuretic peptides'
 },
 {
 category: 'Family History',
 name: 'Family history of amyloidosis',
 present: null,
 weight: 3,
 description: 'Known family history of cardiac or systemic amyloidosis'
 }
  ]);

  const [showResults, setShowResults] = useState(false);

  const updateCriterion = (index: number, present: boolean | null) => {
 const newCriteria = [...criteria];
 newCriteria[index].present = present;
 setCriteria(newCriteria);
 setShowResults(true);
  };

  const calculateRisk = (): ScreeningResult => {
 const totalScore = criteria.reduce((sum, criterion) => {
 return sum + (criterion.present === true ? criterion.weight : 0);
 }, 0);

 let riskLevel: 'Low' | 'Intermediate' | 'High';
 let color: string;
 let recommendation: string;
 let nextSteps: string[];

 if (totalScore <= 2) {
 riskLevel = 'Low';
 color = 'medical-green';
 recommendation = 'Low risk for cardiac amyloidosis. Routine follow-up appropriate.';
 nextSteps = [
 'Continue standard HF management',
 'Reassess if new red flags develop',
 'Routine follow-up in 6-12 months'
 ];
 } else if (totalScore <= 5) {
 riskLevel = 'Intermediate';
 color = 'medical-amber';
 recommendation = 'Intermediate risk for cardiac amyloidosis. Consider additional evaluation.';
 nextSteps = [
 'Consider strain echocardiography',
 'Evaluate for additional red flags',
 'Consider cardiology consultation',
 'Monitor clinical progression'
 ];
 } else {
 riskLevel = 'High';
 color = 'medical-red';
 recommendation = 'High risk for cardiac amyloidosis. Tc99m-PYP scan recommended.';
 nextSteps = [
 'Order Tc99m-PYP bone scan URGENTLY',
 'Cardio-oncology consultation',
 'Complete systemic amyloidosis evaluation',
 'Consider genetic testing for hereditary forms'
 ];
 }

 return {
 riskScore: totalScore,
 riskLevel,
 recommendation,
 nextSteps,
 color
 };
  };

  const result = showResults ? calculateRisk() : null;

  const groupedCriteria = criteria.reduce((groups, criterion) => {
 const category = criterion.category;
 if (!groups[category]) {
 groups[category] = [];
 }
 groups[category].push(criterion);
 return groups;
  }, {} as Record<string, ScreeningCriterion[]>);

  return (
 <div className="retina-card p-6">
 {/* Header */}
 <div className="flex items-center gap-4 mb-6">
 <div className="w-12 h-12 bg-medical-red-100 rounded-xl flex items-center justify-center">
 <Activity className="w-6 h-6 text-medical-red-600" />
 </div>
 <div>
 <h3 className="text-2xl font-bold text-titanium-900 font-sf">Cardiac Amyloidosis Screener</h3>
 <p className="text-titanium-600">HFpEF + Red Flags → Tc99m-PYP Scan Pathway</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Screening Criteria */}
 <div className="lg:col-span-2">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Screening Criteria</h4>
 
 <div className="space-y-6">
 {Object.entries(groupedCriteria).map(([category, categoryItems]) => (
 <div key={category} className="bg-white border border-titanium-200 rounded-xl p-4">
 <h5 className="font-semibold text-titanium-900 mb-4">{category}</h5>
 <div className="space-y-3">
 {categoryItems.map((criterion, index) => {
 const criterionIndex = criteria.indexOf(criterion);
 return (
 <div key={index} className="p-3 bg-titanium-50 rounded-lg">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="font-medium text-titanium-900">{criterion.name}</div>
 <p className="text-sm text-titanium-600 mt-1">{criterion.description}</p>
 </div>
 <div className="text-sm font-bold text-titanium-600 bg-titanium-200 px-2 py-1 rounded ml-3">
 {criterion.weight} pts
 </div>
 </div>
 
 <div className="flex gap-2">
 <button
 onClick={() => updateCriterion(criterionIndex, true)}
 className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 transition-all ${
 criterion.present === true
 ? 'border-green-400 bg-green-50 text-green-700'
 : 'border-titanium-200 hover:border-green-300 text-titanium-600'
 }`}
 >
 <CheckCircle className="w-4 h-4 inline mr-1" />
 Present
 </button>
 <button
 onClick={() => updateCriterion(criterionIndex, false)}
 className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 transition-all ${
 criterion.present === false
 ? 'border-red-400 bg-red-50 text-red-700'
 : 'border-titanium-200 hover:border-red-300 text-titanium-600'
 }`}
 >
 <AlertTriangle className="w-4 h-4 inline mr-1" />
 Absent
 </button>
 <button
 onClick={() => updateCriterion(criterionIndex, null)}
 className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 transition-all ${
 criterion.present === null
 ? 'border-amber-400 bg-amber-50 text-amber-700'
 : 'border-titanium-200 hover:border-amber-300 text-titanium-600'
 }`}
 >
 <Eye className="w-4 h-4 inline mr-1" />
 Unknown
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* Screening Pathway */}
 <div className="mt-6 p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <h5 className="font-semibold text-titanium-900 mb-3 flex items-center gap-2">
 <Zap className="w-5 h-5 text-chrome-600" />
 Amyloidosis Screening Pathway
 </h5>
 <div className="flex items-center gap-3 text-sm">
 <div className="bg-white px-3 py-2 rounded border border-chrome-200">
 HFpEF + Red Flags
 </div>
 <ArrowRight className="w-4 h-4 text-chrome-600" />
 <div className="bg-white px-3 py-2 rounded border border-chrome-200">
 Risk Score ≥3
 </div>
 <ArrowRight className="w-4 h-4 text-chrome-600" />
 <div className="bg-white px-3 py-2 rounded border border-chrome-200">
 Tc99m-PYP Scan
 </div>
 <ArrowRight className="w-4 h-4 text-chrome-600" />
 <div className="bg-white px-3 py-2 rounded border border-chrome-200">
 Grade 2-3 → ATTR
 </div>
 </div>
 </div>
 </div>

 {/* Results Panel */}
 <div>
 {result && (
 <div className="space-y-4">
 {/* Risk Score */}
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.riskScore}
 </div>
 <div className="text-sm font-medium text-titanium-600">Risk Score</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.riskLevel === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.riskLevel === 'Intermediate' && <Eye className="w-4 h-4" />}
 {result.riskLevel === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.riskLevel} Risk
 </div>
 </div>
 </div>

 {/* Recommendation */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Recommendation</h5>
 <p className="text-sm text-titanium-700">{result.recommendation}</p>
 </div>

 {/* Next Steps */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Next Steps</h5>
 <div className="space-y-2">
 {result.nextSteps.map((step, index) => (
 <div key={index} className="flex items-start gap-2">
 <div className={`w-2 h-2 rounded-full bg-${result.color}-500 flex-shrink-0 mt-1.5`}></div>
 <span className="text-sm text-titanium-700">{step}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Tc99m-PYP Information */}
 {result.riskLevel === 'High' && (
 <div className="p-4 bg-red-50 rounded-xl border border-red-200">
 <h5 className="font-semibold text-red-900 mb-2">Tc99m-PYP Scan</h5>
 <div className="text-sm text-red-800 space-y-1">
 <div>• Grade 0-1: Negative for ATTR</div>
 <div>• Grade 2-3: Positive for ATTR-CA</div>
 <div>• Consider TTR gene sequencing</div>
 <div>• Family screening if hereditary</div>
 </div>
 </div>
 )}

 {/* Clinical Pearls */}
 <div className="p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <h5 className="font-semibold text-chrome-900 mb-2">Clinical Pearls</h5>
 <div className="text-sm text-chrome-800 space-y-1">
 <div>• 13% prevalence in HFpEF patients</div>
 <div>• Often misdiagnosed as HCM</div>
 <div>• TTR stabilizers available (tafamidis)</div>
 <div>• Early detection improves outcomes</div>
 </div>
 </div>
 </div>
 )}

 {!showResults && (
 <div className="p-6 bg-titanium-50 rounded-xl text-center">
 <div className="text-titanium-600 mb-2">Complete screening criteria to see results</div>
 <div className="text-sm text-titanium-500">
 Answer at least 3 criteria to generate risk assessment
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Action Buttons */}
 {result && (
 <div className="flex justify-center gap-3 mt-6 pt-6 border-t border-titanium-200">
 <button 
 onClick={() => {
 console.log('Ordering Tc99m-PYP scan');
 {}
 }}
 className={`${
 result.riskLevel === 'High' 
 ? 'bg-medical-red-500 hover:bg-medical-red-600' 
 : 'bg-porsche-500 hover:bg-porsche-600'
 } text-white py-3 px-6 rounded-lg transition-colors font-medium`}
 disabled={result.riskLevel === 'Low'}
 >
 {result.riskLevel === 'High' ? 'Order Tc99m-PYP Scan' : 'Consider Additional Workup'}
 </button>
 <button 
 onClick={() => {
 console.log('Generating amyloidosis screening report');
 {}
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-3 px-6 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
 >
 Generate Report
 </button>
 <button 
 onClick={() => {
 console.log('Resetting screening form');
 setCriteria(criteria.map(c => ({ ...c, present: null })));
 setShowResults(false);
 }}
 className="bg-white border border-titanium-300 text-titanium-700 py-3 px-6 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
 >
 Reset Screening
 </button>
 </div>
 )}
 </div>
  );
};

export default AmyloidosisScreener;