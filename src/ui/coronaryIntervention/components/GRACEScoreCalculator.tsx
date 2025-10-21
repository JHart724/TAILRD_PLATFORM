import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';

interface GRACEInputs {
  age: number;
  heartRate: number;
  systolicBP: number;
  creatinine: number;
  killipClass: 1 | 2 | 3 | 4;
  cardiacArrest: boolean;
  stElevation: boolean;
  elevatedCardiacMarkers: boolean;
}

interface GRACEResult {
  score: number;
  inHospitalMortality: number;
  sixMonthMortality: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  interpretation: string;
  recommendations: string[];
}

const GRACEScoreCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<GRACEInputs>({
    age: 65,
    heartRate: 75,
    systolicBP: 120,
    creatinine: 1.0,
    killipClass: 1,
    cardiacArrest: false,
    stElevation: false,
    elevatedCardiacMarkers: true
  });

  const calculateGRACE = (): GRACEResult => {
    let score = 0;

    // Age (points based on age ranges)
    if (inputs.age < 30) score += 0;
    else if (inputs.age <= 39) score += 8;
    else if (inputs.age <= 49) score += 25;
    else if (inputs.age <= 59) score += 41;
    else if (inputs.age <= 69) score += 58;
    else if (inputs.age <= 79) score += 75;
    else if (inputs.age <= 89) score += 91;
    else score += 100;

    // Heart Rate (points based on HR ranges)
    if (inputs.heartRate < 50) score += 0;
    else if (inputs.heartRate <= 69) score += 3;
    else if (inputs.heartRate <= 89) score += 9;
    else if (inputs.heartRate <= 109) score += 15;
    else if (inputs.heartRate <= 149) score += 24;
    else if (inputs.heartRate <= 199) score += 38;
    else score += 46;

    // Systolic Blood Pressure (points based on SBP ranges)
    if (inputs.systolicBP < 80) score += 58;
    else if (inputs.systolicBP <= 99) score += 53;
    else if (inputs.systolicBP <= 119) score += 43;
    else if (inputs.systolicBP <= 139) score += 34;
    else if (inputs.systolicBP <= 159) score += 24;
    else if (inputs.systolicBP <= 199) score += 10;
    else score += 0;

    // Creatinine (mg/dL to μmol/L conversion and points)
    const creatinineUmol = inputs.creatinine * 88.4; // Convert mg/dL to μmol/L
    if (creatinineUmol < 35.4) score += 1;
    else if (creatinineUmol <= 70.7) score += 4;
    else if (creatinineUmol <= 106.1) score += 7;
    else if (creatinineUmol <= 141.4) score += 10;
    else if (creatinineUmol <= 176.8) score += 13;
    else if (creatinineUmol <= 353.6) score += 21;
    else score += 28;

    // Killip Class
    if (inputs.killipClass === 1) score += 0;
    else if (inputs.killipClass === 2) score += 20;
    else if (inputs.killipClass === 3) score += 39;
    else score += 59;

    // Cardiac Arrest at admission
    if (inputs.cardiacArrest) score += 39;

    // ST segment elevation
    if (inputs.stElevation) score += 28;

    // Elevated cardiac markers
    if (inputs.elevatedCardiacMarkers) score += 14;

    // Calculate mortality risks based on GRACE 2.0 model
    const inHospitalMortality = Math.min(50, Math.max(0.1, 
      1 / (1 + Math.exp(-(-6.36 + 0.0273 * score))) * 100
    ));

    const sixMonthMortality = Math.min(70, Math.max(0.2, 
      1 / (1 + Math.exp(-(-4.84 + 0.0265 * score))) * 100
    ));

    let riskCategory: 'Low' | 'Intermediate' | 'High';
    let interpretation: string;
    let recommendations: string[];

    if (score <= 108) {
      riskCategory = 'Low';
      interpretation = 'Low risk of adverse outcomes. Standard care appropriate.';
      recommendations = [
        'Continue guideline-directed medical therapy',
        'Consider conservative management',
        'Routine follow-up appropriate',
        'Discharge planning can proceed'
      ];
    } else if (score <= 140) {
      riskCategory = 'Intermediate';
      interpretation = 'Intermediate risk. Consider early invasive strategy.';
      recommendations = [
        'Consider early invasive strategy within 24-72 hours',
        'Dual antiplatelet therapy',
        'High-intensity statin therapy',
        'Close monitoring recommended'
      ];
    } else {
      riskCategory = 'High';
      interpretation = 'High risk. Urgent invasive strategy recommended.';
      recommendations = [
        'URGENT invasive strategy within 24 hours',
        'Intensive medical therapy',
        'Consider mechanical circulatory support if needed',
        'Cardiothoracic surgery consultation if appropriate',
        'ICU monitoring may be required'
      ];
    }

    return {
      score,
      inHospitalMortality: Math.round(inHospitalMortality * 10) / 10,
      sixMonthMortality: Math.round(sixMonthMortality * 10) / 10,
      riskCategory,
      interpretation,
      recommendations
    };
  };

  const result = calculateGRACE();

  const updateInput = (key: keyof GRACEInputs, value: any) => {
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

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-8 h-8 text-medical-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">GRACE Score Calculator</h2>
          <p className="text-steel-600">Global Registry of Acute Coronary Events Risk Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Age (years)</label>
              <input
                type="number"
                value={inputs.age}
                onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="18"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Heart Rate (bpm)</label>
              <input
                type="number"
                value={inputs.heartRate}
                onChange={(e) => updateInput('heartRate', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="30"
                max="250"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={inputs.systolicBP}
                onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="50"
                max="250"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Creatinine (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={inputs.creatinine}
                onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="0.3"
                max="10"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-steel-700 mb-2">Killip Class</label>
              <select
                value={inputs.killipClass}
                onChange={(e) => updateInput('killipClass', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
              >
                <option value={1}>I - No heart failure</option>
                <option value={2}>II - Rales, S3 gallop</option>
                <option value={3}>III - Pulmonary edema</option>
                <option value={4}>IV - Cardiogenic shock</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.cardiacArrest}
                onChange={(e) => updateInput('cardiacArrest', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Cardiac Arrest at Admission</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.stElevation}
                onChange={(e) => updateInput('stElevation', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">ST Elevation on ECG</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.elevatedCardiacMarkers}
                onChange={(e) => updateInput('elevatedCardiacMarkers', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Elevated Cardiac Biomarkers</span>
            </label>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.riskCategory)}`}>
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">{result.riskCategory} Risk</div>
                <div className="text-sm opacity-80">GRACE Score: {result.score}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">In-Hospital Mortality</div>
                <div className="text-2xl font-bold">{result.inHospitalMortality}%</div>
              </div>
              
              <div>
                <div className="text-sm opacity-80">6-Month Mortality</div>
                <div className="text-xl font-semibold">{result.sixMonthMortality}%</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-medical-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-blue-800">
                <div className="font-semibold mb-1">Clinical Interpretation</div>
                <p>{result.interpretation}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 border border-medical-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-5 h-5 text-medical-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-amber-800">
                <div className="font-semibold mb-2">Recommendations</div>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <div className="w-1 h-1 bg-medical-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="text-sm text-steel-700">
              <div className="font-semibold mb-2">Risk Categories</div>
              <div className="space-y-1 text-xs">
                <div>• Low: ≤108 points</div>
                <div>• Intermediate: 109-140 points</div>
                <div>• High: &gt;140 points</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRACEScoreCalculator;