import { FHIRObservation, FHIRPatient, Alert, Recommendation } from '../types';
import { ObservationCategory, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createLogger } from 'winston';

const logger = createLogger({ defaultMeta: { service: 'observation-service' } });

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

// ── LOINC code mappings for cardiovascular labs ────────────────────────────

const CARDIOVASCULAR_LAB_CODES: Record<string, string[]> = {
  'BNP': ['33747-0', '30934-4'],
  'NT-proBNP': ['33762-6', '71425-3'],
  'Troponin': ['10839-9', '49563-0', '6598-7', '89579-7', '67151-1'],
  'CK-MB': ['13969-1', '32673-6'],
  'Total Cholesterol': ['2093-3'],
  'LDL': ['13457-7', '18262-6'],
  'HDL': ['2085-9'],
  'Triglycerides': ['2571-8'],
  'ApoB': ['1884-6'],
  'HbA1c': ['4548-4', '17856-6'],
  'Creatinine': ['2160-0'],
  'eGFR': ['33914-3', '62238-1'],
  'INR': ['34714-6'],
  'PT': ['5902-2'],
  'PTT': ['3173-2'],
  'D-dimer': ['48065-7'],
};

// === Echo LOINC -> engine slug map (v3.0 echo-severity threading PATH 2, 2026-06-17) ===
// The FHIR transform persists observationType = the raw LOINC, but the gap engine reads labValues by SLUG
// (e.g. 'aortic_valve_mean_gradient'). This map closes that gap for echo measurements so FHIR-ingested echo
// numerics reach the SH/VHD severity rules. Applied at the observationType persist sites only (section 17.3:
// one map + one lookup, no broader ingestion refactor).
//
// EVERY LOINC here is section-16 VERIFIED against NLM Clinical Tables (the AUDIT-069 source; that audit found a
// 17.2% LOINC error rate + that AUDIT-070's earlier echo-LOINC guesses 18148-8/77912-1 were WRONG - hence
// no-guess verification). v3.0 SH chunk 3 (2026-06-17) ADDED the TR + vena-contracta set, each re-verified
// against NLM: 18115-6 "Tricuspid valve Regurgitation degree", 18166-9 "Tricuspid valve Maximum regurgitant
// blood flow velocity during systole", 77913-2 "Mitral valve Vena contracta diameter", 77908-2 "Aortic valve
// Vena contracta diameter", 77917-3 "Tricuspid valve Vena contracta diameter".
// STILL OMITTED because NLM verification returned empty (no fabrication): LV end-systolic diameter (LVESD) -
// to be verified with alternate search terms in a follow-up before adding.
//
// DUA-TIME UNKNOWN: this is the STANDARD-NLM-LOINC default. Whether BSW Epic emits echo as these coded numeric
// Observations (vs a DiagnosticReport narrative) and which LOINCs it attaches is an integration-confirmation
// point at DUA. If Epic uses local codes, this map gets an additive supplement - no redesign.
// (Fixes the AUDIT-070 LVEF slug-mismatch for FHIR as a by-product - scope overlap noted, no collision.)
export const ECHO_LOINC_TO_SLUG: Record<string, string> = {
  '10230-1': 'lvef',                                                                  // AUDIT-069 verified
  '79964-3': 'aortic_valve_vmax', '20183-0': 'aortic_valve_vmax',                     // AV peak velocity (Vmax)
  '18066-1': 'aortic_valve_mean_gradient', '79962-7': 'aortic_valve_mean_gradient',   // AV mean gradient
  '18089-3': 'aortic_valve_area', '18090-1': 'aortic_valve_area',
  '18091-9': 'aortic_valve_area', '18093-5': 'aortic_valve_area',                     // AVA (US + continuity)
  '29448-8': 'mitral_eroa',                                                           // MR effective regurgitant orifice area (PISA)
  '18097-6': 'mitral_valve_area', '78179-9': 'mitral_valve_area',                     // MVA (PHT + planimetry)
  '18059-6': 'mitral_valve_mean_gradient',                                            // MV mean gradient
  '81395-6': 'mitral_regurg_fraction', '80056-5': 'mitral_regurg_fraction',
  '80055-7': 'mitral_regurg_fraction',                                                // MR regurgitant fraction
  '18012-5': 'ascending_aorta',                                                       // ascending thoracic aorta diameter by US
  '18115-6': 'tr_regurg_grade',                                                       // TR regurgitation degree (NLM-verified)
  '18166-9': 'tr_regurg_vmax',                                                        // TR max regurgitant velocity (NLM-verified)
  '77913-2': 'mitral_vena_contracta',                                                 // MV vena contracta diameter (NLM-verified)
  '77908-2': 'aortic_vena_contracta',                                                 // AV vena contracta diameter (NLM-verified)
  '77917-3': 'tricuspid_vena_contracta',                                              // TV vena contracta diameter (NLM-verified)
  // Fix (AUDIT-170, 2026-06-17): INR is a coag lab, not echo, but this is the persist-site LOINC->slug map - the
  // mechanical-valve INR cluster (VD-3, VHD-001) + the LVAD INR gap read labValues['inr'], but without a slug
  // mapping the FHIR transform persisted observationType = the raw LOINC '34714-6', so threaded INR never reached
  // them (AUDIT-070-class silent under-detection). Mapping 34714-6 -> 'inr' threads it to labValues['inr'].
  '34714-6': 'inr',                                                                   // INR (NLM LOINC 34714-6)
  // Threading (AUDIT-181, 2026-06-18, AUDIT-070 lineage): apolipoprotein B is a residual-risk lipid marker, not
  // echo, but this is the persist-site LOINC->slug map - CAD-009 reads labValues['apob'], so without a slug
  // mapping the FHIR transform would persist observationType = the raw LOINC '1884-6' and threaded ApoB would
  // never reach the gap. Mapping 1884-6 -> 'apob' threads it (CSV path threaded separately in patientWriter).
  '1884-6': 'apob',                                                                   // Apolipoprotein B (NLM LOINC 1884-6, mass/volume mg/dL)
};

