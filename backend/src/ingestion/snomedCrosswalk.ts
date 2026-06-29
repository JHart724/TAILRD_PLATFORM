/**
 * SNOMED CT -> ICD-10-CM crosswalk: ISOLATED, TOGGLEABLE layer (Synthea-proof only).
 *
 * WHY: Synthea codes conditions as SNOMED CT, but the TAILRD gap engine gates on ICD-10-CM, so
 * SNOMED-coded conditions fire 0 gaps without translation (proven by the 6,132-patient Synthea bucket
 * producing 0 gaps). This layer translates ONLY when the ingest-time codeSystem is 'SNOMED'. The
 * production Epic (Clarity/Caboodle) feed sends ICD-10-CM (codeSystem 'ICD10') and BYPASSES this layer
 * entirely - the crosswalk is never baked into the core parser.
 *
 * SOURCE (Section 16): CV_SNOMED_ICD10_MAP is populated ONLY with operator-provided AUTHORITATIVE values
 * from the SNOMED International browser (US Edition, ICD-10-CM complex map reference set 6011000124106).
 * No inferred or hand-mapped entries. SNOMED codes absent from the table are reported UNMAPPED, never
 * silently dropped. Full-population coverage via the licensed UMLS map file is deferred to production
 * hardening. SNOMED -> CPT is intentionally out of scope: no authoritative free SNOMED -> CPT map exists.
 */

export type CodeSystem = 'SNOMED' | 'ICD10';

/** Result of resolving one condition code to the ICD-10-CM the engine gates on. */
export interface CrosswalkResult {
  icd10: string[];   // one or more ICD-10-CM targets (the NLM map can be 1:many)
  mapped: boolean;   // false => SNOMED code has no authoritative table entry
  source: string;    // provenance: authoritative citation, bypass marker, or unmapped marker
}

/** One authoritative map entry: ICD-10-CM target(s) plus the per-entry citation. */
export interface CrosswalkEntry {
  icd10: string[];
  source: string;    // per-entry authoritative citation (operator-provided)
}

export type CrosswalkMap = Record<string, CrosswalkEntry>;

/**
 * AUTHORITATIVE CV-subset map - OPERATOR-POPULATED (Section 16).
 *
 * 25 cardiovascular SNOMED -> ICD-10-CM mappings, triple-verified: (1) authoritative SNOMED International
 * browser pull (US Edition 2026-03-01, ICD-10-CM complex map refset 6011000124106); (2) NLM Clinical Tables
 * billable validation; (3) engine-gate consistency check (gapRuleEngine.ts). No inferred/hand-mapped entries.
 * SNOMED codes absent here are reported UNMAPPED, never dropped. SNOMED -> CPT is out of scope (no map exists).
 *
 * THREE DOCUMENTED OVERRIDES (recorded, not silent): the NLM map defaults to the RHEUMATIC ICD-10 target for
 * generic mitral/tricuspid stenosis + tricuspid regurgitation, but the engine gates on the NONRHEUMATIC forms
 * and the Synthea/real population is degenerative-not-rheumatic. Each override records the NLM default + the
 * engine-matched target + rationale in its source field.
 */
const SRC = 'SNOMED Intl browser US Edition 2026-03-01, ICD-10-CM complex map refset 6011000124106, NLM-validated billable';
const OVR = '; nonrheumatic override to match engine gating (gapRuleEngine.ts) and degenerative population, rule-based map default noted';

export const CV_SNOMED_ICD10_MAP: CrosswalkMap = {
  '49436004':  { icd10: ['I48.91'], source: SRC }, // atrial fibrillation
  '401303003': { icd10: ['I21.3'],  source: SRC }, // ST elevation myocardial infarction (STEMI)
  '401314000': { icd10: ['I21.4'],  source: SRC }, // non-ST elevation myocardial infarction (NSTEMI)
  '22298006':  { icd10: ['I21.9'],  source: SRC }, // myocardial infarction
  '129574000': { icd10: ['I21.9'],  source: SRC + ' (postop MI -> base-MI rule-based default)' }, // postoperative MI
  '4557003':   { icd10: ['I20.0'],  source: SRC }, // preinfarction syndrome / unstable angina
  '414545008': { icd10: ['I25.9'],  source: SRC }, // ischemic heart disease
  '84114007':  { icd10: ['I50.9'],  source: SRC + ' (adult default; P29.0 neonatal branch excluded)' }, // heart failure
  '88805009':  { icd10: ['I50.9'],  source: SRC + ' (chronic CHF -> base-HF rule-based default)' }, // chronic congestive heart failure
  '59621000':  { icd10: ['I10'],    source: SRC }, // essential hypertension
  '230690007': { icd10: ['I63.9'],  source: SRC }, // cerebrovascular accident / cerebral infarction
  '706870000': { icd10: ['I26.99'], source: SRC + ' (PE without acute cor pulmonale, default)' }, // acute pulmonary embolism
  '60573004':  { icd10: ['I35.0'],  source: SRC }, // aortic valve stenosis (nonrheumatic)
  '60234000':  { icd10: ['I35.1'],  source: SRC }, // aortic valve regurgitation (nonrheumatic)
  '79619009':  { icd10: ['I34.2'],  source: SRC + ' (NLM default I05.0 rheumatic -> override I34.2: fires main MS gate AND EP-008 which I05.0 misses)' + OVR }, // mitral valve stenosis [OVERRIDE]
  '48724000':  { icd10: ['I34.0'],  source: SRC }, // mitral valve regurgitation (nonrheumatic)
  '56786000':  { icd10: ['I37.0'],  source: SRC }, // pulmonic valve stenosis (nonrheumatic)
  '91434003':  { icd10: ['I37.1'],  source: SRC }, // pulmonic valve regurgitation (nonrheumatic)
  '86175003':  { icd10: ['S26.90XA'], source: SRC + ' (S26.90 is a non-billable header; S26.90XA = initial-encounter billable form)' }, // injury of heart
  '65710008':  { icd10: ['J96.00'], source: SRC }, // acute respiratory failure
  '129721000119106': { icd10: ['N17.9', 'Z99.2'], source: SRC + ' (multi-code: acute kidney failure N17.9 + dialysis-dependence status Z99.2)' }, // acute renal failure on dialysis
  '275408006': { icd10: ['N99.0'],  source: SRC }, // postoperative renal failure
  '213150003': { icd10: ['T86.12'], source: SRC }, // kidney transplant failure and rejection
  '49915006':  { icd10: ['I36.0'],  source: SRC + ' (NLM default I07.0 rheumatic -> override I36.0 nonrheumatic; note: no TS-specific engine gate exists either way)' + OVR }, // tricuspid valve stenosis [OVERRIDE]
  '111287006': { icd10: ['I36.1'],  source: SRC + ' (NLM default I07.1 rheumatic -> override I36.1: SH-022/SH-024 TR gates require I36.1; I07.1 misses them)' + OVR }, // tricuspid valve regurgitation [OVERRIDE]
};

const ICD10_BYPASS_SOURCE = 'input ICD-10-CM (bypass; no crosswalk applied)';
const UNMAPPED_SOURCE = 'unmapped (no authoritative SNOMED->ICD-10-CM entry)';

/** Pure core: translate one SNOMED condition code against a provided map. */
export function crosswalkWith(map: CrosswalkMap, snomed: string): CrosswalkResult {
  const entry = map[snomed];
  if (entry) return { icd10: [...entry.icd10], mapped: true, source: entry.source };
  return { icd10: [], mapped: false, source: UNMAPPED_SOURCE };
}

/** Convenience over the operator-populated production CV table. */
export function crosswalkConditionCode(snomed: string): CrosswalkResult {
  return crosswalkWith(CV_SNOMED_ICD10_MAP, snomed);
}

/**
 * Code-system gate: the crosswalk is applied ONLY for SNOMED input. ICD-10 input bypasses the layer
 * entirely (the production Epic feed). Returns the ICD-10-CM code(s) to feed the engine plus provenance.
 */
export function resolveConditionIcd10(
  code: string,
  codeSystem: CodeSystem,
  map: CrosswalkMap = CV_SNOMED_ICD10_MAP,
): CrosswalkResult {
  if (codeSystem === 'ICD10') return { icd10: [code], mapped: true, source: ICD10_BYPASS_SOURCE };
  return crosswalkWith(map, code);
}

/** Structured unmapped report for the ingest summary (no silent drop). */
export interface UnmappedReport {
  unmappedCodes: Array<{ snomed: string; count: number }>;
  totalUnmapped: number;
  totalMapped: number;
}

/** Accumulates mapped/unmapped outcomes across an ingest run for the structured report. */
export class CrosswalkReporter {
  private unmapped = new Map<string, number>();
  private mappedCount = 0;

  record(result: CrosswalkResult, snomed: string): void {
    if (result.mapped) this.mappedCount++;
    else this.unmapped.set(snomed, (this.unmapped.get(snomed) || 0) + 1);
  }

  report(): UnmappedReport {
    const unmappedCodes = [...this.unmapped.entries()]
      .map(([snomed, count]) => ({ snomed, count }))
      .sort((a, b) => b.count - a.count);
    return {
      unmappedCodes,
      totalUnmapped: unmappedCodes.reduce((acc, x) => acc + x.count, 0),
      totalMapped: this.mappedCount,
    };
  }
}
