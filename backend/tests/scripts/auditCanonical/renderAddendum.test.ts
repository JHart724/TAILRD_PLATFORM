/**
 * Tests for renderAddendum.ts and renderSynthesis.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { renderAddendum } from '../../../scripts/auditCanonical/renderAddendum';
import { renderSynthesis } from '../../../scripts/auditCanonical/renderSynthesis';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from '../../../scripts/auditCanonical/lib/modules';
import { SpecExtract, CodeExtract } from '../../../scripts/auditCanonical/lib/types';
import { Crosswalk } from '../../../scripts/auditCanonical/crosswalkSchema';
import { ReconciliationResult } from '../../../scripts/auditCanonical/reconcile';

function loadCtx(code: string) {
  const sp = path.join(CANONICAL_OUTPUT_DIR, `${code}.spec.json`);
  const cp = path.join(CANONICAL_OUTPUT_DIR, `${code}.code.json`);
  const xp = path.join(CANONICAL_OUTPUT_DIR, `${code}.crosswalk.json`);
  const rp = path.join(CANONICAL_OUTPUT_DIR, `${code}.reconciliation.json`);
  if (!fs.existsSync(xp)) return null;
  return {
    module: code as any,
    spec: JSON.parse(fs.readFileSync(sp, 'utf8')) as SpecExtract,
    code: JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract,
    crosswalk: JSON.parse(fs.readFileSync(xp, 'utf8')) as Crosswalk,
    reconciliation: JSON.parse(fs.readFileSync(rp, 'utf8')) as ReconciliationResult,
  };
}

describe('renderAddendum', () => {
  it('produces deterministic output across two renders', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return; // canonical may not exist in CI; skip
    expect(renderAddendum(ctx)).toBe(renderAddendum(ctx));
  });

  it('contains all required §-headers in §11 hierarchy order', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return;
    const md = renderAddendum(ctx);
    const expected = [
      '## 1. Summary',
      '## 2. Coverage by classification',
      '## 3. Coverage by tier',
      '## 4. Per-subcategory breakdown',
      '## 4.5 — T1 SPEC_ONLY work items',
      '## 4.6 — EXTRA rules',
      '## 5. Tier 1 priority gaps surfaced',
      '## 6. Implementation notes',
      '### 6.1 — EXTRA rules detail',
      '### 6.2 — BSW ROI pathway implications',
      '### 6.3 — Strategic posture',
      '## 7. Working hypothesis verdict',
      '## 8. Implications for v2.0',
      '## 9. Module-specific findings',
      '## 10. Cross-references',
      '## 11. Cross-module synthesis',
      '### 11.5 — Sequencing notes',
      '## 12. Lessons learned',
      '## 13. Wall-clock empirical entry',
      '## 14. Audit verdict',
      '## 15. Methodology citation appendix',
    ];
    for (const h of expected) {
      expect(md).toContain(h);
    }
    // Verify order: each header appears AFTER the prior header
    let lastIdx = -1;
    for (const h of expected) {
      const idx = md.indexOf(h);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it('coverage-by-classification table sums to total', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return;
    const md = renderAddendum(ctx);
    // The summary line includes "X DET_OK + Y PARTIAL + Z SPEC_ONLY"
    const m = md.match(/(\d+) DET_OK \+ (\d+) PARTIAL \+ (\d+) SPEC_ONLY/);
    expect(m).not.toBeNull();
    const sum = parseInt(m![1], 10) + parseInt(m![2], 10) + parseInt(m![3], 10);
    expect(sum).toBe(ctx.spec.totalGaps);
  });

  it('hand-authored sections show placeholder when crosswalk fields are empty', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return;
    // VHD crosswalk has empty hand-authored fields; renderer surfaces placeholder
    const ctxWithEmpty = { ...ctx, crosswalk: { ...ctx.crosswalk, strategicPosture: '', sequencingNotes: '', lessonsLearned: '' } };
    const md = renderAddendum(ctxWithEmpty);
    expect(md).toMatch(/Strategic posture not yet authored/);
    expect(md).toMatch(/Sequencing notes not yet authored/);
    expect(md).toMatch(/Lessons learned not yet authored/);
  });

  it('hand-authored sections show authored content when crosswalk fields are set', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return;
    const ctxAuthored = {
      ...ctx,
      crosswalk: {
        ...ctx.crosswalk,
        strategicPosture: 'TEST POSTURE TEXT',
        sequencingNotes: 'TEST SEQUENCING TEXT',
        lessonsLearned: 'TEST LESSONS TEXT',
      },
    };
    const md = renderAddendum(ctxAuthored);
    expect(md).toContain('TEST POSTURE TEXT');
    expect(md).toContain('TEST SEQUENCING TEXT');
    expect(md).toContain('TEST LESSONS TEXT');
  });

  it('cross-module slice surfaces every cross-module satisfaction case', () => {
    const ctx = loadCtx('HF');
    if (!ctx) return;
    const md = renderAddendum(ctx);
    const xModRows = ctx.crosswalk.rows.filter((r) => r.ruleBodyCite && r.ruleBodyCite.evaluatorModule !== 'HF');
    if (xModRows.length === 0) return;
    for (const r of xModRows) {
      expect(md).toContain(r.specGapId);
    }
  });

  it('Module-specific findings §9 surfaces every MANUAL OVERRIDE row', () => {
    const ctx = loadCtx('VHD');
    if (!ctx) return;
    const overrideRows = ctx.crosswalk.rows.filter((r) => r.auditNotes.includes('MANUAL OVERRIDE'));
    if (overrideRows.length === 0) return;
    const md = renderAddendum(ctx);
    for (const r of overrideRows) {
      expect(md).toContain(r.specGapId);
    }
  });
});

describe('renderSynthesis', () => {
  it('produces deterministic output across two renders', () => {
    const modules = MODULE_CONFIGS
      .map((cfg) => loadCtx(cfg.code))
      .filter((c): c is NonNullable<ReturnType<typeof loadCtx>> => c !== null)
      .map((c) => ({ module: c.module, spec: c.spec, crosswalk: c.crosswalk }));
    if (modules.length === 0) return;
    expect(renderSynthesis(modules)).toBe(renderSynthesis(modules));
  });

  it('contains Tier S queue with auto-include for spec-explicit SAFETY uncovered T1 gaps', () => {
    const modules = MODULE_CONFIGS
      .map((cfg) => loadCtx(cfg.code))
      .filter((c): c is NonNullable<ReturnType<typeof loadCtx>> => c !== null)
      .map((c) => ({ module: c.module, spec: c.spec, crosswalk: c.crosswalk }));
    if (modules.length === 0) return;
    const md = renderSynthesis(modules);

    // Compute expected Tier S spec-explicit count
    let expectedExplicit = 0;
    for (const m of modules) {
      const specByGap = new Map(m.spec.gaps.map((g) => [g.id, g]));
      for (const r of m.crosswalk.rows) {
        const sg = specByGap.get(r.specGapId);
        if (
          r.tier === 'T1' &&
          r.classification !== 'DET_OK' &&
          r.classification !== 'PRODUCTION_GRADE' &&
          sg?.safetyTagCategory != null
        ) {
          expectedExplicit++;
        }
      }
    }
    expect(md).toContain(`Spec-explicit SAFETY uncovered T1 (${expectedExplicit}`);
  });

  it('cross-module patterns aggregate correctly across modules', () => {
    const modules = MODULE_CONFIGS
      .map((cfg) => loadCtx(cfg.code))
      .filter((c): c is NonNullable<ReturnType<typeof loadCtx>> => c !== null)
      .map((c) => ({ module: c.module, spec: c.spec, crosswalk: c.crosswalk }));
    if (modules.length === 0) return;
    const md = renderSynthesis(modules);

    let expectedCount = 0;
    for (const m of modules) {
      for (const r of m.crosswalk.rows) {
        if (r.ruleBodyCite && r.ruleBodyCite.evaluatorModule !== m.module) expectedCount++;
      }
    }
    if (expectedCount > 0) {
      expect(md).toMatch(new RegExp(`${expectedCount} cross-module satisfaction case`));
    }
  });
});
