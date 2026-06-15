// expandToIngredients.ts - AUDIT-118 canonical medication-code normalization.
//
// THE one path that builds the `medCodes` array passed to evaluateGapRules.
// A future runner MUST call this; raw medication codes silently under-detect
// product-coded (SCD/SBD) meds against the ingredient-level (TTY=IN) value sets
// (AUDIT-118, CONFIRMED HIGH P1). Inline duplication of raw medCodes
// construction across two runners is exactly how AUDIT-118 arose; this function
// is the durable single point.
//
// Strategy: EXPAND, not replace. For each patient medication code, emit BOTH
//   - the raw code (keeps the literal `medCodes.includes('<rxcui>')` sites working), and
//   - its ingredient IN(s) (enables the IN-level `SET.includes(c)` sites; combo
//     products roll up to ALL their ingredients).
// Additive: never drops a code, so no currently-passing match regresses.
// Deterministic, pure, no I/O - the map is a static in-memory asset
// (rxnormIngredientMap.ts), no network in the gap path (CDS-exemption rule).

import { RXNORM_INGREDIENT_MAP } from './rxnormIngredientMap';

/**
 * Expand raw patient medication RxCUIs to the union of [each raw code, its
 * ingredient IN(s)]. Codes with no map entry (already-IN, or unmapped) pass
 * through unchanged - never dropped.
 *
 * @param rawCodes the patient's stored medication rxNormCodes (may be SCD/SBD/IN).
 * @returns de-duplicated union of raw codes plus their ingredient INs.
 */
export function expandToIngredients(rawCodes: string[]): string[] {
  // Fail-loud if the asset failed to load / is empty: silently returning raw
  // codes would reintroduce the AUDIT-118 under-detection invisibly.
  if (
    !RXNORM_INGREDIENT_MAP ||
    typeof RXNORM_INGREDIENT_MAP !== 'object' ||
    Object.keys(RXNORM_INGREDIENT_MAP).length === 0
  ) {
    throw new Error(
      'AUDIT-118: RXNORM_INGREDIENT_MAP not loaded or empty; medication matching ' +
        'would silently under-detect product-coded meds. Regenerate via ' +
        'backend/scripts/genRxnormIngredientMap.mjs.',
    );
  }

  const out = new Set<string>();
  for (const code of rawCodes) {
    if (!code) continue;
    out.add(code); // keep the raw code (literal-includes sites)
    const ingredients = RXNORM_INGREDIENT_MAP[code];
    if (ingredients) {
      for (const ingredientIn of ingredients) out.add(ingredientIn); // add IN(s)
    }
  }
  return [...out];
}
