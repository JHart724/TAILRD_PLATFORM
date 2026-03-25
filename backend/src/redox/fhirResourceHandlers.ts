/**
 * TAILRD FHIR Resource Handlers
 *
 * Complete mapping of FHIR R4 resource types to TAILRD internal data model.
 * Used by the Redox webhook processor to handle incoming EHR data.
 */

// Handler for each FHIR resource type needed by gap detection

export interface MappedPatient {
  externalId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  race?: string;
  ethnicity?: string;
  address?: { city: string; state: string; zip: string };
  primaryCareNPI?: string;
}

export interface MappedCondition {
  patientId: string;
  icd10Code: string;
  description: string;
  onsetDate: string;
  status: 'active' | 'resolved' | 'inactive';
  category: 'encounter-diagnosis' | 'problem-list';
}

export interface MappedMedication {
  patientId: string;
  rxnormCode: string;
  medicationName: string;
  dose?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'stopped' | 'cancelled';
  prescriberNPI?: string;
}

export interface MappedObservation {
  patientId: string;
  loincCode: string;
  display: string;
  value: number | string;
  unit?: string;
  effectiveDate: string;
  category: 'laboratory' | 'vital-signs' | 'imaging' | 'survey' | 'exam';
  referenceRange?: { low?: number; high?: number };
  abnormalFlag?: string;
}

export interface MappedProcedure {
  patientId: string;
  cptCode: string;
  description: string;
  performedDate: string;
  performerNPI?: string;
  status: 'completed' | 'in-progress' | 'not-done';
}

export interface MappedDevice {
  patientId: string;
  deviceType: string;
  udi?: string;
  implantDate?: string;
  manufacturer?: string;
  model?: string;
  status: 'active' | 'inactive' | 'entered-in-error';
}

export interface MappedEncounter {
  patientId: string;
  encounterId: string;
  type: 'inpatient' | 'outpatient' | 'emergency' | 'observation';
  admitDate: string;
  dischargeDate?: string;
  dischargeDisposition?: string;
  attendingNPI?: string;
  primaryDiagnosis?: string;
  drgCode?: string;
}

export interface MappedCarePlan {
  patientId: string;
  title: string;
  status: 'active' | 'completed' | 'revoked';
  category: string;
  startDate: string;
  activities: { description: string; status: string }[];
}

export interface MappedAllergyIntolerance {
  patientId: string;
  substance: string;
  rxnormCode?: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved';
}

// Resource handlers
export function handlePatient(resource: any): MappedPatient {
  const name = resource.name?.[0] || {};
  const address = resource.address?.[0] || {};

  // Extract US Core race extension
  let race: string | undefined;
  const raceExt = resource.extension?.find(
    (e: any) => e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
  );
  if (raceExt) {
    const textExt = raceExt.extension?.find((e: any) => e.url === 'text');
    race = textExt?.valueString;
  }

  let ethnicity: string | undefined;
  const ethExt = resource.extension?.find(
    (e: any) => e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
  );
  if (ethExt) {
    const textExt = ethExt.extension?.find((e: any) => e.url === 'text');
    ethnicity = textExt?.valueString;
  }

  return {
    externalId: resource.id,
    mrn: resource.identifier?.find((i: any) => i.type?.coding?.[0]?.code === 'MR')?.value || resource.id,
    firstName: name.given?.[0] || '',
    lastName: name.family || '',
    birthDate: resource.birthDate || '',
    gender: resource.gender || 'unknown',
    race,
    ethnicity,
    address: address.city ? {
      city: address.city,
      state: address.state || '',
      zip: address.postalCode || '',
    } : undefined,
    primaryCareNPI: resource.generalPractitioner?.[0]?.identifier?.value,
  };
}

export function handleCondition(resource: any, patientId: string): MappedCondition {
  const coding = resource.code?.coding?.[0] || {};
  const icd10Coding = resource.code?.coding?.find(
    (c: any) => c.system === 'http://hl7.org/fhir/sid/icd-10-cm'
  ) || coding;

  return {
    patientId,
    icd10Code: icd10Coding.code || '',
    description: icd10Coding.display || resource.code?.text || '',
    onsetDate: resource.onsetDateTime || resource.recordedDate || '',
    status: mapConditionStatus(resource.clinicalStatus?.coding?.[0]?.code),
    category: resource.category?.[0]?.coding?.[0]?.code === 'encounter-diagnosis'
      ? 'encounter-diagnosis' : 'problem-list',
  };
}

export function handleMedicationRequest(resource: any, patientId: string): MappedMedication {
  const medCoding = resource.medicationCodeableConcept?.coding?.find(
    (c: any) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
  ) || resource.medicationCodeableConcept?.coding?.[0] || {};

  const dosage = resource.dosageInstruction?.[0] || {};

  return {
    patientId,
    rxnormCode: medCoding.code || '',
    medicationName: medCoding.display || resource.medicationCodeableConcept?.text || '',
    dose: dosage.doseAndRate?.[0]?.doseQuantity
      ? `${dosage.doseAndRate[0].doseQuantity.value} ${dosage.doseAndRate[0].doseQuantity.unit}`
      : undefined,
    frequency: dosage.timing?.code?.text || dosage.text || undefined,
    startDate: resource.authoredOn || '',
    endDate: resource.dispenseRequest?.validityPeriod?.end || undefined,
    status: mapMedStatus(resource.status),
    prescriberNPI: resource.requester?.identifier?.value,
  };
}

export function handleObservation(resource: any, patientId: string): MappedObservation {
  const loincCoding = resource.code?.coding?.find(
    (c: any) => c.system === 'http://loinc.org'
  ) || resource.code?.coding?.[0] || {};

  const category = resource.category?.[0]?.coding?.[0]?.code || 'laboratory';

  let value: number | string = '';
  let unit: string | undefined;
  if (resource.valueQuantity) {
    value = resource.valueQuantity.value;
    unit = resource.valueQuantity.unit;
  } else if (resource.valueString) {
    value = resource.valueString;
  } else if (resource.valueCodeableConcept) {
    value = resource.valueCodeableConcept.text || resource.valueCodeableConcept.coding?.[0]?.display || '';
  }

  return {
    patientId,
    loincCode: loincCoding.code || '',
    display: loincCoding.display || resource.code?.text || '',
    value,
    unit,
    effectiveDate: resource.effectiveDateTime || resource.issued || '',
    category: mapObsCategory(category),
    referenceRange: resource.referenceRange?.[0] ? {
      low: resource.referenceRange[0].low?.value,
      high: resource.referenceRange[0].high?.value,
    } : undefined,
    abnormalFlag: resource.interpretation?.[0]?.coding?.[0]?.code,
  };
}

export function handleProcedure(resource: any, patientId: string): MappedProcedure {
  const cptCoding = resource.code?.coding?.find(
    (c: any) => c.system === 'http://www.ama-assn.org/go/cpt'
  ) || resource.code?.coding?.[0] || {};

  return {
    patientId,
    cptCode: cptCoding.code || '',
    description: cptCoding.display || resource.code?.text || '',
    performedDate: resource.performedDateTime || resource.performedPeriod?.start || '',
    performerNPI: resource.performer?.[0]?.actor?.identifier?.value,
    status: mapProcStatus(resource.status),
  };
}

export function handleDevice(resource: any, patientId: string): MappedDevice {
  return {
    patientId,
    deviceType: resource.type?.coding?.[0]?.display || resource.type?.text || '',
    udi: resource.udiCarrier?.[0]?.deviceIdentifier,
    implantDate: resource.property?.find((p: any) => p.type?.text === 'implant-date')?.valueDateTime,
    manufacturer: resource.manufacturer,
    model: resource.modelNumber,
    status: resource.status === 'active' ? 'active' : 'inactive',
  };
}

export function handleEncounter(resource: any, patientId: string): MappedEncounter {
  const type = resource.class?.code || 'AMB';
  const encounterType = type === 'IMP' ? 'inpatient' : type === 'EMER' ? 'emergency'
    : type === 'OBSENC' ? 'observation' : 'outpatient';

  return {
    patientId,
    encounterId: resource.id,
    type: encounterType,
    admitDate: resource.period?.start || '',
    dischargeDate: resource.period?.end,
    dischargeDisposition: resource.hospitalization?.dischargeDisposition?.coding?.[0]?.display,
    attendingNPI: resource.participant?.find(
      (p: any) => p.type?.[0]?.coding?.[0]?.code === 'ATND'
    )?.individual?.identifier?.value,
    primaryDiagnosis: resource.diagnosis?.[0]?.condition?.reference,
    drgCode: resource.diagnosis?.find(
      (d: any) => d.use?.coding?.[0]?.code === 'billing'
    )?.condition?.reference,
  };
}

export function handleCarePlan(resource: any, patientId: string): MappedCarePlan {
  return {
    patientId,
    title: resource.title || resource.description || '',
    status: resource.status === 'active' ? 'active' : resource.status === 'completed' ? 'completed' : 'revoked',
    category: resource.category?.[0]?.coding?.[0]?.display || '',
    startDate: resource.period?.start || resource.created || '',
    activities: (resource.activity || []).map((a: any) => ({
      description: a.detail?.description || a.detail?.code?.text || '',
      status: a.detail?.status || 'unknown',
    })),
  };
}

export function handleAllergyIntolerance(resource: any, patientId: string): MappedAllergyIntolerance {
  const rxnormCoding = resource.code?.coding?.find(
    (c: any) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
  );

  return {
    patientId,
    substance: resource.code?.text || resource.code?.coding?.[0]?.display || '',
    rxnormCode: rxnormCoding?.code,
    reaction: resource.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
    severity: resource.reaction?.[0]?.severity as any,
    status: resource.clinicalStatus?.coding?.[0]?.code === 'active' ? 'active' : 'resolved',
  };
}

// Helper mapping functions
function mapConditionStatus(code: string | undefined): 'active' | 'resolved' | 'inactive' {
  if (code === 'active' || code === 'recurrence' || code === 'relapse') return 'active';
  if (code === 'resolved' || code === 'remission') return 'resolved';
  return 'inactive';
}

function mapMedStatus(status: string | undefined): 'active' | 'completed' | 'stopped' | 'cancelled' {
  if (status === 'active' || status === 'on-hold') return 'active';
  if (status === 'completed') return 'completed';
  if (status === 'stopped') return 'stopped';
  return 'cancelled';
}

function mapObsCategory(code: string): 'laboratory' | 'vital-signs' | 'imaging' | 'survey' | 'exam' {
  if (code === 'vital-signs') return 'vital-signs';
  if (code === 'imaging') return 'imaging';
  if (code === 'survey') return 'survey';
  if (code === 'exam') return 'exam';
  return 'laboratory';
}

function mapProcStatus(status: string | undefined): 'completed' | 'in-progress' | 'not-done' {
  if (status === 'completed') return 'completed';
  if (status === 'in-progress') return 'in-progress';
  return 'not-done';
}