const VITAL_SIGNS_CODES: Record<string, string[]> = {
  'Blood Pressure Systolic': ['8480-6'],
  'Blood Pressure Diastolic': ['8462-4'],
  'Heart Rate': ['8867-4'],
  'Respiratory Rate': ['9279-1'],
  'Temperature': ['8310-5'],
  'Oxygen Saturation': ['2708-6'],
  'Weight': ['29463-7'],
  'Height': ['8302-2'],
  'BMI': ['39156-5'],
};

// ── Pure transformation ────────────────────────────────────────────────────

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

    return transformed;
  } catch (error: any) {
    logger.error('Error transforming FHIR observation:', {
      error: error.message,
      observationId: fhirObservation.id
    });
    throw error;
  }
};

// ── Category determination ─────────────────────────────────────────────────

const determineObservationCategory = (observation: FHIRObservation): TransformedObservation['category'] => {
  const categoryCode = observation.category?.[0]?.coding?.[0]?.code;
  const observationCode = observation.code?.coding?.[0]?.code;

  if (categoryCode === 'vital-signs' || isVitalSign(observationCode || '')) return 'vital-signs';
  if (categoryCode === 'laboratory' || isLabValue(observationCode || '')) return 'laboratory';
  if (categoryCode === 'imaging') return 'imaging';
  if (categoryCode === 'survey' || categoryCode === 'assessment') return 'assessment';
  return 'other';
};

const isVitalSign = (code: string): boolean =>
  Object.values(VITAL_SIGNS_CODES).some(codes => codes.includes(code));

const isLabValue = (code: string): boolean =>
  Object.values(CARDIOVASCULAR_LAB_CODES).some(codes => codes.includes(code));

// ── Value extraction ───────────────────────────────────────────────────────

const extractObservationValue = (observation: FHIRObservation): { value?: number | string | boolean; unit?: string } => {
  if (observation.valueQuantity) {
    return { value: observation.valueQuantity.value, unit: observation.valueQuantity.unit || observation.valueQuantity.code };
  }
  if (observation.valueString) return { value: observation.valueString };
  if (observation.valueBoolean !== undefined) return { value: observation.valueBoolean };
  if (observation.valueInteger !== undefined) return { value: observation.valueInteger };
  if (observation.valueCodeableConcept) {
    return { value: observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding?.[0]?.display };
  }
  return {};
};

const extractReferenceRange = (observation: FHIRObservation): TransformedObservation['referenceRange'] => {
  const range = observation.referenceRange?.[0];
  if (!range) return undefined;
  return { low: range.low?.value, high: range.high?.value, text: range.text };
};

