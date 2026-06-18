// AUDIT-118: expandToIngredients unit behavior + the coverage guard.
import fs from 'fs';
import path from 'path';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';
import {
  RXNORM_INGREDIENT_MAP,
  RXNORM_INGREDIENT_UNIVERSE,
} from '../../src/terminology/rxnormIngredientMap';

describe('AUDIT-118 expandToIngredients - behavior', () => {
  it('rolls a product-coded (SCD) med up to its ingredient IN while keeping the raw code', () => {
    // dabigatran 150 MG capsule SCD 1037045 -> ingredient IN 1037042 (RxNav-verified)
    const out = expandToIngredients(['1037045']);
    expect(out).toContain('1037045'); // raw preserved (literal-includes sites)
    expect(out).toContain('1037042'); // ingredient added (IN-set sites)
  });

  it('rolls ANY dabigatran dose SCD to the same ingredient IN (the AUDIT-117 renal-dose case)', () => {
    // every dabigatran descendant maps to 1037042; pick the 75 MG capsule if present
    const dabigatranDescendants = Object.keys(RXNORM_INGREDIENT_MAP).filter((k) =>
      (RXNORM_INGREDIENT_MAP[k] as readonly string[]).includes('1037042'),
    );
    expect(dabigatranDescendants.length).toBeGreaterThan(1);
    for (const scd of dabigatranDescendants) {
      expect(expandToIngredients([scd])).toContain('1037042');
    }
  });

  it('maps a combination product to ALL of its ingredient INs', () => {
    const comboKey = Object.keys(RXNORM_INGREDIENT_MAP).find(
      (k) => (RXNORM_INGREDIENT_MAP[k] as readonly string[]).length > 1,
    );
    expect(comboKey).toBeDefined();
    const ings = RXNORM_INGREDIENT_MAP[comboKey as string] as readonly string[];
    const out = expandToIngredients([comboKey as string]);
    for (const ing of ings) expect(out).toContain(ing);
  });

  it('passes an already-IN or unmapped code through unchanged (never dropped)', () => {
    expect(expandToIngredients(['6918'])).toContain('6918'); // metoprolol IN identity
    expect(expandToIngredients(['NOT_A_CODE'])).toEqual(['NOT_A_CODE']); // unmapped passthrough
  });

  it('de-duplicates and drops empty codes', () => {
    const out = expandToIngredients(['1037045', '1037045', '', '6918']);
    expect(out.filter((c) => c === '1037042').length).toBe(1);
    expect(out).not.toContain('');
  });

  it('is additive - the output is a superset of the raw input (no regression by construction)', () => {
    const raw = ['1037045', '6918', '11170'];
    const out = expandToIngredients(raw);
    for (const c of raw) expect(out).toContain(c);
  });
});

describe('AUDIT-118 coverage guard - asset covers every medication code the live value sets reference', () => {
  // Codes that are NOT RxNorm med concepts (guideline-year string literals caught
  // by the extraction regex); RxNav returns no TTY for these. Documented allowlist.
  // 2013 (EACVI/ASE radiation) + 2014 (HRS sarcoid) guidelineVersion years added by the v3.0 HF batch.
  // v3.0 EP buildout 2026-06-16: CPT procedure codes (NOT RxNorm drugs) from EP_ABLATION_CPT / CIED_IMPLANT_CPT /
  //   CIED_EXTRACTION_CPT / LAAC_CPT - matched against procedureCodes (PR #396), never medCodes, so they never
  //   reach expandToIngredients; they are quoted 5-digit literals only the static scan sees.
  const CPT_CODES = ['93653', '93654', '93656', '33206', '33207', '33208', '33249', '33270', '33274', '33244', '33241', '33234', '33235', '33340'];
  // '2008' = guidelineVersion year of the 2008 AHA cocaine-chest-pain Scientific Statement (CAD-085, CAD chunk 1);
  // a non-RxCUI year literal caught by the registry-array static scan (the other registry years are coincidental
  // valid RxCUIs already in the IN-map). Allowlisted here, same as the other guideline-year false positives.
  const NON_DRUG_LITERALS = new Set(['2008', '2010', '2012', '2013', '2014', '2016', '2022', '2024', ...CPT_CODES]);

  const QUOTED_RXCUI = /'(\d{3,7})'/g;

  function extractFromValuesets(): Set<string> {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/terminology/cardiovascularValuesets.ts'),
      'utf8',
    );
    return new Set([...src.matchAll(QUOTED_RXCUI)].map((m) => m[1]));
  }

  function extractFromEngineInlineArrays(): Set<string> {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts'),
      'utf8',
    );
    const out = new Set<string>();
    const arrRe = /const\s+[A-Z][A-Z0-9_]*\s*=\s*\[([^\]]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = arrRe.exec(src))) {
      for (const c of m[1].matchAll(/'(\d{3,7})'/g)) out.add(c[1]);
    }
    return out;
  }

  it('every value-set medication code is a key in the committed IN-map (regen-without-asset fails here)', () => {
    const candidates = new Set([...extractFromValuesets(), ...extractFromEngineInlineArrays()]);
    const uncovered = [...candidates].filter(
      (c) => !(c in RXNORM_INGREDIENT_MAP) && !NON_DRUG_LITERALS.has(c),
    );
    // A non-empty list means a value set added a medication code without regenerating
    // the IN-map (backend/scripts/genRxnormIngredientMap.mjs). That is the AUDIT-118
    // staleness gate firing - regenerate the asset.
    expect(uncovered).toEqual([]);
  });

  it('the asset exposes a non-empty ingredient universe and map', () => {
    expect(Object.keys(RXNORM_INGREDIENT_MAP).length).toBeGreaterThan(0);
    expect(RXNORM_INGREDIENT_UNIVERSE.length).toBeGreaterThan(0);
  });
});
