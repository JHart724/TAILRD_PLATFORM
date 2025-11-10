import { FHIRPatient, CardiovascularModule } from '../types';
import { createLogger } from 'winston';

const logger = createLogger({ service: 'patient-service' });

export interface TransformedPatient {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  mrn?: string;
  isActive: boolean;
  cardiovascularRiskFactors: {
    hypertension: boolean;
    diabetes: boolean;
    smoking: boolean;
    familyHistory: boolean;
    hyperlipidemia: boolean;
  };
  assignedModules: CardiovascularModule['type'][];
  createdAt: Date;
  updatedAt: Date;
}

export const transformFHIRPatient = (fhirPatient: FHIRPatient): TransformedPatient => {
  try {
    const primaryName = fhirPatient.name?.[0];
    const primaryPhone = fhirPatient.telecom?.find(t => t.system === 'phone');
    const primaryEmail = fhirPatient.telecom?.find(t => t.system === 'email');
    const primaryAddress = fhirPatient.address?.[0];
    const mrnIdentifier = fhirPatient.identifier?.find(id => 
      id.type?.coding?.[0]?.code === 'MR' || 
      id.use === 'usual'
    );

    const transformed: TransformedPatient = {
      id: fhirPatient.id || '',
      externalId: fhirPatient.id || '',
      firstName: primaryName?.given?.[0] || '',
      lastName: primaryName?.family || '',
      dateOfBirth: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : new Date(),
      gender: fhirPatient.gender || 'unknown',
      email: primaryEmail?.value,
      phone: primaryPhone?.value,
      address: primaryAddress ? {
        street: primaryAddress.line?.[0] || '',
        city: primaryAddress.city || '',
        state: primaryAddress.state || '',
        zipCode: primaryAddress.postalCode || ''
      } : undefined,
      mrn: mrnIdentifier?.value,
      isActive: fhirPatient.active !== false,
      cardiovascularRiskFactors: {
        hypertension: false,
        diabetes: false,
        smoking: false,
        familyHistory: false,
        hyperlipidemia: false
      },
      assignedModules: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info('Successfully transformed FHIR patient', {
      patientId: transformed.id,
      firstName: transformed.firstName,
      lastName: transformed.lastName
    });

    return transformed;
  } catch (error: any) {
    logger.error('Error transforming FHIR patient:', {
      error: error.message,
      patientId: fhirPatient.id
    });
    throw error;
  }
};

export const determineCardiovascularModules = (patient: TransformedPatient, clinicalData?: any[]): CardiovascularModule['type'][] => {
  const modules: CardiovascularModule['type'][] = [];
  
  try {
    if (patient.cardiovascularRiskFactors.hypertension || 
        patient.cardiovascularRiskFactors.diabetes ||
        patient.cardiovascularRiskFactors.hyperlipidemia) {
      modules.push('heart-failure');
    }

    if (clinicalData) {
      const hasArrhythmia = clinicalData.some(data => 
        data.code?.coding?.some((coding: any) => 
          coding.code === 'I48' || 
          coding.display?.toLowerCase().includes('atrial fibrillation')
        )
      );
      
      if (hasArrhythmia) {
        modules.push('electrophysiology');
      }

      const hasValvularDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I05') ||
          coding.code?.startsWith('I06') ||
          coding.code?.startsWith('I07') ||
          coding.code?.startsWith('I08') ||
          coding.display?.toLowerCase().includes('valve')
        )
      );

      if (hasValvularDisease) {
        modules.push('valvular-disease');
      }

      const hasCoronaryDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I25') ||
          coding.display?.toLowerCase().includes('coronary')
        )
      );

      if (hasCoronaryDisease) {
        modules.push('coronary-intervention');
      }

      const hasPeripheralDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I70') ||
          coding.display?.toLowerCase().includes('peripheral')
        )
      );

      if (hasPeripheralDisease) {
        modules.push('peripheral-vascular');
      }

      const hasStructuralDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('Q2') ||
          coding.display?.toLowerCase().includes('septal defect') ||
          coding.display?.toLowerCase().includes('structural')
        )
      );

      if (hasStructuralDisease) {
        modules.push('structural-heart');
      }
    }

    if (modules.length === 0) {
      modules.push('heart-failure');
    }

    logger.info('Determined cardiovascular modules for patient', {
      patientId: patient.id,
      modules: modules
    });

    return modules;
  } catch (error: any) {
    logger.error('Error determining cardiovascular modules:', {
      error: error.message,
      patientId: patient.id
    });
    return ['heart-failure'];
  }
};

export const processPatientData = async (fhirPatient: FHIRPatient, eventType: string): Promise<void> => {
  try {
    logger.info(`Processing patient data for event: ${eventType}`, {
      patientId: fhirPatient.id
    });

    const transformedPatient = transformFHIRPatient(fhirPatient);
    const assignedModules = determineCardiovascularModules(transformedPatient);
    
    transformedPatient.assignedModules = assignedModules;

    logger.info('Patient data processed successfully', {
      patientId: transformedPatient.id,
      modules: assignedModules,
      eventType
    });

  } catch (error: any) {
    logger.error('Error processing patient data:', {
      error: error.message,
      stack: error.stack,
      patientId: fhirPatient.id,
      eventType
    });
    throw error;
  }
};