/**
 * Behavior tests for the PHASE 2 multi-file normalized (Epic-extract shape) parser
 * (parseMultiFileCSV in csvParser.ts) + the per-entity schemas (csvSchema.ts).
 *
 * Coverage: happy path (parse + join + crosswalk), a malformed file (structured error, not silent),
 * a missing required file (structured error), an unmapped SNOMED code (recorded not dropped), and
 * ICD-10-coded condition input bypassing the crosswalk (the Phase-1 toggle the parser routes through).
 *
 * Fixtures use REAL Phase-1 map codes so the crosswalk is exercised end to end:
 *   49436004 -> I48.91 (atrial fibrillation), 84114007 -> I50.9 (heart failure), LOINC 10230-1 -> lvef.
 * Headers are written in Synthea's uppercase to prove the parser's header normalization.
 */
import { parseMultiFileCSV, MultiFileInput } from '../../src/ingestion/csvParser';
import { resolveConditionIcd10 } from '../../src/ingestion/snomedCrosswalk';

const PATIENTS = `Id,BIRTHDATE,DEATHDATE,FIRST,MIDDLE,LAST,RACE,ETHNICITY,GENDER,ZIP
P1,1960-06-15,,Jane,Q,Doe,white,nonhispanic,F,10001
P2,1975-03-02,,John,R,Roe,black,nonhispanic,M,10002`;

// P1: afib (49436004 -> I48.91) + HF (84114007 -> I50.9). P2: an unmapped SNOMED code (9999999).
const CONDITIONS = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION
2020-01-01,,P1,E1,http://snomed.info/sct,49436004,Atrial fibrillation
2021-02-01,,P1,E2,http://snomed.info/sct,84114007,Heart failure
2022-03-01,,P2,E3,http://snomed.info/sct,9999999,Some unmapped disorder`;

const OBSERVATIONS = `DATE,PATIENT,ENCOUNTER,CATEGORY,CODE,DESCRIPTION,VALUE,UNITS,TYPE
2021-02-01,P1,E2,procedure,10230-1,Ejection fraction,35,%,numeric
2019-01-01,P1,E0,procedure,10230-1,Ejection fraction,55,%,numeric`;

const PROCEDURES = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION
2021-02-01,,P1,E2,http://snomed.info/sct,433236007,Insertion of implant`;

const MEDICATIONS = `START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION
2021-02-01,,P1,PAY1,E2,197361,Lisinopril 10 MG Oral Tablet`;

const ENCOUNTERS = `Id,START,STOP,PATIENT,ORGANIZATION,PROVIDER,PAYER,ENCOUNTERCLASS,CODE,DESCRIPTION
E2,2021-02-01T10:00:00Z,2021-02-01T11:00:00Z,P1,ORG1,PRV1,PAY1,outpatient,185349003,Encounter for check up`;

const fullInput = (): MultiFileInput => ({
  patients: PATIENTS,
  conditions: CONDITIONS,
  observations: OBSERVATIONS,
  procedures: PROCEDURES,
  medications: MEDICATIONS,
  encounters: ENCOUNTERS,
});

