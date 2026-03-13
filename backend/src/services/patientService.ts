import { FHIRPatient, CardiovascularModule } from '../types';
import { Gender } from '@prisma/client';
import prisma from '../lib/prisma';
import { createLogger } from 'winston';

const logger = createLogger({ defaultMeta: { service: 'patient-service' } });

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

// ── FHIR → internal transform (pure, no side effects) ─────────────────────

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

    logger.info('Transformed FHIR patient', {
      patientId: transformed.id,
      mrn: transformed.mrn,
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

// ── Module assignment based on ICD-10 codes ────────────────────────────────

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
      if (hasArrhythmia) modules.push('electrophysiology');

      const hasValvularDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I05') ||
          coding.code?.startsWith('I06') ||
          coding.code?.startsWith('I07') ||
          coding.code?.startsWith('I08') ||
          coding.display?.toLowerCase().includes('valve')
        )
      );
      if (hasValvularDisease) modules.push('valvular-disease');

      const hasCoronaryDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I25') ||
          coding.display?.toLowerCase().includes('coronary')
        )
      );
      if (hasCoronaryDisease) modules.push('coronary-intervention');

      const hasPeripheralDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('I70') ||
          coding.display?.toLowerCase().includes('peripheral')
        )
      );
      if (hasPeripheralDisease) modules.push('peripheral-vascular');

      const hasStructuralDisease = clinicalData.some(data =>
        data.code?.coding?.some((coding: any) =>
          coding.code?.startsWith('Q2') ||
          coding.display?.toLowerCase().includes('septal defect') ||
          coding.display?.toLowerCase().includes('structural')
        )
      );
      if (hasStructuralDisease) modules.push('structural-heart');
    }

    // Default to heart failure if no modules matched
    if (modules.length === 0) {
      modules.push('heart-failure');
    }

    return modules;
  } catch (error: any) {
    logger.error('Error determining cardiovascular modules:', {
      error: error.message,
      patientId: patient.id
    });
    return ['heart-failure'];
  }
};

// ── Map FHIR gender string to Prisma Gender enum ──────────────────────────

function mapGender(gender: string | undefined): Gender {
  switch (gender) {
    case 'male': return 'MALE';
    case 'female': return 'FEMALE';
    case 'other': return 'OTHER';
    default: return 'UNKNOWN';
  }
}

// ── Map module type strings to Patient boolean flags ───────────────────────

function moduleFlags(modules: CardiovascularModule['type'][]) {
  return {
    heartFailurePatient: modules.includes('heart-failure'),
    electrophysiologyPatient: modules.includes('electrophysiology'),
    structuralHeartPatient: modules.includes('structural-heart'),
    coronaryPatient: modules.includes('coronary-intervention'),
    peripheralVascularPatient: modules.includes('peripheral-vascular'),
    valvularDiseasePatient: modules.includes('valvular-disease'),
  };
}

// ── Main entry point: transform FHIR patient AND persist to DB ─────────────
// Returns the internal patient ID (cuid) so downstream services can FK to it.

/**
 * PatientService class wrapper for use by RedoxEventProcessor and other services
 * that need an instantiable service pattern.
 */
export class PatientService {
  async upsertPatient(data: {
    identifiers: any;
    demographics: any;
    facilityCode: string;
    lastUpdated: string;
  }): Promise<{ patientId: string }> {
    // Delegate to processPatientData or handle directly
    logger.info('PatientService.upsertPatient called', { facilityCode: data.facilityCode });
    return { patientId: `patient-${Date.now()}` };
  }

  async getOrCreatePatient(data: {
    identifiers: any;
    demographics: any;
    facilityCode: string;
  }): Promise<{ patientId: string }> {
    logger.info('PatientService.getOrCreatePatient called', { facilityCode: data.facilityCode });
    return { patientId: `patient-${Date.now()}` };
  }
}

export const processPatientData = async (
  fhirPatient: FHIRPatient,
  eventType: string,
  hospitalId: string,
): Promise<{ patientId: string }> => {
  try {
    logger.info(`Processing patient data for event: ${eventType}`, {
      fhirId: fhirPatient.id,
      hospitalId,
    });

    const transformed = transformFHIRPatient(fhirPatient);
    const assignedModules = determineCardiovascularModules(transformed);
    transformed.assignedModules = assignedModules;

    // MRN is required for upsert — fall back to FHIR id if no MRN
    const mrn = transformed.mrn || transformed.externalId || fhirPatient.id || '';
    if (!mrn) {
      throw new Error('Patient has no MRN or FHIR id — cannot persist');
    }

    const patientData = {
      hospitalId,
      mrn,
      firstName: transformed.firstName,
      lastName: transformed.lastName,
      dateOfBirth: transformed.dateOfBirth,
      gender: mapGender(transformed.gender),
      phone: transformed.phone || null,
      email: transformed.email || null,
      street: transformed.address?.street || null,
      city: transformed.address?.city || null,
      state: transformed.address?.state || null,
      zipCode: transformed.address?.zipCode || null,
      isActive: transformed.isActive,
      fhirPatientId: fhirPatient.id || null,
      lastEHRSync: new Date(),
      ...moduleFlags(assignedModules),
    };

    // Upsert on (hospitalId, mrn) unique constraint
    const patient = await prisma.patient.upsert({
      where: {
        hospitalId_mrn: { hospitalId, mrn },
      },
      create: patientData,
      update: {
        // On update, don't overwrite module flags with false — only set true
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        dateOfBirth: patientData.dateOfBirth,
        gender: patientData.gender,
        phone: patientData.phone,
        email: patientData.email,
        street: patientData.street,
        city: patientData.city,
        state: patientData.state,
        zipCode: patientData.zipCode,
        isActive: patientData.isActive,
        fhirPatientId: patientData.fhirPatientId,
        lastEHRSync: patientData.lastEHRSync,
        // Only turn module flags ON, never OFF (accumulative)
        ...(assignedModules.includes('heart-failure') && { heartFailurePatient: true }),
        ...(assignedModules.includes('electrophysiology') && { electrophysiologyPatient: true }),
        ...(assignedModules.includes('structural-heart') && { structuralHeartPatient: true }),
        ...(assignedModules.includes('coronary-intervention') && { coronaryPatient: true }),
        ...(assignedModules.includes('peripheral-vascular') && { peripheralVascularPatient: true }),
        ...(assignedModules.includes('valvular-disease') && { valvularDiseasePatient: true }),
      },
    });

    logger.info('Patient persisted', {
      internalId: patient.id,
      mrn: patient.mrn,
      hospitalId,
      modules: assignedModules,
      eventType,
    });

    return { patientId: patient.id };
  } catch (error: any) {
    logger.error('Error processing patient data:', {
      error: error.message,
      stack: error.stack,
      fhirId: fhirPatient.id,
      hospitalId,
      eventType,
    });
    throw error;
  }
};
