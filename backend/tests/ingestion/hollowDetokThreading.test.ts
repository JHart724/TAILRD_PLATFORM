/**
 * AUDIT-184 hollow-DET_OK repair - threading verification (2026-06-19, feat/t1-slug-thread-and-hollow-repair).
 *
 * The hollow-DET_OK sweep found 22 currently-DET_OK rules reading lab/vital slugs threaded in NEITHER path
 * (patientWriter labFields + observationService ECHO_LOINC_TO_SLUG) - so the rules were hollow (silent never-fire
 * or always-over-fire). This test proves the slugs are now wired on BOTH paths (the INR/ApoB both-paths lesson):
 *   - CSV path:  patientWriter labFields + csvSchema column  -> observation observationType = slug -> labValues[slug]
 *   - FHIR path: observationService ECHO_LOINC_TO_SLUG maps the (NLM-verified) LOINC -> slug at the persist site.
 * cac_score/stress_test_months/ccta/graft_duplex_months are CSV-only (derived/temporal; no verifiable LOINC).
 */
import { ECHO_LOINC_TO_SLUG } from '../../src/services/observationService';
import { getModuleColumns } from '../../src/ingestion/csvSchema';
import * as fs from 'fs';
import * as path from 'path';

// The CSV lab-field allowlist lives in patientWriter; read it statically (it is the threading gate).
// AUDIT-192 (2026-06-29): the batched-write rewrite hoisted this from an inline `const labFields = [...]`
// to a module-level `const LAB_FIELDS: readonly string[] = [...]`; the slug list is unchanged.
const patientWriterSrc = fs.readFileSync(
  path.join(__dirname, '../../src/ingestion/patientWriter.ts'),
  'utf8',
);
const labFieldsBlock = patientWriterSrc.match(/const LAB_FIELDS[^[]*\[([\s\S]*?)\];/)![1];
const labFields = new Set([...labFieldsBlock.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));

// All csv schema column names across every module view.
const allCsvColumns = new Set<string>();
for (const mod of ['hf', 'ep', 'cad', 'sh', 'pv', 'vd']) {
  for (const c of getModuleColumns(mod)) allCsvColumns.add(c.name);
}

// LOINC -> slug expectations (NLM-verified by exact-code lookup, 2026-06-19).
const FHIR_LOINCS: Array<[string, string]> = [
  ['8867-4', 'heart_rate'], ['8480-6', 'systolic_bp'], ['8462-4', 'diastolic_bp'],
  ['718-7', 'hemoglobin'], ['4548-4', 'hba1c'], ['3016-3', 'tsh'], ['2160-0', 'creatinine'],
  ['1988-5', 'crp'], ['30522-7', 'hs_crp'], ['1742-6', 'alt'], ['1920-8', 'ast'], ['10835-7', 'lpa'],
];
const CSV_LABS = ['heart_rate', 'systolic_bp', 'diastolic_bp', 'hemoglobin', 'hba1c', 'tsh', 'creatinine', 'crp', 'hs_crp', 'alt', 'ast', 'lpa'];
const CSV_ONLY = ['cac_score', 'stress_test_months', 'ccta', 'graft_duplex_months'];

describe('AUDIT-184 threading - FHIR path (observationService ECHO_LOINC_TO_SLUG)', () => {
  it.each(FHIR_LOINCS)('LOINC %s maps to slug %s', (loinc, slug) => {
    expect(ECHO_LOINC_TO_SLUG[loinc]).toBe(slug);
  });
});

describe('AUDIT-184 threading - CSV path (patientWriter labFields + csvSchema column)', () => {
  it.each([...CSV_LABS, ...CSV_ONLY])('slug %s is in the patientWriter labFields allowlist', (slug) => {
    expect(labFields.has(slug)).toBe(true);
  });
  it.each([...CSV_LABS, ...CSV_ONLY])('slug %s has a csvSchema column', (slug) => {
    expect(allCsvColumns.has(slug)).toBe(true);
  });
});

describe('AUDIT-184 threading - the slug-name canonicalization (CAD-008)', () => {
  it('the engine reads the threaded slug lpa, not the unthreaded lipoprotein_a', () => {
    const engine = fs.readFileSync(path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'), 'utf8');
    expect(engine).not.toContain("labValues['lipoprotein_a']");
    expect(labFields.has('lpa')).toBe(true);
  });
});
