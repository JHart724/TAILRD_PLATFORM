import React, { useState } from 'react';
import { Calculator, Heart, Activity, AlertTriangle, Target, Route } from 'lucide-react';

interface SYNTAXInputs {
  dominance: 'right' | 'left' | 'codominant';
  lmStenosis: number;
  ladProximalStenosis: number;
  ladMidStenosis: number;
  ladDistalStenosis: number;
  lcxStenosis: number;
  rcaStenosis: number;
  rcaPdaStenosis: number;
  rcaPlvStenosis: number;
  d1Stenosis: number;
  d2Stenosis: number;
  om1Stenosis: number;
  om2Stenosis: number;
  im1Stenosis: number;
  im2Stenosis: number;
  numTotalOcclusions: number;
  trifurcation: boolean;
  aortaOstial: boolean;
  severeTortuosity: boolean;
  lengthOver20mm: boolean;
  heavyCalcification: boolean;
  thrombus: boolean;
  diffuseDisease: boolean;
}

interface SYNTAXResult {
  score: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  revascularizationStrategy: string;
  cabgRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
  pciRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
  interpretation: string;
  recommendations: string[];
  euroscore: number;
  syntaxII: number;
}

const SYNTAXScoreCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<SYNTAXInputs>({
    dominance: 'right',
    lmStenosis: 0,
    ladProximalStenosis: 80,
    ladMidStenosis: 0,
    ladDistalStenosis: 0,
    lcxStenosis: 75,
    rcaStenosis: 90,
    rcaPdaStenosis: 0,
    rcaPlvStenosis: 0,
    d1Stenosis: 0,
    d2Stenosis: 0,
    om1Stenosis: 70,
    om2Stenosis: 0,
    im1Stenosis: 0,
    im2Stenosis: 0,
    numTotalOcclusions: 1,
    trifurcation: true,
    aortaOstial: false,
    severeTortuosity: false,
    lengthOver20mm: true,
    heavyCalcification: false,
    thrombus: false,
    diffuseDisease: false
  });

  const calculateSYNTAX = (): SYNTAXResult => {
    let score = 0;

    // Dominance scoring
    const domScore = inputs.dominance === 'left' ? 1 : 0;
    
    // Number of segments involved
    let segmentCount = 0;
    const stenosisInputs = [
      inputs.lmStenosis, inputs.ladProximalStenosis, inputs.ladMidStenosis, 
      inputs.ladDistalStenosis, inputs.lcxStenosis, inputs.rcaStenosis,
      inputs.rcaPdaStenosis, inputs.rcaPlvStenosis, inputs.d1Stenosis,
      inputs.d2Stenosis, inputs.om1Stenosis, inputs.om2Stenosis,
      inputs.im1Stenosis, inputs.im2Stenosis
    ];
    
    stenosisInputs.forEach(stenosis => {
      if (stenosis >= 50) segmentCount++;
    });

    // Segment-specific scoring
    if (inputs.lmStenosis >= 50) score += 5; // Left main
    if (inputs.ladProximalStenosis >= 50) score += 3.5; // LAD proximal
    if (inputs.ladMidStenosis >= 50) score += 2.5; // LAD mid
    if (inputs.ladDistalStenosis >= 50) score += 1; // LAD distal
    if (inputs.lcxStenosis >= 50) score += 2.5; // LCX
    if (inputs.rcaStenosis >= 50) score += (inputs.dominance === 'right' ? 3.5 : 1); // RCA
    if (inputs.rcaPdaStenosis >= 50) score += 1; // RCA PDA
    if (inputs.rcaPlvStenosis >= 50) score += 0.5; // RCA PLV
    if (inputs.d1Stenosis >= 50) score += 1; // Diagonal 1
    if (inputs.d2Stenosis >= 50) score += 0.5; // Diagonal 2
    if (inputs.om1Stenosis >= 50) score += 1; // OM1
    if (inputs.om2Stenosis >= 50) score += 0.5; // OM2
    if (inputs.im1Stenosis >= 50) score += 1; // IM1
    if (inputs.im2Stenosis >= 50) score += 0.5; // IM2

    // Total occlusion scoring
    score += inputs.numTotalOcclusions * 5;

    // Morphological features
    if (inputs.trifurcation) score += 3;
    if (inputs.aortaOstial) score += 3;
    if (inputs.severeTortuosity) score += 2;
    if (inputs.lengthOver20mm) score += 2;
    if (inputs.heavyCalcification) score += 2;
    if (inputs.thrombus) score += 1;
    if (inputs.diffuseDisease) score += 1;

    // Round to nearest 0.5
    score = Math.round(score * 2) / 2;

    // Risk stratification
    let riskCategory: 'Low' | 'Intermediate' | 'High';
    let cabgRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
    let pciRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
    let revascularizationStrategy: string;
    let interpretation: string;
    let recommendations: string[];

    if (score <= 22) {
      riskCategory = 'Low';
      cabgRecommendation = 'Reasonable';
      pciRecommendation = 'Preferred';
      revascularizationStrategy = 'PCI and CABG equivalent outcomes';
      interpretation = 'Low complexity coronary disease. PCI and CABG have similar outcomes.';
      recommendations = [
        'Either PCI or CABG appropriate',
        'Consider patient preferences and comorbidities',
        'Single-stage PCI often feasible',
        'Heart Team discussion recommended'
      ];
    } else if (score <= 32) {
      riskCategory = 'Intermediate';
      cabgRecommendation = 'Reasonable';
      pciRecommendation = 'Reasonable';
      revascularizationStrategy = 'Heart Team approach recommended';
      interpretation = 'Intermediate complexity. Careful consideration of revascularization strategy required.';
      recommendations = [
        'Mandatory Heart Team evaluation',
        'Consider staged PCI approach',
        'CABG may offer mortality benefit',
        'Assess surgical risk with EuroSCORE'
      ];
    } else {
      riskCategory = 'High';
      cabgRecommendation = 'Preferred';
      pciRecommendation = 'Not Recommended';
      revascularizationStrategy = 'CABG preferred';
      interpretation = 'High complexity coronary disease. CABG preferred over PCI.';
      recommendations = [
        'CABG strongly preferred',
        'PCI associated with higher mortality',
        'Complete revascularization goal',
        'Consider intra-aortic balloon pump support'
      ];
    }

    // Simulated additional scores (would require additional inputs in real implementation)
    const euroscore = Math.min(15, Math.round(score / 3 + Math.random() * 2));
    const syntaxII = Math.min(60, Math.round(score * 1.2 + euroscore * 0.8));

    return {
      score,
      riskCategory,
      revascularizationStrategy,
      cabgRecommendation,
      pciRecommendation,
      interpretation,
      recommendations,
      euroscore,
      syntaxII
    };
  };

  const result = calculateSYNTAX();

  const updateInput = (key: keyof SYNTAXInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Intermediate': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'Preferred': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Reasonable': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'Not Recommended': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-8 h-8 text-medical-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">SYNTAX Score Calculator</h2>
          <p className="text-steel-600">Coronary Lesion Complexity Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <h3 className="font-semibold text-medical-blue-800 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Coronary Dominance
            </h3>
            <select
              value={inputs.dominance}
              onChange={(e) => updateInput('dominance', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
            >
              <option value="right">Right dominance</option>
              <option value="left">Left dominance</option>
              <option value="codominant">Codominant</option>
            </select>
          </div>

          <div className="p-4 bg-medical-red-50 border border-medical-red-200 rounded-lg">
            <h3 className="font-semibold text-medical-red-800 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Stenosis Severity (%) - Major Vessels
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Left Main</label>
                <input
                  type="number"
                  value={inputs.lmStenosis}
                  onChange={(e) => updateInput('lmStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">LAD Proximal</label>
                <input
                  type="number"
                  value={inputs.ladProximalStenosis}
                  onChange={(e) => updateInput('ladProximalStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">LAD Mid</label>
                <input
                  type="number"
                  value={inputs.ladMidStenosis}
                  onChange={(e) => updateInput('ladMidStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">LAD Distal</label>
                <input
                  type="number"
                  value={inputs.ladDistalStenosis}
                  onChange={(e) => updateInput('ladDistalStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">LCX</label>
                <input
                  type="number"
                  value={inputs.lcxStenosis}
                  onChange={(e) => updateInput('lcxStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">RCA</label>
                <input
                  type="number"
                  value={inputs.rcaStenosis}
                  onChange={(e) => updateInput('rcaStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 border border-medical-amber-200 rounded-lg">
            <h3 className="font-semibold text-medical-amber-800 mb-3">Side Branch Stenosis (%)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">D1</label>
                <input
                  type="number"
                  value={inputs.d1Stenosis}
                  onChange={(e) => updateInput('d1Stenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">OM1</label>
                <input
                  type="number"
                  value={inputs.om1Stenosis}
                  onChange={(e) => updateInput('om1Stenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">PDA</label>
                <input
                  type="number"
                  value={inputs.rcaPdaStenosis}
                  onChange={(e) => updateInput('rcaPdaStenosis', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
            <h3 className="font-semibold text-medical-purple-800 mb-3">Lesion Characteristics</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-2">Total Occlusions</label>
                <input
                  type="number"
                  value={inputs.numTotalOcclusions}
                  onChange={(e) => updateInput('numTotalOcclusions', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                  min="0"
                  max="10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.trifurcation}
                    onChange={(e) => updateInput('trifurcation', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Trifurcation</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.aortaOstial}
                    onChange={(e) => updateInput('aortaOstial', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Aorto-ostial</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.severeTortuosity}
                    onChange={(e) => updateInput('severeTortuosity', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Severe tortuosity</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.lengthOver20mm}
                    onChange={(e) => updateInput('lengthOver20mm', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Length {'>'}20mm</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.heavyCalcification}
                    onChange={(e) => updateInput('heavyCalcification', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Heavy calcification</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.thrombus}
                    onChange={(e) => updateInput('thrombus', e.target.checked)}
                    className="rounded text-medical-purple-600"
                  />
                  <span className="text-sm font-medium text-steel-700">Thrombus</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.riskCategory)}`}>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">{result.riskCategory} Complexity</div>
                <div className="text-sm opacity-80">SYNTAX Score: {result.score}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">EuroSCORE II</div>
                <div className="text-lg font-semibold">{result.euroscore}%</div>
              </div>
              <div>
                <div className="text-sm opacity-80">SYNTAX II</div>
                <div className="text-lg font-semibold">{result.syntaxII}%</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(result.pciRecommendation)}`}>
              <div className="font-semibold mb-1">PCI Recommendation</div>
              <div className="text-lg font-bold">{result.pciRecommendation}</div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(result.cabgRecommendation)}`}>
              <div className="font-semibold mb-1">CABG Recommendation</div>
              <div className="text-lg font-bold">{result.cabgRecommendation}</div>
            </div>
          </div>

          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Route className="w-5 h-5 text-medical-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-blue-800">
                <div className="font-semibold mb-1">Strategy</div>
                <p>{result.revascularizationStrategy}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-steel-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-steel-700">
                <div className="font-semibold mb-1">Clinical Interpretation</div>
                <p>{result.interpretation}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-green-50 border border-medical-green-200 rounded-lg">
            <div className="font-semibold text-medical-green-800 mb-2">Management Recommendations</div>
            <ul className="space-y-1 text-sm text-medical-green-700">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <div className="w-1 h-1 bg-medical-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="text-sm text-steel-700">
              <div className="font-semibold mb-2">SYNTAX Score Categories</div>
              <div className="space-y-1 text-xs">
                <div>• Low: ≤22 points (PCI/CABG equivalent)</div>
                <div>• Intermediate: 23-32 points (Heart Team decision)</div>
                <div>• High: ≥33 points (CABG preferred)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SYNTAXScoreCalculator;