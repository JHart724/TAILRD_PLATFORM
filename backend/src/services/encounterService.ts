import { FHIREncounter, FHIRPatient } from '../types';
import { EncounterType, EncounterStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createLogger } from 'winston';

const logger = createLogger({ defaultMeta: { service: 'encounter-service' } });

export interface TransformedEncounter {
  id: string;
  patientId: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: 'inpatient' | 'outpatient' | 'emergency' | 'observation' | 'day-surgery' | 'virtual' | 'other';
  type: string;
  startDate: Date;
  endDate?: Date;
  primaryDiagnosis?: {
    code: string;
    display: string;
    system: string;
  };
  secondaryDiagnoses: Array<{
    code: string;
    display: string;
    system: string;
    rank?: number;
  }>;
  location?: string;
  cardiovascularRelevance: {
    isCardiovascular: boolean;
    modules: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  clinicalOutcomes: {
    lengthOfStay?: number;
    discharge: {
      disposition?: string;
      instructions?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// ── ICD-10 code families per cardiovascular module ─────────────────────────

const CARDIOVASCULAR_ICD10_CODES: Record<string, { primary: string[]; secondary: string[] }> = {
  'heart-failure': {
    primary: ['I50', 'I11.0', 'I13.0', 'I13.2'],
    secondary: ['I25.5', 'I42', 'I43']
  },
  'coronary-intervention': {
    primary: ['I25', 'I20', 'I21', 'I22', 'I24'],
    secondary: ['Z95.1', 'Z95.5', 'Z98.61']
  },
  'electrophysiology': {
    primary: ['I47', 'I48', 'I49'],
    secondary: ['Z95.0', 'T82.1']
  },
  'valvular-disease': {
    primary: ['I05', 'I06', 'I07', 'I08', 'I34', 'I35', 'I36', 'I37'],
    secondary: ['Z95.2', 'Z95.3', 'Z95.4']
  },
  'structural-heart': {
    primary: ['Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25'],
    secondary: ['Z95.8', 'Z95.9']
  },
  'peripheral-vascular': {
    primary: ['I70', 'I71', 'I72', 'I73', 'I74', 'I77'],
    secondary: ['Z95.820', 'Z95.828']
  }
};

// ── Pure transformation ────────────────────────────────────────────────────

export const transformFHIREncounter = (
  fhirEncounter: FHIREncounter,
  patient?: FHIRPatient
): TransformedEncounter => {
  try {
    const encounterClass = mapEncounterClass(fhirEncounter.class?.code || '');
    const diagnoses = extractDiagnoses(fhirEncounter);
    const cardiovascularRelevance = assessCardiovascularRelevance(diagnoses);
    const clinicalOutcomes = extractClinicalOutcomes(fhirEncounter);

    const transformed: TransformedEncounter = {
      id: fhirEncounter.id || '',
      patientId: patient?.id || fhirEncounter.subject?.reference?.split('/')[1] || '',
      status: (fhirEncounter.status as any) || 'finished',
      class: encounterClass,
      type: fhirEncounter.type?.[0]?.coding?.[0]?.display || 'General',
      startDate: new Date(fhirEncounter.period?.start || new Date()),
      endDate: fhirEncounter.period?.end ? new Date(fhirEncounter.period.end) : undefined,
      primaryDiagnosis: diagnoses.primary,
      secondaryDiagnoses: diagnoses.secondary,
      location: fhirEncounter.location?.[0]?.location?.display,
      cardiovascularRelevance,
      clinicalOutcomes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return transformed;
  } catch (error: any) {
    logger.error('Error transforming FHIR encounter:', {
      error: error.message,
      encounterId: fhirEncounter.id
    });
    throw error;
  }
};

const mapEncounterClass = (classCode: string): TransformedEncounter['class'] => {
  const classMap: Record<string, TransformedEncounter['class']> = {
    'IMP': 'inpatient',
    'AMB': 'outpatient',
    'EMER': 'emergency',
    'OBSENC': 'observation',
    'SS': 'day-surgery',
    'VR': 'virtual'
  };
  return classMap[classCode] || 'other';
};

const extractDiagnoses = (encounter: FHIREncounter): {
  primary?: TransformedEncounter['primaryDiagnosis'];
  secondary: TransformedEncounter['secondaryDiagnoses'];
} => {
  const diagnoses = encounter.diagnosis || [];
  const result: {
    primary?: TransformedEncounter['primaryDiagnosis'];
    secondary: TransformedEncounter['secondaryDiagnoses'];
  } = { secondary: [] };

  diagnoses.forEach(diagnosis => {
    const condition = diagnosis.condition;
    if (!condition?.display) return;

    const diagnosisData = {
      code: extractICD10Code(condition.display),
      display: condition.display,
      system: 'http://hl7.org/fhir/sid/icd-10-cm',
      rank: diagnosis.rank
    };

    const isPrimary = diagnosis.use?.coding?.[0]?.code === 'CC' || diagnosis.rank === 1;
    if (isPrimary && !result.primary) {
      result.primary = diagnosisData;
    } else {
      result.secondary.push(diagnosisData);
    }
  });

  return result;
};

const extractICD10Code = (display: string): string => {
  const icd10Match = display.match(/([A-Z]\d{2}(?:\.\d{1,3})?)/);
  return icd10Match ? icd10Match[1] : '';
};

const assessCardiovascularRelevance = (diagnoses: {
  primary?: TransformedEncounter['primaryDiagnosis'];
  secondary: TransformedEncounter['secondaryDiagnoses'];
}): TransformedEncounter['cardiovascularRelevance'] => {
  const allDiagnoses = [
    ...(diagnoses.primary ? [diagnoses.primary] : []),
    ...diagnoses.secondary
  ];

  const relevantModules: string[] = [];
  let isCardiovascular = false;
  let maxRiskLevel: 'low' | 'medium' | 'high' = 'low';

  for (const [module, codes] of Object.entries(CARDIOVASCULAR_ICD10_CODES)) {
    const hasRelevantDiagnosis = allDiagnoses.some(diagnosis => {
      const code = diagnosis.code;
      return codes.primary.some(p => code.startsWith(p)) ||
             codes.secondary.some(s => code.startsWith(s));
    });

    if (hasRelevantDiagnosis) {
      relevantModules.push(module);
      isCardiovascular = true;

      const isPrimaryDiagnosis = diagnoses.primary &&
        codes.primary.some(p => diagnoses.primary!.code.startsWith(p));
      if (isPrimaryDiagnosis) {
        maxRiskLevel = 'high';
      } else if (maxRiskLevel !== 'high') {
        maxRiskLevel = 'medium';
      }
    }
  }

  if (!isCardiovascular) {
    const hasCardiovascularKeywords = allDiagnoses.some(diagnosis => {
      const display = diagnosis.display.toLowerCase();
      return display.includes('heart') || display.includes('cardiac') ||
             display.includes('cardiovascular') || display.includes('coronary') ||
             display.includes('vascular');
    });
    if (hasCardiovascularKeywords) {
      isCardiovascular = true;
      relevantModules.push('heart-failure');
      maxRiskLevel = 'medium';
    }
  }

  return { isCardiovascular, modules: relevantModules, riskLevel: maxRiskLevel };
};

const extractClinicalOutcomes = (encounter: FHIREncounter): TransformedEncounter['clinicalOutcomes'] => {
  const startDate = encounter.period?.start ? new Date(encounter.period.start) : null;
  const endDate = encounter.period?.end ? new Date(encounter.period.end) : null;

  let lengthOfStay: number | undefined;
  if (startDate && endDate) {
    lengthOfStay = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    lengthOfStay,
    discharge: { disposition: undefined, instructions: undefined }
  };
};

// ── Readmission risk (pure calculation) ────────────────────────────────────

export const calculateReadmissionRisk = (encounters: TransformedEncounter[]): {
  riskScore: number;
  riskCategory: 'low' | 'medium' | 'high';
  factors: string[];
} => {
  let riskScore = 0;
  const factors: string[] = [];

  const recentEncounters = encounters.filter(enc => {
    const daysSince = (new Date().getTime() - enc.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });

  if (recentEncounters.length > 1) {
    riskScore += 30;
    factors.push('Multiple recent hospitalizations');
  }

  const hasHeartFailure = encounters.some(enc =>
    enc.cardiovascularRelevance.modules.includes('heart-failure')
  );
  if (hasHeartFailure) {
    riskScore += 25;
    factors.push('Heart failure diagnosis');
  }

  const longStays = encounters.filter(enc => (enc.clinicalOutcomes.lengthOfStay || 0) > 7);
  if (longStays.length > 0) {
    riskScore += 20;
    factors.push('Extended length of stay');
  }

  const emergencyVisits = encounters.filter(enc => enc.class === 'emergency');
  if (emergencyVisits.length > 2) {
    riskScore += 15;
    factors.push('Frequent emergency visits');
  }

  let riskCategory: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 70) riskCategory = 'high';
  else if (riskScore >= 40) riskCategory = 'medium';

  return { riskScore, riskCategory, factors };
};

// ── Map internal strings to Prisma enums ───────────────────────────────────

function mapEncounterType(classStr: TransformedEncounter['class']): EncounterType {
  switch (classStr) {
    case 'inpatient': return 'INPATIENT';
    case 'outpatient': return 'OUTPATIENT';
    case 'emergency': return 'EMERGENCY';
    case 'observation': return 'OBSERVATION';
    case 'day-surgery': return 'DAY_SURGERY';
    case 'virtual': return 'TELEHEALTH';
    default: return 'OUTPATIENT';
  }
}

function mapEncounterStatus(status: TransformedEncounter['status']): EncounterStatus {
  switch (status) {
    case 'planned': return 'PLANNED';
    case 'arrived': return 'ARRIVED';
    case 'triaged': return 'TRIAGED';
    case 'in-progress': return 'IN_PROGRESS';
    case 'onleave': return 'ON_LEAVE';
    case 'finished': return 'FINISHED';
    case 'cancelled': return 'CANCELLED';
    default: return 'FINISHED';
  }
}

// ── Main entry point: transform + persist encounter ────────────────────────
// Returns internal encounter ID for downstream FK references.

export const processEncounterData = async (
  fhirEncounter: FHIREncounter,
  patient: FHIRPatient | undefined,
  eventType: string,
  hospitalId: string,
  patientId: string,
): Promise<{ encounterId: string }> => {
  try {
    logger.info(`Processing encounter for event: ${eventType}`, {
      fhirId: fhirEncounter.id,
      hospitalId,
      patientId,
    });

    const transformed = transformFHIREncounter(fhirEncounter, patient);

    // Build encounter number — use FHIR identifier, FHIR id, or generate one
    const encounterNumber =
      fhirEncounter.identifier?.[0]?.value ||
      fhirEncounter.id ||
      `enc-${Date.now()}`;

    // Build diagnosis codes JSON
    const diagnosisCodes = [
      ...(transformed.primaryDiagnosis ? [transformed.primaryDiagnosis] : []),
      ...transformed.secondaryDiagnoses,
    ];

    const encounterData = {
      patientId,
      hospitalId,
      encounterNumber,
      encounterType: mapEncounterType(transformed.class),
      status: mapEncounterStatus(transformed.status),
      startDateTime: transformed.startDate,
      endDateTime: transformed.endDate || null,
      location: transformed.location || null,
      primaryDiagnosis: transformed.primaryDiagnosis?.display || null,
      diagnosisCodes: diagnosisCodes.length > 0 ? diagnosisCodes : undefined,
      fhirEncounterId: fhirEncounter.id || null,
    };

    // Upsert by fhirEncounterId when available, otherwise create
    let encounter;
    if (fhirEncounter.id) {
      encounter = await prisma.encounter.upsert({
        where: { fhirEncounterId: fhirEncounter.id },
        create: encounterData,
        update: {
          status: encounterData.status,
          endDateTime: encounterData.endDateTime,
          location: encounterData.location,
          primaryDiagnosis: encounterData.primaryDiagnosis,
          diagnosisCodes: encounterData.diagnosisCodes,
        },
      });
    } else {
      encounter = await prisma.encounter.create({ data: encounterData });
    }

    logger.info('Encounter persisted', {
      internalId: encounter.id,
      encounterNumber,
      status: transformed.status,
      isCardiovascular: transformed.cardiovascularRelevance.isCardiovascular,
      modules: transformed.cardiovascularRelevance.modules,
      hospitalId,
      patientId,
      eventType,
    });

    return { encounterId: encounter.id };
  } catch (error: any) {
    logger.error('Error processing encounter data:', {
      error: error.message,
      stack: error.stack,
      fhirId: fhirEncounter.id,
      hospitalId,
      patientId,
      eventType,
    });
    throw error;
  }
};

// ── Batch entry point for bulk ingestion ──────────────────────────────────
// Persists a whole patient bundle's encounters in one createMany call.
// Returns an fhirId -> internalId map so downstream observation batching
// can link observations to the correct encounter row. skipDuplicates
// handles the fhirEncounterId unique constraint case on resume.

export interface BatchEncounterResult {
  fhirIdToInternalId: Map<string, string>;
  inserted: number;
  skipped: number;
}

export const processEncountersBatch = async (
  encounters: FHIREncounter[],
  patient: FHIRPatient | undefined,
  hospitalId: string,
  patientId: string,
): Promise<BatchEncounterResult> => {
  if (encounters.length === 0) {
    return { fhirIdToInternalId: new Map(), inserted: 0, skipped: 0 };
  }

  const encounterData: Prisma.EncounterCreateManyInput[] = [];
  const fhirIds: string[] = [];
  let skipped = 0;

  for (const enc of encounters) {
    try {
      const transformed = transformFHIREncounter(enc, patient);
      const encounterNumber =
        enc.identifier?.[0]?.value ||
        enc.id ||
        `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const diagnosisCodes = [
        ...(transformed.primaryDiagnosis ? [transformed.primaryDiagnosis] : []),
        ...transformed.secondaryDiagnoses,
      ];

      encounterData.push({
        patientId,
        hospitalId,
        encounterNumber,
        encounterType: mapEncounterType(transformed.class),
        status: mapEncounterStatus(transformed.status),
        startDateTime: transformed.startDate,
        endDateTime: transformed.endDate || null,
        location: transformed.location || null,
        primaryDiagnosis: transformed.primaryDiagnosis?.display || null,
        diagnosisCodes: diagnosisCodes.length > 0 ? (diagnosisCodes as Prisma.InputJsonValue) : Prisma.JsonNull,
        fhirEncounterId: enc.id || null,
      });
      if (enc.id) fhirIds.push(enc.id);
    } catch (err: any) {
      skipped++;
    }
  }

  let inserted = 0;
  if (encounterData.length > 0) {
    const res = await prisma.encounter.createMany({
      data: encounterData,
      skipDuplicates: true,
    });
    inserted = res.count;
  }

  const fhirIdToInternalId = new Map<string, string>();
  if (fhirIds.length > 0) {
    const rows = await prisma.encounter.findMany({
      where: { fhirEncounterId: { in: fhirIds }, hospitalId },
      select: { id: true, fhirEncounterId: true },
    });
    for (const r of rows) {
      if (r.fhirEncounterId) fhirIdToInternalId.set(r.fhirEncounterId, r.id);
    }
  }

  return { fhirIdToInternalId, inserted, skipped };
};