// ── Abnormality & significance ─────────────────────────────────────────────

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
  const criticalLabCodes = ['33747-0', '30934-4', '33762-6', '71425-3', '10839-9', '49563-0'];
  if (criticalLabCodes.includes(code)) return 'high';
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
    return range > 0 ? Math.abs(value - midpoint) / (range / 2) : 0;
  }
  return 0;
};

// ── Module relevance ───────────────────────────────────────────────────────

const determineModuleRelevance = (code: string, display: string): TransformedObservation['moduleRelevance'] => {
  const lower = display.toLowerCase();
  return {
    heartFailure: isRelevantToHeartFailure(code, lower),
    electrophysiology: isRelevantToEP(code, lower),
    structuralHeart: isRelevantToStructural(code, lower),
    coronaryIntervention: isRelevantToCoronary(code, lower),
    peripheralVascular: isRelevantToPeripheral(code, lower),
    valvularDisease: isRelevantToValvular(code, lower),
  };
};

const isRelevantToHeartFailure = (code: string, display: string): boolean => {
  const hfCodes = [...CARDIOVASCULAR_LAB_CODES.BNP, ...CARDIOVASCULAR_LAB_CODES['NT-proBNP']];
  return hfCodes.includes(code) || display.includes('bnp') || display.includes('brain natriuretic') || display.includes('ejection fraction');
};

const isRelevantToEP = (code: string, display: string): boolean =>
  display.includes('rhythm') || display.includes('arrhythmia') || display.includes('atrial fibrillation') || display.includes('heart rate');

const isRelevantToStructural = (code: string, display: string): boolean =>
  display.includes('septal') || display.includes('congenital') || display.includes('structural');

const isRelevantToCoronary = (code: string, display: string): boolean => {
  const codes = [...CARDIOVASCULAR_LAB_CODES.Troponin, ...CARDIOVASCULAR_LAB_CODES['CK-MB']];
  return codes.includes(code) || display.includes('troponin') || display.includes('coronary') || display.includes('myocardial');
};

const isRelevantToPeripheral = (code: string, display: string): boolean =>
  display.includes('peripheral') || display.includes('ankle brachial') || display.includes('claudication');

const isRelevantToValvular = (code: string, display: string): boolean =>
  display.includes('valve') || display.includes('stenosis') || display.includes('regurgitation');

// ── Alert & recommendation generation (pure) ──────────────────────────────

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

// ── Map internal category to Prisma enum ───────────────────────────────────

function mapCategory(cat: TransformedObservation['category']): ObservationCategory {
  switch (cat) {
    case 'vital-signs': return 'VITAL_SIGNS';
    case 'laboratory': return 'LABORATORY';
    case 'imaging': return 'IMAGING';
    case 'assessment': return 'SURVEY';
    default: return 'EXAM';
  }
}

// ── Main entry point: transform + persist observation & alerts ──────────────

