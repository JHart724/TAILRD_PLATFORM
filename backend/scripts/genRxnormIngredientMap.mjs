// genRxnormIngredientMap.mjs - AUDIT-118 offline IN-map generator.
//
// Builds a static descendant-RxCUI -> ingredient-IN map for the medication
// value sets the gap engine matches on, so the gap engine can ingredient-
// normalize product-coded (SCD/SBD) patient meds at match time WITHOUT any
// network call in the gap path (CDS-exemption deterministic-logic rule).
//
// Source of truth for the ingredient universe: the medication RxCUI literals
// referenced in
//   backend/src/terminology/cardiovascularValuesets.ts  (RXNORM_* objects)
//   backend/src/ingestion/gaps/gapRuleEngine.ts          (inline *_CODES arrays)
// Authoritative external source for every relationship: RxNav (NLM) REST.
//
// Output (deterministic, sorted):
//   backend/src/terminology/rxnormIngredientMap.ts        (the asset)
//   backend/src/terminology/rxnormIngredientMap.provenance.json (audit sidecar)
//
// REGEN:  node backend/scripts/genRxnormIngredientMap.mjs
// Run by the operator from a network-connected host; NOT part of the gap path.
//
// AUDIT-118 (PATH_TO_ROBUST v3.0 Track A.0). Design:
//   docs/architecture/AUDIT_118_MATCHER_FIX_DESIGN_NOTES.md

import fs from 'fs';
import path from 'path';
import process from 'process';

const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const RETRIEVED = process.env.AUDIT118_RETRIEVED_DATE || new Date().toISOString().slice(0, 10);
const DESCENDANT_TTYS = ['SCD', 'SBD', 'SCDC', 'SCDG', 'SBDG', 'BPCK', 'GPCK'];

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const VS = path.join(ROOT, 'src/terminology/cardiovascularValuesets.ts');
const ENG = path.join(ROOT, 'src/ingestion/gaps/gapRuleEngine.ts');
const OUT_TS = path.join(ROOT, 'src/terminology/rxnormIngredientMap.ts');
const OUT_PROV = path.join(ROOT, 'src/terminology/rxnormIngredientMap.provenance.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rxnav(urlPath) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${RXNAV}${urlPath}`, { headers: { Accept: 'application/json' } });
      if (res.status === 200) return await res.json();
      if (res.status === 404) return null; // RxNav returns 404 for unknown rxcui
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (attempt === 3) throw new Error(`RxNav unreachable for ${urlPath}: ${e.message}`);
      await sleep(800 * (attempt + 1));
    }
  }
}

// --- extract candidate RxCUIs from the two med-set sources ----------------
function extractCandidates() {
  const vs = fs.readFileSync(VS, 'utf8');
  const eng = fs.readFileSync(ENG, 'utf8');
  const vsCodes = new Set([...vs.matchAll(/'(\d{3,7})'/g)].map((m) => m[1]));
  const engCodes = new Set();
  const arrRe = /const\s+[A-Z][A-Z0-9_]*\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = arrRe.exec(eng))) {
    for (const c of m[1].matchAll(/'(\d{3,7})'/g)) engCodes.add(c[1]);
  }
  return { vsCodes, engCodes, all: new Set([...vsCodes, ...engCodes]) };
}

async function getTTY(rxcui) {
  const j = await rxnav(`/rxcui/${rxcui}/property.json?propName=TTY`);
  const props = j?.propConceptGroup?.propConcept;
  return props && props.length ? props[0].propValue : null;
}

async function getIngredientIN(rxcui) {
  // ingredient(s) of a product code
  const j = await rxnav(`/rxcui/${rxcui}/related.json?tty=IN`);
  const grp = j?.relatedGroup?.conceptGroup?.find((g) => g.tty === 'IN');
  const props = grp?.conceptProperties || [];
  return props.map((p) => ({ rxcui: p.rxcui, name: p.name }));
}

async function getDescendants(inRxcui) {
  const j = await rxnav(`/rxcui/${inRxcui}/related.json?tty=${DESCENDANT_TTYS.join('+')}`);
  const groups = j?.relatedGroup?.conceptGroup || [];
  const out = [];
  for (const g of groups) {
    for (const p of g.conceptProperties || []) out.push({ rxcui: p.rxcui, tty: g.tty, name: p.name });
  }
  return out;
}

