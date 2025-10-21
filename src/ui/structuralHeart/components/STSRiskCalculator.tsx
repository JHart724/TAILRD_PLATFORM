import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';

interface STSInputs {
  age: number;
  gender: 'male' | 'female';
  raceEthnicity: 'white' | 'black' | 'hispanic' | 'asian' | 'other';
  payorType: 'medicare' | 'medicaid' | 'commercial' | 'other';
  transferIn: boolean;
  wbcCount: number;
  hemodynamicState: 'stable' | 'unstable' | 'shock';
  lastCreatinine: number;
  diabetes: boolean;
  hypertension: boolean;
  immunocompromised: boolean;
  pvd: boolean;
  cvd: boolean;
  chf: boolean;
  nyhaClass: 1 | 2 | 3 | 4;
  cardiogenicShock: boolean;
  resuscitation: boolean;
  arrhythmia: boolean;
  ef: number;
  mitralStenosis: boolean;
  procedureType: 'isolated_cabg' | 'isolated_valve' | 'cabg_valve' | 'other';
  urgency: 'elective' | 'urgent' | 'emergent' | 'salvage';
}

interface STSResult {
  mortalityRisk: number;
  morbidityRisk: number;
  riskCategory: 'Low' | 'Intermediate' | 'High' | 'Very High';
  interpretation: string;
  recommendations: string[];
  tavrEligibility: string;
}

const STSRiskCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<STSInputs>({
    age: 70,
    gender: 'male',
    raceEthnicity: 'white',
    payorType: 'medicare',
    transferIn: false,
    wbcCount: 7.5,
    hemodynamicState: 'stable',
    lastCreatinine: 1.1,
    diabetes: false,
    hypertension: true,
    immunocompromised: false,
    pvd: false,
    cvd: false,
    chf: false,
    nyhaClass: 2,
    cardiogenicShock: false,
    resuscitation: false,
    arrhythmia: false,
    ef: 55,
    mitralStenosis: false,
    procedureType: 'isolated_valve',
    urgency: 'elective'
  });

  const calculateSTS = (): STSResult => {
    let mortalityScore = 0;
    let morbidityScore = 0;

    // Age (continuous variable)
    const ageCoeff = inputs.procedureType === 'isolated_cabg' ? 0.0285 : 0.0315;
    mortalityScore += (inputs.age - 60) * ageCoeff;

    // Gender
    if (inputs.gender === 'female') {
      mortalityScore += inputs.procedureType === 'isolated_cabg' ? 0.2196 : 0.2467;
    }

    // Race/Ethnicity
    if (inputs.raceEthnicity === 'black') {
      mortalityScore += 0.0949;
    } else if (inputs.raceEthnicity === 'hispanic') {
      mortalityScore += -0.0901;
    }

    // Payor type
    if (inputs.payorType === 'medicaid') {
      mortalityScore += 0.1558;
    }

    // Transfer in
    if (inputs.transferIn) {
      mortalityScore += 0.2070;
    }

    // WBC count (if >11)
    if (inputs.wbcCount > 11) {
      mortalityScore += 0.0932;
    }

    // Hemodynamic state
    if (inputs.hemodynamicState === 'unstable') {
      mortalityScore += 0.2944;
    } else if (inputs.hemodynamicState === 'shock') {
      mortalityScore += 0.7507;
    }

    // Creatinine (continuous)
    if (inputs.lastCreatinine > 1.2) {
      mortalityScore += (inputs.lastCreatinine - 1.2) * 0.112;
    }

    // Comorbidities
    if (inputs.diabetes) mortalityScore += 0.0390;
    if (inputs.hypertension) mortalityScore += -0.0267;
    if (inputs.immunocompromised) mortalityScore += 0.1265;
    if (inputs.pvd) mortalityScore += 0.0844;
    if (inputs.cvd) mortalityScore += 0.0734;
    if (inputs.chf) mortalityScore += 0.0423;

    // NYHA Class (if CHF)
    if (inputs.chf && inputs.nyhaClass >= 3) {
      mortalityScore += 0.0526;
    }

    // Cardiogenic shock
    if (inputs.cardiogenicShock) {
      mortalityScore += 0.6826;
    }

    // Resuscitation
    if (inputs.resuscitation) {
      mortalityScore += 0.4625;
    }

    // Arrhythmia
    if (inputs.arrhythmia) {
      mortalityScore += 0.1309;
    }

    // Ejection Fraction (continuous)
    if (inputs.ef < 50) {
      mortalityScore += (50 - inputs.ef) * 0.0112;
    }

    // Mitral stenosis
    if (inputs.mitralStenosis) {
      mortalityScore += 0.1876;
    }

    // Procedure urgency
    if (inputs.urgency === 'urgent') {
      mortalityScore += 0.2713;
    } else if (inputs.urgency === 'emergent') {
      mortalityScore += 0.4677;
    } else if (inputs.urgency === 'salvage') {
      mortalityScore += 0.8727;
    }

    // Convert logistic score to percentage
    const mortalityRisk = Math.min(50, Math.max(0.1, 
      1 / (1 + Math.exp(-mortalityScore)) * 100
    ));

    // Morbidity calculation (simplified model)
    morbidityScore = mortalityScore * 1.2 + 0.5;
    const morbidityRisk = Math.min(60, Math.max(1, 
      1 / (1 + Math.exp(-morbidityScore)) * 100
    ));

    let riskCategory: 'Low' | 'Intermediate' | 'High' | 'Very High';
    let interpretation: string;
    let recommendations: string[];
    let tavrEligibility: string;

    if (mortalityRisk < 4) {
      riskCategory = 'Low';
      interpretation = 'Low surgical risk. Excellent candidate for conventional surgery.';
      recommendations = [
        'Surgical intervention recommended',
        'Standard preoperative preparation',
        'Expected excellent outcomes',
        'Routine postoperative care'
      ];
      tavrEligibility = 'Consider surgical AVR as first-line therapy';
    } else if (mortalityRisk < 8) {
      riskCategory = 'Intermediate';
      interpretation = 'Intermediate surgical risk. Good candidate for surgery or TAVR.';
      recommendations = [
        'Heart Team evaluation recommended',
        'Consider both surgical and transcatheter options',
        'Shared decision-making with patient',
        'Optimize comorbidities preoperatively'
      ];
      tavrEligibility = 'TAVR and SAVR are both reasonable options';
    } else if (mortalityRisk < 15) {
      riskCategory = 'High';
      interpretation = 'High surgical risk. TAVR may be preferred.';
      recommendations = [
        'TAVR likely preferred approach',
        'Comprehensive risk assessment needed',
        'Optimize medical therapy',
        'Consider palliative care consultation'
      ];
      tavrEligibility = 'TAVR preferred over surgical AVR';
    } else {
      riskCategory = 'Very High';
      interpretation = 'Prohibitive surgical risk. TAVR or medical management.';
      recommendations = [
        'TAVR if anatomy suitable',
        'Medical management if TAVR not feasible',
        'Palliative care involvement',
        'Quality of life focused care'
      ];
      tavrEligibility = 'TAVR only if technically feasible; consider medical management';
    }

    return {
      mortalityRisk: Math.round(mortalityRisk * 10) / 10,
      morbidityRisk: Math.round(morbidityRisk * 10) / 10,
      riskCategory,
      interpretation,
      recommendations,
      tavrEligibility
    };
  };

  const result = calculateSTS();

  const updateInput = (key: keyof STSInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Intermediate': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Very High': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-8 h-8 text-medical-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">STS Risk Calculator</h2>
          <p className="text-steel-600">Society of Thoracic Surgeons Predicted Risk of Mortality</p>
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
              <label className="block text-sm font-medium text-steel-700 mb-2">Gender</label>
              <select
                value={inputs.gender}
                onChange={(e) => updateInput('gender', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Ejection Fraction (%)</label>
              <input
                type="number"
                value={inputs.ef}
                onChange={(e) => updateInput('ef', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="10"
                max="80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Creatinine (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={inputs.lastCreatinine}
                onChange={(e) => updateInput('lastCreatinine', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
                min="0.3"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Procedure Type</label>
              <select
                value={inputs.procedureType}
                onChange={(e) => updateInput('procedureType', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
              >
                <option value="isolated_cabg">Isolated CABG</option>
                <option value="isolated_valve">Isolated Valve</option>
                <option value="cabg_valve">CABG + Valve</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Urgency</label>
              <select
                value={inputs.urgency}
                onChange={(e) => updateInput('urgency', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500 focus:border-medical-red-500"
              >
                <option value="elective">Elective</option>
                <option value="urgent">Urgent</option>
                <option value="emergent">Emergent</option>
                <option value="salvage">Salvage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.diabetes}
                onChange={(e) => updateInput('diabetes', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Diabetes</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.hypertension}
                onChange={(e) => updateInput('hypertension', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Hypertension</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.chf}
                onChange={(e) => updateInput('chf', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Heart Failure</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.pvd}
                onChange={(e) => updateInput('pvd', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Peripheral Vascular Disease</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-medical-red-50 rounded-lg cursor-pointer hover:bg-medical-red-100">
              <input
                type="checkbox"
                checked={inputs.cardiogenicShock}
                onChange={(e) => updateInput('cardiogenicShock', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Cardiogenic Shock</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-medical-red-50 rounded-lg cursor-pointer hover:bg-medical-red-100">
              <input
                type="checkbox"
                checked={inputs.resuscitation}
                onChange={(e) => updateInput('resuscitation', e.target.checked)}
                className="rounded text-medical-red-600"
              />
              <span className="text-sm font-medium text-steel-700">Resuscitation</span>
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
                <div className="text-sm opacity-80">STS PROM</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">Mortality Risk</div>
                <div className="text-2xl font-bold">{result.mortalityRisk}%</div>
              </div>
              
              <div>
                <div className="text-sm opacity-80">Morbidity Risk</div>
                <div className="text-xl font-semibold">{result.morbidityRisk}%</div>
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

          <div className="p-4 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-medical-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-purple-800">
                <div className="font-semibold mb-1">TAVR Eligibility</div>
                <p>{result.tavrEligibility}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="text-sm text-steel-700">
              <div className="font-semibold mb-2">Risk Categories</div>
              <div className="space-y-1 text-xs">
                <div>• Low: &lt;4% mortality risk</div>
                <div>• Intermediate: 4-8% mortality risk</div>
                <div>• High: 8-15% mortality risk</div>
                <div>• Very High: &gt;15% mortality risk</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default STSRiskCalculator;