export const processObservationData = async (
  fhirObservation: FHIRObservation,
  patient: FHIRPatient | undefined,
  hospitalId: string,
  patientId: string,
  encounterId?: string,
): Promise<{ observationId: string }> => {
  try {
    const transformed = transformFHIRObservation(fhirObservation, patient);
    const alerts = generateClinicalAlerts([transformed]);

    // Persist the observation
    const fhirId = fhirObservation.id || null;
    const observationData = {
      patientId,
      hospitalId,
      encounterId: encounterId || null,
      observationType: ECHO_LOINC_TO_SLUG[transformed.code] ?? transformed.code,
      observationName: transformed.display,
      category: mapCategory(transformed.category),
      valueNumeric: typeof transformed.value === 'number' ? transformed.value : null,
      valueText: typeof transformed.value === 'string' ? transformed.value : null,
      valueBoolean: typeof transformed.value === 'boolean' ? transformed.value : null,
      unit: transformed.unit || null,
      referenceRangeLow: transformed.referenceRange?.low ?? null,
      referenceRangeHigh: transformed.referenceRange?.high ?? null,
      isAbnormal: transformed.isAbnormal,
      observedDateTime: transformed.effectiveDate,
      resultDateTime: transformed.issuedDate || null,
      fhirObservationId: fhirId,
    };

    // Composite unique key: (hospitalId, fhirObservationId) per migration
    // 20260419170743_fhir_ids_per_tenant_unique
    const observation = fhirId
      ? await prisma.observation.upsert({
          where: { hospitalId_fhirObservationId: { hospitalId, fhirObservationId: fhirId } },
          create: observationData,
          update: {},
        })
      : await prisma.observation.create({ data: observationData });

    // Persist generated alerts (batched to avoid N+1)
    if (alerts.length > 0) {
      await prisma.alert.createMany({
        data: alerts.map(alert => ({
          patientId,
          hospitalId,
          alertType: 'CLINICAL' as const,
          moduleType: 'HEART_FAILURE' as const,
          severity: (alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'high' ? 'HIGH' : alert.severity === 'medium' ? 'MEDIUM' : 'LOW') as any,
          title: `Abnormal: ${transformed.display}`,
          message: alert.message,
          actionRequired: alert.actionRequired,
        })),
      });
    }

    logger.info('Observation persisted', {
      internalId: observation.id,
      code: transformed.code,
      isAbnormal: transformed.isAbnormal,
      alertsCreated: alerts.length,
      hospitalId,
      patientId,
    });

    return { observationId: observation.id };
  } catch (error: any) {
    logger.error('Error processing observation data:', {
      error: error.message,
      stack: error.stack,
      observationId: fhirObservation.id,
      hospitalId,
      patientId,
    });
    throw error;
  }
};

// ── Batch entry point for bulk ingestion ──────────────────────────────────
// Transforms and persists a whole patient bundle's observations in one
// createMany call. Uses skipDuplicates on fhirObservationId so resume
// / restart is idempotent. Alerts are batched too.

export interface BatchObservationItem {
  fhirObservation: FHIRObservation;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
}

export const processObservationsBatch = async (
  items: BatchObservationItem[],
  patient: FHIRPatient | undefined,
): Promise<{ inserted: number; alertsInserted: number; skipped: number }> => {
  if (items.length === 0) return { inserted: 0, alertsInserted: 0, skipped: 0 };

  const observationData: Prisma.ObservationCreateManyInput[] = [];
  const alertsToCreate: Prisma.AlertCreateManyInput[] = [];
  let skipped = 0;

  for (const item of items) {
    try {
      const transformed = transformFHIRObservation(item.fhirObservation, patient);
      observationData.push({
        patientId: item.patientId,
        hospitalId: item.hospitalId,
        encounterId: item.encounterId || null,
        observationType: ECHO_LOINC_TO_SLUG[transformed.code] ?? transformed.code,
        observationName: transformed.display,
        category: mapCategory(transformed.category),
        valueNumeric: typeof transformed.value === 'number' ? transformed.value : null,
        valueText: typeof transformed.value === 'string' ? transformed.value : null,
        valueBoolean: typeof transformed.value === 'boolean' ? transformed.value : null,
        unit: transformed.unit || null,
        referenceRangeLow: transformed.referenceRange?.low ?? null,
        referenceRangeHigh: transformed.referenceRange?.high ?? null,
        isAbnormal: transformed.isAbnormal,
        observedDateTime: transformed.effectiveDate,
        resultDateTime: transformed.issuedDate || null,
        fhirObservationId: item.fhirObservation.id || null,
      });

      if (transformed.isAbnormal && transformed.clinicalSignificance === 'high') {
        alertsToCreate.push({
          patientId: item.patientId,
          hospitalId: item.hospitalId,
          alertType: 'CLINICAL',
          moduleType: 'HEART_FAILURE',
          severity: 'HIGH',
          title: `Abnormal: ${transformed.display}`,
          message: `Critical abnormal result: ${transformed.display} = ${transformed.value} ${transformed.unit || ''}`,
          actionRequired: true,
        });
      }
    } catch (err: any) {
      skipped++;
    }
  }

  let inserted = 0;
  if (observationData.length > 0) {
    const res = await prisma.observation.createMany({
      data: observationData,
      skipDuplicates: true,
    });
    inserted = res.count;
  }

  let alertsInserted = 0;
  if (alertsToCreate.length > 0) {
    const res = await prisma.alert.createMany({ data: alertsToCreate });
    alertsInserted = res.count;
  }

  return { inserted, alertsInserted, skipped };
};
