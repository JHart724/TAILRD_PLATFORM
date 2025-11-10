import { FHIRObservation, FHIRPatient, Alert, Recommendation } from '../types';
import { createLogger } from 'winston';

const logger = createLogger({ service: 'observation-service' });

export interface TransformedObservation {
  id: string;
  patientId: string;
  category: 'vital-signs' | 'laboratory' | 'imaging' | 'assessment' | 'other';
  code: string;
  display: string;
  value?: number | string | boolean;
  unit?: string;
  status: 'final' | 'preliminary' | 'amended' | 'cancelled';
  effectiveDate: Date;
  issuedDate?: Date;
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };
  interpretation?: string;
  isAbnormal: boolean;
  clinicalSignificance: 'high' | 'medium' | 'low';
  moduleRelevance: {
    heartFailure: boolean;
    electrophysiology: boolean;
    structuralHeart: boolean;
    coronaryIntervention: boolean;
    peripheralVascular: boolean;
    valvularDisease: boolean;
  };
  createdAt: Date;
}

const CARDIOVASCULAR_LAB_CODES = {
  'BNP': ['33747-0', '30934-4'],
  'NT-proBNP': ['33762-9', '71425-3'],
  'Troponin': ['10839-9', '49563-0', '6598-7'],
  'CK-MB': ['13969-1', '32673-6'],
  'Total Cholesterol': ['2093-3'],
  'LDL': ['13457-7', '18262-6'],
  'HDL': ['2085-9'],
  'Triglycerides': ['2571-8'],
  'HbA1c': ['4548-4', '17856-6'],
  'Creatinine': ['2160-0'],
  'eGFR': ['33914-3'],
  'INR': ['34714-6'],
  'PT': ['5902-2'],
  'PTT': ['3173-2'],
  'D-dimer': ['48065-7']
};

const VITAL_SIGNS_CODES = {
  'Blood Pressure Systolic': ['8480-6'],
  'Blood Pressure Diastolic': ['8462-4'],
  'Heart Rate': ['8867-4'],
  'Respiratory Rate': ['9279-1'],
  'Temperature': ['8310-5'],
  'Oxygen Saturation': ['2708-6'],
  'Weight': ['29463-7'],
  'Height': ['8302-2'],
  'BMI': ['39156-5']
};

export const transformFHIRObservation = (
  fhirObservation: FHIRObservation, 
  patient?: FHIRPatient
): TransformedObservation => {
  try {
    const code = fhirObservation.code?.coding?.[0];
    const category = determineObservationCategory(fhirObservation);
    const value = extractObservationValue(fhirObservation);
    const referenceRange = extractReferenceRange(fhirObservation);
    const interpretation = fhirObservation.interpretation?.[0]?.coding?.[0]?.display;
    
    const transformed: TransformedObservation = {
      id: fhirObservation.id || '',
      patientId: patient?.id || fhirObservation.subject?.reference?.split('/')[1] || '',
      category,
      code: code?.code || '',
      display: code?.display || fhirObservation.code?.text || '',
      value: value.value,
      unit: value.unit,
      status: (fhirObservation.status as any) || 'final',
      effectiveDate: new Date(fhirObservation.effectiveDateTime || fhirObservation.effectivePeriod?.start || new Date()),
      issuedDate: fhirObservation.issued ? new Date(fhirObservation.issued) : undefined,
      referenceRange,
      interpretation,
      isAbnormal: isAbnormalValue(code?.code || '', value.value, referenceRange, interpretation),
      clinicalSignificance: determineClinicalSignificance(code?.code || '', value.value, referenceRange),
      moduleRelevance: determineModuleRelevance(code?.code || '', code?.display || ''),
      createdAt: new Date()
    };

    logger.info('Successfully transformed FHIR observation', {
      observationId: transformed.id,
      patientId: transformed.patientId,
      code: transformed.code,
      value: transformed.value
    });

    return transformed;
  } catch (error: any) {
    logger.error('Error transforming FHIR observation:', {
      error: error.message,
      observationId: fhirObservation.id
    });
    throw error;
  }
};

