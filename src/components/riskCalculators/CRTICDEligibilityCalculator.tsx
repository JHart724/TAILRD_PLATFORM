import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface CRTICDEligibilityProps {
  ejectionFraction: number; // EF percentage
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  qrsDuration: number; // milliseconds
  qrsMorphology: 'LBBB' | 'RBBB' | 'IVCD' | 'Normal';
  optimalMedicalTherapy: boolean;
  lifeExpectancy: '>1 year' | '<1 year';
  priorSCD: boolean; // Prior sudden cardiac death or VT/VF
  ischemicCardiomyopathy: boolean;
  atriallFibrillation: boolean;
  kidneyFunction: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
}

interface DeviceRecommendation {
  crtEligible: boolean;
  icdEligible: boolean;
  crtdEligible: boolean; // CRT-D (combined)
  primaryRecommendation: string;
  classRecommendation: string;
  evidenceLevel: string;
  reasoning: string[];
  contraindications: string[];
}

const CRTICDEligibilityCalculator: React.FC<CRTICDEligibilityProps> = ({
  ejectionFraction,
  nyhaClass,
  qrsDuration,
  qrsMorphology,
  optimalMedicalTherapy,
  lifeExpectancy,
  priorSCD,
  ischemicCardiomyopathy,
  atriallFibrillation,
  kidneyFunction,
}) => {
  if (!featureFlags.riskCalculators.crtIcdEligibility) {
    return null;
  }

  const calculateEligibility = (): DeviceRecommendation => {
    const reasoning: string[] = [];
    const contraindications: string[] = [];
    
    // Basic eligibility criteria
    const efEligible = ejectionFraction <= 35;
    const omtCompliant = optimalMedicalTherapy;
    const lifeExpectancyGood = lifeExpectancy === '>1 year';
    
    // ICD Eligibility Assessment
    let icdEligible = false;
    let icdClass = '';
    let icdEvidence = '';
    
    if (priorSCD) {
      icdEligible = true;
      icdClass = 'Class I';
      icdEvidence = 'Level A';
      reasoning.push('Secondary prevention indication (prior VT/VF/SCD)');
    } else if (efEligible && omtCompliant && lifeExpectancyGood) {
      if (ischemicCardiomyopathy && ejectionFraction <= 30) {
        icdEligible = true;
        icdClass = 'Class I';
        icdEvidence = 'Level A';
        reasoning.push('Primary prevention: Ischemic cardiomyopathy, EF ≤30%');
      } else if (!ischemicCardiomyopathy && ejectionFraction <= 35) {
        icdEligible = true;
        icdClass = 'Class I';
        icdEvidence = 'Level B';
        reasoning.push('Primary prevention: Non-ischemic cardiomyopathy, EF ≤35%');
      }
    }
    
    // CRT Eligibility Assessment
    let crtEligible = false;
    let crtClass = '';
    let crtEvidence = '';
    
    if (efEligible && omtCompliant && (nyhaClass === 'II' || nyhaClass === 'III' || nyhaClass === 'IV')) {
      if (qrsDuration >= 150 && qrsMorphology === 'LBBB') {
        crtEligible = true;
        crtClass = 'Class I';
        crtEvidence = 'Level A';
        reasoning.push('CRT indication: LBBB ≥150ms, NYHA II-IV, EF ≤35%');
      } else if (qrsDuration >= 120 && qrsDuration < 150 && qrsMorphology === 'LBBB') {
        crtEligible = true;
        crtClass = 'Class IIa';
        crtEvidence = 'Level B';
        reasoning.push('CRT indication: LBBB 120-149ms, NYHA II-IV, EF ≤35%');
      } else if (qrsDuration >= 150 && qrsMorphology !== 'LBBB') {
        crtEligible = true;
        crtClass = 'Class IIa';
        crtEvidence = 'Level B';
        reasoning.push('CRT indication: Non-LBBB ≥150ms, NYHA II-IV, EF ≤35%');
      }
    }
    
    // CRT-D (Combined) Eligibility
    const crtdEligible = crtEligible && icdEligible;
    
    // Check contraindications
    if (!omtCompliant) {
      contraindications.push('Optimal medical therapy not achieved');
    }
    if (lifeExpectancy === '<1 year') {
      contraindications.push('Limited life expectancy (<1 year)');
    }
    if (kidneyFunction === 'Severe') {
      contraindications.push('Severe kidney dysfunction may affect outcomes');
    }
    
    // Determine primary recommendation
    let primaryRecommendation = '';
    let classRecommendation = '';
    let evidenceLevel = '';
    
    if (crtdEligible) {
      primaryRecommendation = 'CRT-D (Cardiac Resynchronization Therapy with Defibrillator)';
      classRecommendation = crtClass; // Use CRT class as it's typically more restrictive
      evidenceLevel = crtEvidence;
    } else if (crtEligible) {
      primaryRecommendation = 'CRT-P (Cardiac Resynchronization Therapy Pacemaker)';
      classRecommendation = crtClass;
      evidenceLevel = crtEvidence;
    } else if (icdEligible) {
      primaryRecommendation = 'ICD (Implantable Cardioverter Defibrillator)';
      classRecommendation = icdClass;
      evidenceLevel = icdEvidence;
    } else {
      primaryRecommendation = 'No device therapy indicated';
      classRecommendation = 'Not indicated';
      evidenceLevel = '';
    }
    
    return {
      crtEligible,
      icdEligible,
      crtdEligible,
      primaryRecommendation,
      classRecommendation,
      evidenceLevel,
      reasoning,
      contraindications,
    };
  };

  const {
    crtEligible,
    icdEligible,
    crtdEligible,
    primaryRecommendation,
    classRecommendation,
    evidenceLevel,
    reasoning,
    contraindications,
  } = calculateEligibility();

  const getRecommendationColor = (recommendation: string): string => {
    if (recommendation.includes('CRT-D')) return 'text-purple-600';
    if (recommendation.includes('CRT-P')) return 'text-blue-600';
    if (recommendation.includes('ICD')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getClassColor = (classRec: string): string => {
    if (classRec === 'Class I') return 'text-green-600';
    if (classRec === 'Class IIa') return 'text-blue-600';
    if (classRec === 'Class IIb') return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        CRT/ICD Eligibility Assessment
      </h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-2xl font-bold ${icdEligible ? 'text-red-600' : 'text-gray-400'} mb-1`}>
            {icdEligible ? '✓' : '✗'}
          </div>
          <div className="text-sm text-gray-600">ICD Eligible</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${crtEligible ? 'text-blue-600' : 'text-gray-400'} mb-1`}>
            {crtEligible ? '✓' : '✗'}
          </div>
          <div className="text-sm text-gray-600">CRT Eligible</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${crtdEligible ? 'text-purple-600' : 'text-gray-400'} mb-1`}>
            {crtdEligible ? '✓' : '✗'}
          </div>
          <div className="text-sm text-gray-600">CRT-D Eligible</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-2">
          <div className={`text-lg font-semibold ${getRecommendationColor(primaryRecommendation)}`}>
            {primaryRecommendation}
          </div>
        </div>
        
        {classRecommendation !== 'Not indicated' && (
          <div className="text-center">
            <span className={`font-medium ${getClassColor(classRecommendation)}`}>
              {classRecommendation}
            </span>
            {evidenceLevel && (
              <span className="text-gray-600 ml-2">
                (Evidence {evidenceLevel})
              </span>
            )}
          </div>
        )}
      </div>

      {reasoning.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-800 mb-2">Clinical Rationale:</div>
          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
            {reasoning.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {contraindications.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-red-800 mb-2">Considerations/Contraindications:</div>
          <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
            {contraindications.map((contraindication, index) => (
              <li key={index}>{contraindication}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Key Eligibility Criteria:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>ICD:</strong> EF ≤35% (ischemic) or ≤30% (non-ischemic) + OMT + life expectancy &gt;1 year</li>
            <li><strong>CRT:</strong> EF ≤35% + NYHA II-IV + QRS ≥120ms (preferably LBBB ≥150ms) + OMT</li>
            <li><strong>CRT-D:</strong> Meets criteria for both CRT and ICD</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Current Patient Parameters:</strong></p>
          <div className="grid grid-cols-2 gap-2">
            <div>EF: {ejectionFraction}%</div>
            <div>NYHA Class: {nyhaClass}</div>
            <div>QRS Duration: {qrsDuration}ms</div>
            <div>QRS Morphology: {qrsMorphology}</div>
            <div>OMT: {optimalMedicalTherapy ? 'Yes' : 'No'}</div>
            <div>Life Expectancy: {lifeExpectancy}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRTICDEligibilityCalculator;