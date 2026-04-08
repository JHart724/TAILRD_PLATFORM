/**
 * Gap Rule Test Helpers
 * Builds minimal patient objects for testing gap detection logic.
 */

export function buildTestPatient(overrides: Partial<{
  race: string;
  gender: string;
  age: number;
  conditions: Array<{ icd10: string }>;
  medications: Array<{ rxnorm: string; status?: string }>;
  labValues: Record<string, number>;
}> = {}): {
  id: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: Date;
  gender: string;
  race: string;
  isActive: boolean;
  conditions: Array<{ id: string; patientId: string; icd10Code: string; status: string }>;
  medications: Array<{ id: string; patientId: string; rxnormCode: string; status: string }>;
  observations: Array<{ id: string; patientId: string; labKey: string; valueNumeric: number; recordedAt: Date }>;
} {
  const pid = 'test-patient-' + Math.random().toString(36).slice(2);
  const age = overrides.age ?? 65;
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);

  return {
    id: pid,
    hospitalId: 'test-hospital',
    firstName: 'Test',
    lastName: 'Patient',
    mrn: 'TEST001',
    dateOfBirth: dob,
    gender: overrides.gender || 'MALE',
    race: overrides.race || 'WHITE',
    isActive: true,
    conditions: (overrides.conditions || []).map((c, i) => ({
      id: `cond-${i}`,
      patientId: pid,
      icd10Code: c.icd10,
      status: 'ACTIVE',
    })),
    medications: (overrides.medications || []).map((m, i) => ({
      id: `med-${i}`,
      patientId: pid,
      rxnormCode: m.rxnorm,
      status: m.status || 'ACTIVE',
    })),
    observations: Object.entries(overrides.labValues || {}).map(([key, value], i) => ({
      id: `obs-${i}`,
      patientId: pid,
      labKey: key,
      valueNumeric: value,
      recordedAt: new Date(),
    })),
  };
}