const determineObservationCategory = (observation: FHIRObservation): TransformedObservation['category'] => {
  const categoryCode = observation.category?.[0]?.coding?.[0]?.code;
  const observationCode = observation.code?.coding?.[0]?.code;

  if (categoryCode === 'vital-signs' || isVitalSign(observationCode || '')) {
    return 'vital-signs';
  }
  if (categoryCode === 'laboratory' || isLabValue(observationCode || '')) {
    return 'laboratory';
  }
  if (categoryCode === 'imaging') {
    return 'imaging';
  }
  if (categoryCode === 'survey' || categoryCode === 'assessment') {
    return 'assessment';
  }
  
  return 'other';
};

const isVitalSign = (code: string): boolean => {
  return Object.values(VITAL_SIGNS_CODES).some(codes => codes.includes(code));
};

const isLabValue = (code: string): boolean => {
  return Object.values(CARDIOVASCULAR_LAB_CODES).some(codes => codes.includes(code));
};

const extractObservationValue = (observation: FHIRObservation): { value?: number | string | boolean; unit?: string } => {
  if (observation.valueQuantity) {
    return {
      value: observation.valueQuantity.value,
      unit: observation.valueQuantity.unit || observation.valueQuantity.code
    };
  }
  
  if (observation.valueString) {
    return { value: observation.valueString };
  }
  
  if (observation.valueBoolean !== undefined) {
    return { value: observation.valueBoolean };
  }
  
  if (observation.valueInteger !== undefined) {
    return { value: observation.valueInteger };
  }
  
  if (observation.valueCodeableConcept) {
    return { value: observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding?.[0]?.display };
  }
  
  return {};
};

const extractReferenceRange = (observation: FHIRObservation): TransformedObservation['referenceRange'] => {
  const range = observation.referenceRange?.[0];
  if (!range) return undefined;
  
  return {
    low: range.low?.value,
    high: range.high?.value,
    text: range.text
  };
};

const isAbnormalValue = (
  code: string, 
  value: number | string | boolean | undefined, 
  referenceRange?: TransformedObservation['referenceRange'],
  interpretation?: string
): boolean => {
  if (interpretation) {
    const abnormalFlags = ['H', 'L', 'HH', 'LL', 'A', 'AA'];
    return abnormalFlags.some(flag => interpretation.includes(flag));
  }
  
  if (typeof value === 'number' && referenceRange) {
    if (referenceRange.low !== undefined && value < referenceRange.low) return true;
    if (referenceRange.high !== undefined && value > referenceRange.high) return true;
  }
  
  return false;
};

const determineClinicalSignificance = (
  code: string, 
  value: number | string | boolean | undefined,
  referenceRange?: TransformedObservation['referenceRange']
): 'high' | 'medium' | 'low' => {
  const criticalLabCodes = ['33747-0', '30934-4', '33762-9', '71425-3', '10839-9', '49563-0'];
  
  if (criticalLabCodes.includes(code)) {
    return 'high';
  }
  
  if (typeof value === 'number' && referenceRange) {
    const deviation = calculateDeviation(value, referenceRange);
    if (deviation > 2) return 'high';
    if (deviation > 1) return 'medium';
  }
  
  return 'low';
};

const calculateDeviation = (value: number, referenceRange: TransformedObservation['referenceRange']): number => {
  if (!referenceRange) return 0;
  
  const { low, high } = referenceRange;
  if (low !== undefined && high !== undefined) {
    const midpoint = (low + high) / 2;
    const range = high - low;
    return Math.abs(value - midpoint) / (range / 2);
  }
  
  return 0;
};

