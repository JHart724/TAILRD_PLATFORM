import React, { useState } from 'react';
import { Calculator, AlertTriangle, Info, Target, Footprints } from 'lucide-react';

interface WIfIInputs {
  woundGrade: 0 | 1 | 2 | 3;
  ischemiaGrade: 0 | 1 | 2 | 3;
  footInfectionGrade: 0 | 1 | 2 | 3;
}

interface WIfIResult {
  woundScore: number;
  ischemiaScore: number;
  footInfectionScore: number;
  clinicalStage: 1 | 2 | 3 | 4 | 5;
  amputationRisk: string;
  oneYearAmputationRisk: number;
  recommendations: string[];
  interventionUrgency: 'Immediate' | 'Urgent' | 'Timely' | 'Routine';
}

const WIfIClassification: React.FC = () => {
  const [inputs, setInputs] = useState<WIfIInputs>({
    woundGrade: 1,
    ischemiaGrade: 1,
    footInfectionGrade: 1
  });

  const calculateWIfI = (): WIfIResult => {
    const woundScore = inputs.woundGrade;
    const ischemiaScore = inputs.ischemiaGrade;
    const footInfectionScore = inputs.footInfectionGrade;

    // Determine clinical stage based on highest grade
    const maxGrade = Math.max(woundScore, ischemiaScore, footInfectionScore);
    let clinicalStage: 1 | 2 | 3 | 4 | 5;

    if (maxGrade === 0) clinicalStage = 1;
    else if (maxGrade === 1) clinicalStage = 2;
    else if (maxGrade === 2) clinicalStage = 3;
    else if (maxGrade === 3) clinicalStage = 4;
    else clinicalStage = 5; // Special cases

    // Calculate 1-year amputation risk based on WIfI combination
    let oneYearAmputationRisk: number;
    let amputationRisk: string;
    let interventionUrgency: 'Immediate' | 'Urgent' | 'Timely' | 'Routine';
    let recommendations: string[];

    // Risk matrix based on WIfI scores
    if (woundScore === 0 && ischemiaScore === 0 && footInfectionScore === 0) {
      oneYearAmputationRisk = 2;
      amputationRisk = 'Very Low';
      interventionUrgency = 'Routine';
      recommendations = [
        'Risk factor modification',
        'Wound prevention education',
        'Regular foot examinations',
        'Exercise therapy if claudication'
      ];
    } else if (maxGrade === 1) {
      oneYearAmputationRisk = 5;
      amputationRisk = 'Low';
      interventionUrgency = 'Routine';
      recommendations = [
        'Wound care optimization',
        'Diabetes management',
        'Revascularization if symptomatic',
        'Infection control if present'
      ];
    } else if (maxGrade === 2) {
      oneYearAmputationRisk = 15;
      amputationRisk = 'Moderate';
      interventionUrgency = 'Timely';
      recommendations = [
        'Consider revascularization',
        'Aggressive wound management',
        'Multidisciplinary team approach',
        'Antibiotic therapy if indicated'
      ];
    } else {
      oneYearAmputationRisk = 35;
      amputationRisk = 'High';
      interventionUrgency = 'Urgent';
      recommendations = [
        'URGENT revascularization evaluation',
        'Immediate infection control',
        'Surgical debridement if needed',
        'Consider amputation if non-salvageable'
      ];
    }

    // Adjust for specific combinations
    if (woundScore === 3 || footInfectionScore === 3) {
      interventionUrgency = 'Immediate';
      if (woundScore === 3 && footInfectionScore === 3) {
        oneYearAmputationRisk = 50;
        amputationRisk = 'Very High';
      }
    }

    return {
      woundScore,
      ischemiaScore,
      footInfectionScore,
      clinicalStage,
      amputationRisk,
      oneYearAmputationRisk,
      recommendations,
      interventionUrgency
    };
  };

  const result = calculateWIfI();

  const updateInput = (key: keyof WIfIInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Very Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Moderate': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Very High': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate': return 'text-red-800 bg-red-100 border-red-300';
      case 'Urgent': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Timely': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'Routine': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const woundOptions = [
    { value: 0, label: '0 - No ulcer' },
    { value: 1, label: '1 - Small, shallow ulcer(s)' },
    { value: 2, label: '2 - Deeper ulcer with exposed bone/joint' },
    { value: 3, label: '3 - Extensive deep ulcer' }
  ];

  const ischemiaOptions = [
    { value: 0, label: '0 - ABI ≥0.8, TBI ≥0.6' },
    { value: 1, label: '1 - ABI 0.6-0.79, TBI 0.4-0.59' },
    { value: 2, label: '2 - ABI 0.4-0.59, TBI 0.3-0.39' },
    { value: 3, label: '3 - ABI <0.4, TBI <0.3' }
  ];

  const infectionOptions = [
    { value: 0, label: '0 - No signs of infection' },
    { value: 1, label: '1 - Mild infection' },
    { value: 2, label: '2 - Moderate infection' },
    { value: 3, label: '3 - Severe infection' }
  ];

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-8 h-8 text-medical-teal-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">WIfI Classification</h2>
          <p className="text-steel-600">Wound, Ischemia, and foot Infection Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">
                Wound (W) Assessment
              </label>
              <select
                value={inputs.woundGrade}
                onChange={(e) => updateInput('woundGrade', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-teal-500 focus:border-medical-teal-500"
              >
                {woundOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">
                Ischemia (I) Assessment
              </label>
              <select
                value={inputs.ischemiaGrade}
                onChange={(e) => updateInput('ischemiaGrade', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-teal-500 focus:border-medical-teal-500"
              >
                {ischemiaOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">
                foot Infection (fI) Assessment
              </label>
              <select
                value={inputs.footInfectionGrade}
                onChange={(e) => updateInput('footInfectionGrade', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-teal-500 focus:border-medical-teal-500"
              >
                {infectionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-steel-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-steel-600 mb-1">Wound Score</div>
              <div className="text-3xl font-bold text-steel-900">{result.woundScore}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-steel-600 mb-1">Ischemia Score</div>
              <div className="text-3xl font-bold text-steel-900">{result.ischemiaScore}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-steel-600 mb-1">Infection Score</div>
              <div className="text-3xl font-bold text-steel-900">{result.footInfectionScore}</div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.amputationRisk)}`}>
            <div className="flex items-center gap-3 mb-4">
              <Footprints className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">{result.amputationRisk} Risk</div>
                <div className="text-sm opacity-80">Clinical Stage {result.clinicalStage}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">1-Year Amputation Risk</div>
                <div className="text-2xl font-bold">{result.oneYearAmputationRisk}%</div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${getUrgencyColor(result.interventionUrgency)}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold mb-1">Intervention Urgency</div>
                <div className="font-bold text-lg">{result.interventionUrgency}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="w-5 h-5 text-medical-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-blue-800">
                <div className="font-semibold mb-2">Clinical Recommendations</div>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <div className="w-1 h-1 bg-medical-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-steel-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-steel-700">
                <div className="font-semibold mb-2">WIfI Matrix</div>
                <div className="space-y-1 text-xs">
                  <div>• W: Wound severity (0-3)</div>
                  <div>• I: Ischemia severity (0-3)</div>
                  <div>• fI: foot Infection severity (0-3)</div>
                  <div className="mt-2">Clinical stage = highest individual score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WIfIClassification;