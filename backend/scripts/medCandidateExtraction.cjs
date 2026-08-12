// medCandidateExtraction.cjs - AUDIT-118 shared medication-RxCUI extraction.
//
// SINGLE SOURCE OF TRUTH for "which medication RxCUIs the gap rules reference".
// Consumed by BOTH:
//   - backend/scripts/genRxnormIngredientMap.mjs   (builds the ingredient map over this set)
//   - backend/tests/terminology/audit118MapCompleteness.test.ts (gates that the committed
//     map covers this set)
// Keeping ONE extraction guarantees the generator covers exactly what the gate demands, so
// the map can never silently drift behind a rule-code change (the AUDIT-118 nitroglycerin
// regression: 4917 was referenced only as an inline `medCodes.includes('4917')` literal, which
// the array-only extraction below USED to miss, so it was never a candidate and the map never
// covered it - a live fire-on-absence false positive).
//
// Pure: takes the two source strings, returns code sets. No I/O, no network.

const RXCUI = /'(\d{3,7})'/g;

/**
 * Extract every medication RxCUI the gap rules reference.
 * @param {string} vsSource  contents of cardiovascularValuesets.ts
 * @param {string} engSource contents of gapRuleEngine.ts
 * @returns {{ vsCodes: Set<string>, engCodes: Set<string>, all: Set<string> }}
 *
 * NOTE the value-set extraction is deliberately broad (every quoted numeric token), so it also
 * catches non-RxNorm codes (LOINC / SNOMED / dose+year literals). The generator's RxNav classify
 * step drops those to `unresolvedCandidates` in the provenance; the gate whitelists that same set.
 * So contamination is self-accounting and never causes a false gate failure - only a genuinely
 * uncovered medication ingredient does.
 */
function extractCandidateRxcuis(vsSource, engSource) {
  const vsCodes = new Set([...vsSource.matchAll(RXCUI)].map((m) => m[1]));

  const engCodes = new Set();
  // (a) named const arrays the rules test membership against, e.g.
  //     const SGLT2I_CODES = ['1488564', ...];  const qtProlongingDrugs_025 = ['703', ...];
  //     (broadened from the original all-caps-only regex so camelCase med arrays are covered too).
  const arrRe = /const\s+[A-Za-z][A-Za-z0-9_]*\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = arrRe.exec(engSource))) {
    for (const c of m[1].matchAll(RXCUI)) engCodes.add(c[1]);
  }
  // (b) AUDIT-118 FIX - inline medCodes literals the array regex misses. This is the exact class
  //     the 2026-06-17 map silently omitted (nitroglycerin 4917). Covers:
  //       medCodes.includes('NNN')  |  !medCodes.includes('NNN')  |  medCodes.some(c => c === 'NNN')
  for (const c of engSource.matchAll(/medCodes\.includes\('(\d{3,7})'\)/g)) engCodes.add(c[1]);
  for (const c of engSource.matchAll(/medCodes\.some\(\s*c\s*=>\s*c\s*===\s*'(\d{3,7})'\s*\)/g)) {
    engCodes.add(c[1]);
  }

  return { vsCodes, engCodes, all: new Set([...vsCodes, ...engCodes]) };
}

module.exports = { extractCandidateRxcuis };
