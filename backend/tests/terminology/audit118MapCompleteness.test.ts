// AUDIT-118 map COMPLETENESS gate.
//
// The companion of the caller-guard: that one proves every runner routes medCodes through
// expandToIngredients; THIS one proves the ingredient map that expansion consults actually covers
// every medication RxCUI the rules check. Without it the map silently drifts behind rule-code
// changes - which is exactly how nitroglycerin (4917) ended up referenced by a fire-on-absence rule
// (CAD-NITRO-PRN) yet absent from the map, making it recommend nitroglycerin to angina patients who
// were already on it (a false positive at ~16k medication rows).
//
// Offline + deterministic: reads committed source + the committed map/provenance only. No network.
// Uses the SAME extraction as genRxnormIngredientMap.mjs (medCandidateExtraction.cjs), so a code the
// gate demands is exactly a code the generator would cover - they cannot disagree.

import fs from 'fs';
import path from 'path';
import { RXNORM_INGREDIENT_MAP } from '../../src/terminology/rxnormIngredientMap';

// The shared extraction is CJS (also imported by the .mjs generator); require it directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractCandidateRxcuis } = require('../../scripts/medCandidateExtraction.cjs') as {
  extractCandidateRxcuis: (
    vs: string,
    eng: string,
  ) => { vsCodes: Set<string>; engCodes: Set<string>; all: Set<string> };
};

const SRC = path.join(__dirname, '../../src');
const VS = path.join(SRC, 'terminology/cardiovascularValuesets.ts');
const ENG = path.join(SRC, 'ingestion/gaps/gapRuleEngine.ts');
const PROV = path.join(SRC, 'terminology/rxnormIngredientMap.provenance.json');

describe('AUDIT-118 map completeness gate', () => {
  it('rxnormIngredientMap (or the provenance non-drug whitelist) covers every rule-referenced medication RxCUI', () => {
    const { all } = extractCandidateRxcuis(fs.readFileSync(VS, 'utf8'), fs.readFileSync(ENG, 'utf8'));

    // COVERED = a map key (a code the expansion recognizes - product OR self-mapped ingredient),
    // OR a map value (an ingredient IN that some product expands TO). Either makes a rule's code
    // reachable from product-coded patient meds.
    const covered = new Set<string>(Object.keys(RXNORM_INGREDIENT_MAP));
    for (const ins of Object.values(RXNORM_INGREDIENT_MAP)) for (const i of ins) covered.add(i);

    // WHITELIST = codes the generator resolved as NON-drug (LOINC / SNOMED / dose+year literals that
    // matched the broad numeric extraction). This is the generator's own classification recorded in
    // the provenance, so the gate stays offline and deterministic while never false-failing on the
    // terminology noise the value-set files legitimately contain.
    const prov = JSON.parse(fs.readFileSync(PROV, 'utf8')) as {
      unresolvedCandidates?: Array<{ rxcui: string }>;
    };
    const whitelist = new Set((prov.unresolvedCandidates ?? []).map((u) => u.rxcui));

    const missing = [...all]
      .filter((c) => !covered.has(c) && !whitelist.has(c))
      .sort((a, b) => Number(a) - Number(b));

    if (missing.length > 0) {
      // Fail LOUD and actionable - this is how the next silent drift surfaces in CI.
      // eslint-disable-next-line no-console
      console.error(
        `\nAUDIT-118 MAP COMPLETENESS FAILURE: ${missing.length} rule-referenced medication ` +
          `RxCUI(s) are neither covered by rxnormIngredientMap nor classified non-drug in the ` +
          `provenance:\n  ${missing.join(', ')}\n\n` +
          `A gap rule references each of these via medCodes, but the ingredient map does not resolve ` +
          `them - so product-coded patient meds for these drugs silently under-detect, and any ` +
          `fire-on-absence rule using them false-positives.\n` +
          `FIX (terminology coverage only): regenerate the map from a network-connected host:\n` +
          `  node backend/scripts/genRxnormIngredientMap.mjs\n`,
      );
    }

    expect(missing).toEqual([]);
  });
});