async function main() {
  console.log(`[gen] RxNav=${RXNAV} retrieved=${RETRIEVED}`);
  const { vsCodes, engCodes, all } = extractCandidates();
  console.log(`[gen] candidate RxCUIs: valuesets=${vsCodes.size} engine-inline=${engCodes.size} union=${all.size}`);

  // 1. classify every candidate; resolve the ingredient-IN universe
  const universeIN = new Map();   // IN rxcui -> name
  const candidateMeta = {};       // rxcui -> {tty, ingredients:[{rxcui,name}]}
  const unresolved = [];
  let i = 0;
  for (const rxcui of [...all].sort()) {
    i++;
    const tty = await getTTY(rxcui);
    if (!tty) { unresolved.push({ rxcui, reason: 'no TTY (not an RxNorm concept; likely a dose/age literal)' }); continue; }
    if (tty === 'IN' || tty === 'MIN' || tty === 'PIN') {
      universeIN.set(rxcui, null);
      candidateMeta[rxcui] = { tty, ingredients: [{ rxcui, name: null }] };
    } else {
      const ings = await getIngredientIN(rxcui);
      if (!ings.length) { unresolved.push({ rxcui, reason: `tty=${tty} but no IN resolved` }); continue; }
      candidateMeta[rxcui] = { tty, ingredients: ings };
      for (const ing of ings) universeIN.set(ing.rxcui, ing.name);
    }
    if (i % 20 === 0) { console.log(`[gen] classified ${i}/${all.size}`); }
    await sleep(60);
  }
  console.log(`[gen] ingredient-IN universe size: ${universeIN.size}; unresolved candidates: ${unresolved.length}`);

  // 2. walk descendants of every ingredient IN -> build descendant -> IN map
  const map = {};                 // descendant rxcui -> Set<IN rxcui> (combo products map to MULTIPLE INs)
  const add = (d, inr) => { (map[d] = map[d] || new Set()).add(inr); };
  const perIngredient = {};       // IN -> {name, descendantCount}
  let k = 0;
  for (const inRxcui of [...universeIN.keys()].sort()) {
    k++;
    const desc = await getDescendants(inRxcui);
    // include the IN itself as an identity entry (so already-IN passes through)
    let nameForIN = universeIN.get(inRxcui);
    if (!nameForIN) {
      const pj = await rxnav(`/rxcui/${inRxcui}/property.json?propName=RxNorm%20Name`);
      nameForIN = pj?.propConceptGroup?.propConcept?.[0]?.propValue || null;
    }
    perIngredient[inRxcui] = { name: nameForIN, descendantCount: desc.length };
    add(inRxcui, inRxcui); // identity: an already-IN code passes through to itself
    for (const d of desc) add(d.rxcui, inRxcui);
    if (k % 10 === 0) console.log(`[gen] descendants ${k}/${universeIN.size}`);
    await sleep(60);
  }
  // ensure every value-set product candidate maps to ALL its ingredient INs (covers combos + value-set SCDs directly)
  for (const [rxcui, meta] of Object.entries(candidateMeta)) {
    if (meta.tty === 'IN' || meta.tty === 'MIN' || meta.tty === 'PIN') { add(rxcui, rxcui); }
    else { for (const ing of meta.ingredients) add(rxcui, ing.rxcui); }
  }

  // 3. write deterministic asset (sorted keys)
  const sortedKeys = Object.keys(map).sort();
  const entries = sortedKeys.map((k2) => `  '${k2}': [${[...map[k2]].sort().map((x) => `'${x}'`).join(', ')}],`).join('\n');
  const multiIngredient = sortedKeys.filter((k2) => map[k2].size > 1).length;
  const header = `// AUTO-GENERATED by backend/scripts/genRxnormIngredientMap.mjs - DO NOT EDIT BY HAND.
// AUDIT-118 ingredient-normalize-at-match map (descendant RxCUI -> ingredient IN).
// Source: RxNav (NLM) relatedByType over the gap-engine medication value-set universe.
// Retrieved: ${RETRIEVED}. Regenerate: node backend/scripts/genRxnormIngredientMap.mjs
// Provenance + per-ingredient verification: rxnormIngredientMap.provenance.json
// Deterministic at runtime: a static in-memory lookup, no network in the gap path.
`;
  const body = `${header}
/* eslint-disable */
export const RXNORM_INGREDIENT_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
${entries}
});

/** The ingredient-IN universe this map was generated over (for the coverage guard). */
export const RXNORM_INGREDIENT_UNIVERSE: ReadonlyArray<string> = Object.freeze([
${[...universeIN.keys()].sort().map((c) => `  '${c}',`).join('\n')}
]);
`;
  fs.writeFileSync(OUT_TS, body, 'utf8');

  const provenance = {
    finding: 'AUDIT-118',
    generator: 'backend/scripts/genRxnormIngredientMap.mjs',
    source: `${RXNAV}/rxcui/{IN}/related.json?tty=${DESCENDANT_TTYS.join('+')}`,
    retrieved: RETRIEVED,
    candidateUniverse: { valuesets: vsCodes.size, engineInline: engCodes.size, union: all.size },
    ingredientINCount: universeIN.size,
    mapEntryCount: sortedKeys.length,
    multiIngredientEntries: multiIngredient,
    perIngredient,
    unresolvedCandidates: unresolved,
  };
  fs.writeFileSync(OUT_PROV, JSON.stringify(provenance, null, 2) + '\n', 'utf8');

  console.log(`[gen] WROTE ${path.basename(OUT_TS)} (${sortedKeys.length} entries) + provenance`);
  console.log(`[gen] ingredients=${universeIN.size} multiIngredient=${multiIngredient} unresolved=${unresolved.length}`);
}

main().catch((e) => { console.error('[gen] FATAL', e); process.exit(1); });
