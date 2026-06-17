// AUDIT-118 caller guard: the medCodes passed to evaluateGapRules MUST be
// ingredient-expanded via expandToIngredients(). Inline raw-medCodes
// construction across two runners was the AUDIT-118 root cause; this guard
// asserts the one-path invariant so a future third runner cannot reintroduce
// silent under-detection.
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '../../src');

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('AUDIT-118 caller guard - expandToIngredients is the one medCodes path', () => {
  const RUNNERS = [
    'ingestion/runGapDetectionForPatient.ts',
    'ingestion/gapDetectionRunner.ts',
  ];

  it('both gap runners route medCodes through expandToIngredients', () => {
    for (const rel of RUNNERS) {
      const src = read(rel);
      expect(src).toMatch(/expandToIngredients\s*\(/);
    }
  });

  it('every evaluateGapRules caller in src/ is one of the two known runners (no bypassing path)', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.ts')) {
          const txt = fs.readFileSync(full, 'utf8');
          // a CALL site (not the definition)
          if (/\bevaluateGapRules\s*\(/.test(txt) && !/function\s+evaluateGapRules/.test(txt)) {
            hits.push(path.relative(SRC, full).replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(SRC);
    expect(hits.sort()).toEqual([...RUNNERS].sort());
  });

  it('raw .rxNormCode access inside the engine is confined to dose/temporal resolvers (not presence)', () => {
    // The IN-map handles PRESENCE; raw .rxNormCode is allowed ONLY for the AUDIT-101 STRENGTH class
    // (a dose cannot come from an ingredient code - atorvastatin 10mg/80mg share one IN) and the
    // PR #396 TEMPORAL class (med start-date). Count: 1 (statin resolver) + 8 added by the v3.0 HF full
    // buildout batch 2026-06-15: HF-003 BB dose-target (x2), HF-015 digoxin dose (x2), HF-006 ARNI dose
    // (x1), Pattern-C GDMT >=3mo duration helper (x2), HF-006 legacy dose-gate (x1). All dose/temporal,
    // never presence (presence still routes via medCodes/expandToIngredients).
    // +3 by the v3.0 EP buildout 2026-06-16: EP-003/004/005 dose-bearing gaps (rivaroxaban / apixaban dose
    // resolvers via meds.find(...).doseValue). All dose, never presence (presence still routes via medCodes).
    const engine = read('ingestion/gaps/gapRuleEngine.ts');
    const rawAccesses = (engine.match(/\.rxNormCode\b/g) || []).length;
    expect(rawAccesses).toBe(12);
  });
});