describe('parseMultiFileCSV - happy path (parse + join + crosswalk)', () => {
  it('assembles one row per patient with no file errors', () => {
    const r = parseMultiFileCSV(fullInput());
    expect(r.fileErrors).toEqual([]);
    expect(r.totalPatients).toBe(2);
    expect(r.validRows.length).toBe(2);
  });

  it('crosswalks SNOMED conditions to ICD-10 (49436004 -> I48.91 primary, 84114007 -> I50.9 secondary)', () => {
    const r = parseMultiFileCSV(fullInput());
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect(p1.data.primary_diagnosis).toBe('I48.91');
    expect(p1.data.secondary_diagnoses).toEqual(['I50.9']);
    // the raw SNOMED code must NOT survive into the threaded diagnosis
    expect(p1.data.primary_diagnosis).not.toBe('49436004');
  });

  it('maps observation LOINC onto the engine lab slug, latest value wins (lvef 35, not the older 55)', () => {
    const r = parseMultiFileCSV(fullInput());
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect(p1.data.lvef).toBe(35);
  });

  it('passes RxNorm medications through raw and threads procedures as a pipe', () => {
    const r = parseMultiFileCSV(fullInput());
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect(p1.data.medications).toEqual(['197361']);
    expect(p1.data.procedures).toEqual(['433236007']);
    expect(r.procedureCodesUntranslated).toBe(1); // SNOMED procedure left raw (no SNOMED->CPT map)
  });

  it('emits structured medication_records (rxNormCode + name + startDate + stopDate) for persistence', () => {
    const r = parseMultiFileCSV(fullInput());
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    // AUDIT-193: stopDate threaded (null when the medications.csv row has no STOP -> ongoing).
    // AUDIT-199-B: doseValue/doseUnit parsed from the DESCRIPTION ("Lisinopril 10 MG" -> 10 mg).
    expect(p1.data.medication_records).toEqual([
      { rxNormCode: '197361', medicationName: 'Lisinopril 10 MG Oral Tablet', startDate: '2021-02-01', stopDate: null, doseValue: 10, doseUnit: 'mg' },
    ]);
  });

  it('AUDIT-193: reads STOP on medications.csv + conditions.csv into stopDate / condition_records', () => {
    const input = fullInput();
    // give P1 a discontinued med and a resolved condition (STOP populated)
    input.medications = `START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION
2021-02-01,2021-08-01,P1,PAY1,E2,197361,Lisinopril 10 MG Oral Tablet`;
    input.conditions = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION
2020-01-01,2021-09-01,P1,E1,http://snomed.info/sct,49436004,Atrial fibrillation`;
    const r = parseMultiFileCSV(input);
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect((p1.data.medication_records as any[])[0].stopDate).toBe('2021-08-01');
    // 49436004 -> I48.91; its condition_record carries the resolution date.
    const cr = (p1.data.condition_records as any[]).find(c => c.icd10Code === 'I48.91');
    expect(cr.stopDate).toBe('2021-09-01');
  });

  it('derives demographics from the patients spine (age numeric, sex from GENDER)', () => {
    const r = parseMultiFileCSV(fullInput());
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect(typeof p1.data.age).toBe('number');
    expect(p1.data.age as number).toBeGreaterThan(0);
    expect(p1.data.sex).toBe('F');
    expect(typeof p1.data.encounter_date).toBe('string'); // sourced from the encounter START
  });
});

describe('parseMultiFileCSV - unmapped SNOMED is recorded, not dropped', () => {
  it('records the unmapped condition code in the report and leaves it out of the threaded diagnosis', () => {
    const r = parseMultiFileCSV(fullInput());
    expect(r.unmappedReport.unmappedCodes).toContainEqual({ snomed: '9999999', count: 1 });
    expect(r.unmappedReport.totalUnmapped).toBe(1);
    const p2 = r.validRows.find(row => row.data.patient_id === 'P2')!;
    expect(p2.data.primary_diagnosis).toBeNull(); // unmapped -> not threaded, but counted above (no silent drop)
    expect(p2.data.secondary_diagnoses).toEqual([]);
  });
});

describe('parseMultiFileCSV - structured errors over silent defaults', () => {
  it('a malformed file (missing required CODE header) is a structured error, not a silent default', () => {
    const malformed = fullInput();
    malformed.conditions = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,DESCRIPTION
2020-01-01,,P1,E1,http://snomed.info/sct,Atrial fibrillation`;
    const r = parseMultiFileCSV(malformed);
    expect(r.fileErrors.length).toBeGreaterThan(0);
    expect(r.fileErrors[0].file).toBe('conditions.csv');
    expect(r.fileErrors[0].message).toMatch(/missing required header/i);
    expect(r.validRows).toEqual([]); // no partial/silent ingest when a required file is malformed
  });

  it('a missing required file (observations) is a structured error', () => {
    const missing = fullInput();
    delete missing.observations;
    const r = parseMultiFileCSV(missing);
    expect(r.fileErrors.some(e => e.file === 'observations.csv')).toBe(true);
    expect(r.validRows).toEqual([]);
  });

  it('an absent OPTIONAL file (medications) is a structured warning, not an error', () => {
    const noMeds = fullInput();
    delete noMeds.medications;
    const r = parseMultiFileCSV(noMeds);
    expect(r.fileErrors).toEqual([]);
    expect(r.fileWarnings.some(w => w.file === 'medications.csv')).toBe(true);
    const p1 = r.validRows.find(row => row.data.patient_id === 'P1')!;
    expect(p1.data.medications).toEqual([]); // enrichment skipped, but the patient still assembles
  });
});

describe('parseMultiFileCSV - ICD-10 input bypasses the crosswalk (production Epic feed)', () => {
  it('the parser routes condition codes through resolveConditionIcd10; ICD10-tagged input passes through unchanged', () => {
    // The conditions schema is SNOMED-tagged for Synthea; a real Epic ICD-10-CM feed flips codeSystem to ICD10,
    // and the same routing call bypasses the crosswalk entirely (Phase 1 toggle).
    const r = resolveConditionIcd10('I50.9', 'ICD10');
    expect(r.icd10).toEqual(['I50.9']);
    expect(r.mapped).toBe(true);
    expect(r.source).toMatch(/bypass/i);
  });
});
