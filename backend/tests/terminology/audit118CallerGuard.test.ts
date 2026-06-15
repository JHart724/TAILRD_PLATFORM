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

  it('raw .rxNormCode access inside the engine is confined to the orthogonal statin dose resolver', () => {
    // The IN-map handles PRESENCE; the AUDIT-101 dose resolver handles STRENGTH
    // (atorvastatin 10mg and 80mg share one IN, so dose cannot come from a code).
    // That resolver is the ONE allowed raw-code reader inside the engine.
    const engine = read('ingestion/gaps/gapRuleEngine.ts');
    const rawAccesses = (engine.match(/\.rxNormCode\b/g) || []).length;
    expect(rawAccesses).toBe(1);
  });
});
