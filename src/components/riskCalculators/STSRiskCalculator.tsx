import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface STSRiskCalculatorProps {
  age: number;
  sex: 'male' | 'female';
  hasDiabetes: boolean;
  hasDialysis: boolean;
  hasHypertension: boolean;
  hasPriorCardiacSurgery: boolean;
  ejectionFraction: number;
  procedureType: 'TAVR' | 'Surgical AVR' | 'Mitral Repair' | 'Mitral Replacement';
  hasChronicLungDisease: boolean;
  hasCarotidDisease: boolean;
  hasPVD: boolean;
  creatinine: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
}

interface STSResult {
  mortalityRisk: number;
  morbidityRisk: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  procedureRecommendation: string;
  riskFactors: string[];
  protectiveFactors: string[];
}

const STSRiskCalculator: React.FC<STSRiskCalculatorProps> = ({
  age,
  sex,
  hasDiabetes,
  hasDialysis,
  hasHypertension,
  hasPriorCardiacSurgery,
  ejectionFraction,
  procedureType,
  hasChronicLungDisease,
  hasCarotidDisease,
  hasPVD,
  creatinine,
  nyhaClass,
}) => {
  if (!featureFlags.riskCalculators.stsRisk) {
    return null;
  }

  const calculateSTSRisk = (): STSResult => {
    // STS Risk Score calculation (simplified model based on key variables)
    let baseRisk = 2.0; // Base mortality risk
    let morbidityMultiplier = 3.5; // Typical morbidity is ~3.5x mortality risk
    
    const riskFactors: string[] = [];
    const protectiveFactors: string[] = [];

    // Age contribution (most significant factor)
    if (age >= 80) {
      baseRisk += 4.5;
      riskFactors.push('Age ≥80 years');
    } else if (age >= 70) {
      baseRisk += 2.0;
      riskFactors.push('Age 70-79 years');
    } else if (age >= 60) {
      baseRisk += 0.5;
    } else {
      protectiveFactors.push('Younger age (<60 years)');
    }

    // Female sex (slightly protective for most cardiac procedures)
    if (sex === 'female') {
      baseRisk *= 0.9;
      protectiveFactors.push('Female sex');
    }

    // Ejection fraction
    if (ejectionFraction < 30) {
      baseRisk += 3.0;
      riskFactors.push('Severe LV dysfunction (EF <30%)');
    } else if (ejectionFraction < 40) {
      baseRisk += 1.5;
      riskFactors.push('Moderate LV dysfunction (EF 30-39%)');
    } else if (ejectionFraction >= 60) {
      protectiveFactors.push('Normal LV function (EF ≥60%)');
    }

    // Comorbidities
    if (hasDialysis) {
      baseRisk += 6.0;
      riskFactors.push('Dialysis-dependent renal failure');
    } else if (creatinine > 2.0) {
      baseRisk += 2.5;
      riskFactors.push('Chronic kidney disease (Cr >2.0)');
    }

    if (hasDiabetes) {
      baseRisk += 1.0;
      riskFactors.push('Diabetes mellitus');
    }

    if (hasChronicLungDisease) {
      baseRisk += 1.5;
      riskFactors.push('Chronic lung disease');
    }

    if (hasCarotidDisease) {
      baseRisk += 1.2;
      riskFactors.push('Carotid artery disease');
    }

    if (hasPVD) {
      baseRisk += 1.0;
      riskFactors.push('Peripheral vascular disease');
    }

    if (hasPriorCardiacSurgery) {
      baseRisk += 2.0;
      riskFactors.push('Prior cardiac surgery');
    }

    // NYHA Class
    if (nyhaClass === 'IV') {
      baseRisk += 2.5;
      riskFactors.push('NYHA Class IV heart failure');
    } else if (nyhaClass === 'III') {
      baseRisk += 1.0;
      riskFactors.push('NYHA Class III symptoms');
    }

    // Procedure-specific adjustments
    switch (procedureType) {
      case 'TAVR':
        baseRisk *= 0.7; // TAVR generally lower risk than surgical
        break;
      case 'Surgical AVR':
        // Base risk applies
        break;
      case 'Mitral Repair':
        baseRisk *= 1.2;
        break;
      case 'Mitral Replacement':
        baseRisk *= 1.5;
        break;
    }

    // Calculate final risks
    const mortalityRisk = Math.min(Math.max(baseRisk, 0.5), 25.0); // Cap between 0.5-25%
    const morbidityRisk = Math.min(mortalityRisk * morbidityMultiplier, 50.0); // Cap at 50%

    // Risk categorization
    let riskCategory: 'Low' | 'Intermediate' | 'High';
    let procedureRecommendation: string;

    if (mortalityRisk < 4.0) {
      riskCategory = 'Low';
      procedureRecommendation = 'Surgical intervention appropriate. Both TAVR and surgical approaches suitable.';
    } else if (mortalityRisk < 8.0) {
      riskCategory = 'Intermediate';
      procedureRecommendation = 'Heart team evaluation recommended. Consider patient-specific factors.';
    } else {
      riskCategory = 'High';
      procedureRecommendation = 'High surgical risk. Consider TAVR or medical management if TAVR unsuitable.';
    }

    return {
      mortalityRisk: Math.round(mortalityRisk * 10) / 10,
      morbidityRisk: Math.round(morbidityRisk * 10) / 10,
      riskCategory,
      procedureRecommendation,
      riskFactors,
      protectiveFactors,
    };
  };

  const {
    mortalityRisk,
    morbidityRisk,
    riskCategory,
    procedureRecommendation,
    riskFactors,
    protectiveFactors,
  } = calculateSTSRisk();

  const getRiskColor = (category: string): string => {
    switch (category) {
      case 'Low': return 'text-green-600';
      case 'Intermediate': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskDescription = (category: string): string => {
    switch (category) {
      case 'Low': return '<4% mortality risk';
      case 'Intermediate': return '4-8% mortality risk';
      case 'High': return '>8% mortality risk';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        STS Risk Score
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getRiskColor(riskCategory)} mb-1`}>
            {mortalityRisk}%
          </div>
          <div className="text-sm text-gray-600">30-Day Mortality</div>
        </div>
        
        <div className="text-center">
          <div className={`text-3xl font-bold ${getRiskColor(riskCategory)} mb-1`}>
            {morbidityRisk}%
          </div>
          <div className="text-sm text-gray-600">Morbidity/Mortality</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-sm text-gray-600 mr-2">Risk Category:</span>
        <span className={`font-semibold ${getRiskColor(riskCategory)}`}>
          {riskCategory} Risk
        </span>
        <div className="text-xs text-gray-500 mt-1">
          {getRiskDescription(riskCategory)}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm">
          <p className="font-medium text-gray-800 mb-2">Clinical Recommendation:</p>
          <p className="text-gray-700 italic">{procedureRecommendation}</p>
        </div>
      </div>

      {riskFactors.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-red-800 mb-2">Risk Factors:</div>
          <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
            {riskFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {protectiveFactors.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-green-800 mb-2">Protective Factors:</div>
          <ul className="text-xs text-green-600 list-disc list-inside space-y-1">
            {protectiveFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>STS Risk Categories:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Low (&lt;4%):</strong> Surgical intervention appropriate, multiple approaches suitable</li>
            <li><strong>Intermediate (4-8%):</strong> Heart team evaluation recommended</li>
            <li><strong>High (&gt;8%):</strong> Consider transcatheter approaches or medical management</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Current Assessment:</strong></p>
          <div className="grid grid-cols-2 gap-2">
            <div>Age: {age} years</div>
            <div>Sex: {sex}</div>
            <div>EF: {ejectionFraction}%</div>
            <div>Procedure: {procedureType}</div>
            <div>NYHA: Class {nyhaClass}</div>
            <div>Creatinine: {creatinine} mg/dL</div>
          </div>
          <p className="mt-2">
            <em>Based on STS Adult Cardiac Surgery Database risk models</em>
          </p>
        </div>
      </div>
    </div>
  );
};

export default STSRiskCalculator;