const determineModuleRelevance = (code: string, display: string): TransformedObservation['moduleRelevance'] => {
  const lowerDisplay = display.toLowerCase();
  
  return {
    heartFailure: isRelevantToHeartFailure(code, lowerDisplay),
    electrophysiology: isRelevantToEP(code, lowerDisplay),
    structuralHeart: isRelevantToStructural(code, lowerDisplay),
    coronaryIntervention: isRelevantToCoronary(code, lowerDisplay),
    peripheralVascular: isRelevantToPeripheral(code, lowerDisplay),
    valvularDisease: isRelevantToValvular(code, lowerDisplay)
  };
};

const isRelevantToHeartFailure = (code: string, display: string): boolean => {
  const hfCodes = [...CARDIOVASCULAR_LAB_CODES.BNP, ...CARDIOVASCULAR_LAB_CODES['NT-proBNP']];
  return hfCodes.includes(code) || 
         display.includes('bnp') || 
         display.includes('brain natriuretic') ||
         display.includes('ejection fraction');
};

const isRelevantToEP = (code: string, display: string): boolean => {
  return display.includes('rhythm') || 
         display.includes('arrhythmia') ||
         display.includes('atrial fibrillation') ||
         display.includes('heart rate');
};

const isRelevantToStructural = (code: string, display: string): boolean => {
  return display.includes('septal') ||
         display.includes('congenital') ||
         display.includes('structural');
};

const isRelevantToCoronary = (code: string, display: string): boolean => {
  const coronaryCodes = [...CARDIOVASCULAR_LAB_CODES.Troponin, ...CARDIOVASCULAR_LAB_CODES['CK-MB']];
  return coronaryCodes.includes(code) ||
         display.includes('troponin') ||
         display.includes('coronary') ||
         display.includes('myocardial');
};

const isRelevantToPeripheral = (code: string, display: string): boolean => {
  return display.includes('peripheral') ||
         display.includes('ankle brachial') ||
         display.includes('claudication');
};

const isRelevantToValvular = (code: string, display: string): boolean => {
  return display.includes('valve') ||
         display.includes('stenosis') ||
         display.includes('regurgitation');
};

export const generateClinicalAlerts = (observations: TransformedObservation[]): Alert[] => {
  const alerts: Alert[] = [];
  
  observations.forEach(obs => {
    if (obs.isAbnormal && obs.clinicalSignificance === 'high') {
      alerts.push({
        id: `alert-${obs.id}`,
        type: 'clinical',
        severity: 'high',
        message: `Critical abnormal result: ${obs.display} = ${obs.value} ${obs.unit || ''}`,
        patientId: obs.patientId,
        actionRequired: true,
        createdAt: new Date()
      });
    }
  });
  
  return alerts;
};

export const generateClinicalRecommendations = (observations: TransformedObservation[]): Recommendation[] => {
  const recommendations: Recommendation[] = [];
  
  observations.forEach(obs => {
    if (obs.moduleRelevance.heartFailure && obs.code.includes('33747-0') && typeof obs.value === 'number' && obs.value > 400) {
      recommendations.push({
        id: `rec-${obs.id}`,
        type: 'medication',
        priority: 'high',
        description: 'Consider ACE inhibitor optimization based on elevated BNP',
        evidence: 'ACC/AHA Heart Failure Guidelines',
        patientId: obs.patientId,
        moduleType: 'heart-failure',
        createdAt: new Date()
      });
    }
  });
  
  return recommendations;
};

export const processObservationData = async (
  fhirObservation: FHIRObservation, 
  patient?: FHIRPatient
): Promise<void> => {
  try {
    logger.info('Processing observation data', {
      observationId: fhirObservation.id,
      patientId: patient?.id
    });

    const transformedObservation = transformFHIRObservation(fhirObservation, patient);
    const alerts = generateClinicalAlerts([transformedObservation]);
    const recommendations = generateClinicalRecommendations([transformedObservation]);

    logger.info('Observation data processed successfully', {
      observationId: transformedObservation.id,
      alertsGenerated: alerts.length,
      recommendationsGenerated: recommendations.length
    });

  } catch (error: any) {
    logger.error('Error processing observation data:', {
      error: error.message,
      stack: error.stack,
      observationId: fhirObservation.id
    });
    throw error;
  }
};