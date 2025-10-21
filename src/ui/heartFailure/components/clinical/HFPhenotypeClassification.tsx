import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, Info, Droplets, Moon } from 'lucide-react';

interface PhenotypeInputs {
  hemoglobin: number;
  ferritin: number;
  transferrinSaturation: number;
  ahiScore: number;
  sleepStudyDone: boolean;
  snoring: boolean;
  obesityBMI: number;
  nocturnalDyspnea: boolean;
  morningHeadaches: boolean;
}

interface PhenotypeResult {
  ironDeficiency: {
    present: boolean;
    severity: 'Absolute' | 'Functional' | 'None';
    ferritinLevel: 'Low' | 'Borderline' | 'Normal';
    recommendations: string[];
  };
  sleepApnea: {
    risk: 'High' | 'Moderate' | 'Low';
    probability: number;
    studyRecommended: boolean;
    recommendations: string[];
  };
  combinedImpact: string;
}

const HFPhenotypeClassification: React.FC = () => {
  const [inputs, setInputs] = useState<PhenotypeInputs>({
    hemoglobin: 12.0,
    ferritin: 50,
    transferrinSaturation: 18,
    ahiScore: 0,
    sleepStudyDone: false,
    snoring: true,
    obesityBMI: 28,
    nocturnalDyspnea: true,
    morningHeadaches: false
  });

  const classifyPhenotypes = (): PhenotypeResult => {
    // Iron Deficiency Assessment (2022 ESC Guidelines)
    let ironDeficiency: PhenotypeResult['ironDeficiency'];
    
    if (inputs.ferritin < 100 || (inputs.ferritin >= 100 && inputs.ferritin <= 299 && inputs.transferrinSaturation < 20)) {
      if (inputs.ferritin < 15) {
        ironDeficiency = {
          present: true,
          severity: 'Absolute',
          ferritinLevel: 'Low',
          recommendations: [
            'Intravenous iron replacement recommended',
            'Investigate underlying cause (GI bleeding, etc.)',
            'Monitor response at 4-6 weeks',
            'Consider ferric carboxymaltose 1000mg IV'
          ]
        };
      } else if (inputs.ferritin < 100) {
        ironDeficiency = {
          present: true,
          severity: 'Absolute',
          ferritinLevel: 'Low',
          recommendations: [
            'IV iron therapy indicated',
            'Assess for underlying bleeding',
            'Ferric carboxymaltose preferred',
            'Repeat labs in 4 weeks'
          ]
        };
      } else {
        ironDeficiency = {
          present: true,
          severity: 'Functional',
          ferritinLevel: 'Borderline',
          recommendations: [
            'Functional iron deficiency present',
            'IV iron therapy beneficial',
            'Monitor inflammatory markers',
            'Consider underlying chronic disease'
          ]
        };
      }
    } else {
      ironDeficiency = {
        present: false,
        severity: 'None',
        ferritinLevel: 'Normal',
        recommendations: [
          'No iron deficiency detected',
          'Continue routine monitoring',
          'Reassess if symptoms worsen'
        ]
      };
    }

    // Sleep Apnea Risk Assessment
    let sleepApnea: PhenotypeResult['sleepApnea'];
    let riskScore = 0;
    
    // Risk factors scoring
    if (inputs.obesityBMI >= 30) riskScore += 3;
    else if (inputs.obesityBMI >= 25) riskScore += 2;
    
    if (inputs.snoring) riskScore += 2;
    if (inputs.nocturnalDyspnea) riskScore += 2;
    if (inputs.morningHeadaches) riskScore += 1;
    
    // AHI-based assessment if sleep study done
    if (inputs.sleepStudyDone) {
      if (inputs.ahiScore >= 30) {
        sleepApnea = {
          risk: 'High',
          probability: 95,
          studyRecommended: false,
          recommendations: [
            'Severe OSA confirmed (AHI ≥30)',
            'CPAP therapy strongly recommended',
            'Cardiology-sleep medicine collaboration',
            'Monitor HF symptoms improvement'
          ]
        };
      } else if (inputs.ahiScore >= 15) {
        sleepApnea = {
          risk: 'Moderate',
          probability: 80,
          studyRecommended: false,
          recommendations: [
            'Moderate OSA confirmed (AHI 15-29)',
            'CPAP therapy recommended',
            'Consider dental appliances',
            'Weight management counseling'
          ]
        };
      } else if (inputs.ahiScore >= 5) {
        sleepApnea = {
          risk: 'Moderate',
          probability: 60,
          studyRecommended: false,
          recommendations: [
            'Mild OSA confirmed (AHI 5-14)',
            'Consider CPAP if symptomatic',
            'Lifestyle modifications priority',
            'Monitor HF progression'
          ]
        };
      } else {
        sleepApnea = {
          risk: 'Low',
          probability: 15,
          studyRecommended: false,
          recommendations: [
            'Normal sleep study (AHI <5)',
            'Continue sleep hygiene practices',
            'Monitor for symptom changes'
          ]
        };
      }
    } else {
      // Risk assessment without sleep study
      if (riskScore >= 6) {
        sleepApnea = {
          risk: 'High',
          probability: 75,
          studyRecommended: true,
          recommendations: [
            'HIGH risk for OSA - sleep study recommended',
            'Multiple risk factors present',
            'Consider expedited evaluation',
            'Interim CPAP trial may be considered'
          ]
        };
      } else if (riskScore >= 3) {
        sleepApnea = {
          risk: 'Moderate',
          probability: 45,
          studyRecommended: true,
          recommendations: [
            'Moderate risk for OSA',
            'Sleep study recommended',
            'Weight management if applicable',
            'Sleep hygiene counseling'
          ]
        };
      } else {
        sleepApnea = {
          risk: 'Low',
          probability: 20,
          studyRecommended: false,
          recommendations: [
            'Low risk for significant OSA',
            'Monitor symptoms',
            'Sleep study if symptoms worsen',
            'General sleep hygiene'
          ]
        };
      }
    }

    // Combined Impact Assessment
    let combinedImpact: string;
    if (ironDeficiency.present && sleepApnea.risk === 'High') {
      combinedImpact = 'DUAL PHENOTYPE: Both iron deficiency and OSA significantly impact HF outcomes. Address both conditions aggressively.';
    } else if (ironDeficiency.present && sleepApnea.risk === 'Moderate') {
      combinedImpact = 'Iron deficiency present with possible OSA. Treat iron deficiency and evaluate sleep disorders.';
    } else if (ironDeficiency.present) {
      combinedImpact = 'Iron deficiency phenotype. IV iron therapy may improve symptoms and outcomes.';
    } else if (sleepApnea.risk === 'High') {
      combinedImpact = 'Sleep apnea phenotype likely. Treatment may improve HF control and reduce hospitalizations.';
    } else {
      combinedImpact = 'Standard HF phenotype. Focus on guideline-directed medical therapy optimization.';
    }

    return {
      ironDeficiency,
      sleepApnea,
      combinedImpact
    };
  };

  const result = classifyPhenotypes();

  const updateInput = (key: keyof PhenotypeInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getIronColor = (severity: string) => {
    switch (severity) {
      case 'Absolute': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Functional': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'None': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getSleepColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Moderate': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-8 h-8 text-medical-blue-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">HF Phenotype Classification</h2>
          <p className="text-steel-600">Iron Deficiency & Sleep Apnea Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="p-4 bg-medical-red-50 border border-medical-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-5 h-5 text-medical-red-600" />
              <h3 className="font-semibold text-medical-red-800">Iron Status Assessment</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-2">Hemoglobin (g/dL)</label>
                <input
                  type="number"
                  value={inputs.hemoglobin}
                  onChange={(e) => updateInput('hemoglobin', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  step="0.1"
                  min="6"
                  max="18"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-2">Ferritin (ng/mL)</label>
                <input
                  type="number"
                  value={inputs.ferritin}
                  onChange={(e) => updateInput('ferritin', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="5"
                  max="1000"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-steel-700 mb-2">Transferrin Saturation (%)</label>
                <input
                  type="number"
                  value={inputs.transferrinSaturation}
                  onChange={(e) => updateInput('transferrinSaturation', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="5"
                  max="50"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-5 h-5 text-medical-purple-600" />
              <h3 className="font-semibold text-medical-purple-800">Sleep Assessment</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-2">BMI (kg/m²)</label>
                  <input
                    type="number"
                    value={inputs.obesityBMI}
                    onChange={(e) => updateInput('obesityBMI', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                    step="0.1"
                    min="15"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-2">AHI Score</label>
                  <input
                    type="number"
                    value={inputs.ahiScore}
                    onChange={(e) => updateInput('ahiScore', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                    min="0"
                    max="100"
                    disabled={!inputs.sleepStudyDone}
                  />
                </div>
              </div>

              <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.sleepStudyDone}
                  onChange={(e) => updateInput('sleepStudyDone', e.target.checked)}
                  className="rounded text-medical-purple-600"
                />
                <span className="text-sm font-medium text-steel-700">Sleep study completed</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.snoring}
                  onChange={(e) => updateInput('snoring', e.target.checked)}
                  className="rounded text-medical-purple-600"
                />
                <span className="text-sm font-medium text-steel-700">Loud snoring</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.nocturnalDyspnea}
                  onChange={(e) => updateInput('nocturnalDyspnea', e.target.checked)}
                  className="rounded text-medical-purple-600"
                />
                <span className="text-sm font-medium text-steel-700">Nocturnal dyspnea</span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.morningHeadaches}
                  onChange={(e) => updateInput('morningHeadaches', e.target.checked)}
                  className="rounded text-medical-purple-600"
                />
                <span className="text-sm font-medium text-steel-700">Morning headaches</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border-2 ${getIronColor(result.ironDeficiency.severity)}`}>
            <div className="flex items-center gap-3 mb-4">
              <Droplets className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">Iron Status</div>
                <div className="text-sm opacity-80">{result.ironDeficiency.severity} Iron Deficiency</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">Ferritin Level</div>
                <div className="text-lg font-semibold">{inputs.ferritin} ng/mL ({result.ironDeficiency.ferritinLevel})</div>
              </div>
              <div>
                <div className="text-sm opacity-80">Transferrin Saturation</div>
                <div className="text-lg font-semibold">{inputs.transferrinSaturation}%</div>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl border-2 ${getSleepColor(result.sleepApnea.risk)}`}>
            <div className="flex items-center gap-3 mb-4">
              <Moon className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">Sleep Apnea Risk</div>
                <div className="text-sm opacity-80">{result.sleepApnea.risk} Risk</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">Probability</div>
                <div className="text-lg font-semibold">{result.sleepApnea.probability}%</div>
              </div>
              {result.sleepApnea.studyRecommended && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Sleep study recommended
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Heart className="w-5 h-5 text-medical-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-blue-800">
                <div className="font-semibold mb-1">Combined Impact</div>
                <p>{result.combinedImpact}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-medical-red-50 border border-medical-red-200 rounded-lg">
              <div className="font-semibold text-medical-red-800 mb-2">Iron Deficiency Management</div>
              <ul className="space-y-1 text-sm text-medical-red-700">
                {result.ironDeficiency.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <div className="w-1 h-1 bg-medical-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
              <div className="font-semibold text-medical-purple-800 mb-2">Sleep Apnea Management</div>
              <ul className="space-y-1 text-sm text-medical-purple-700">
                {result.sleepApnea.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <div className="w-1 h-1 bg-medical-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-steel-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-steel-700">
                <div className="font-semibold mb-2">Clinical Significance</div>
                <div className="space-y-1 text-xs">
                  <div>• Iron deficiency affects 30-50% of HF patients</div>
                  <div>• Sleep apnea prevalence &gt;50% in HF patients</div>
                  <div>• Both conditions independently worsen outcomes</div>
                  <div>• Treatment can improve symptoms and reduce hospitalizations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HFPhenotypeClassification;