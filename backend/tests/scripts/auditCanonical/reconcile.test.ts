/**
 * Tests for reconcile.ts — pairing + orphan detection + naming-mismatch + count-divergence.
 */

import * as fs from 'fs';
import {
  similarity,
  pairRegistryToEvaluators,
  detectNamingMismatches,
  buildCountDivergences,
  buildReconciliation,
} from '../../../scripts/auditCanonical/reconcile';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from '../../../scripts/auditCanonical/lib/modules';
import { stableStringify } from '../../../scripts/auditCanonical/lib/utils';
import * as path from 'path';
import { SpecExtract, CodeExtract, RegistryEntry, EvaluatorBlock } from '../../../scripts/auditCanonical/lib/types';

function dummyRegistry(id: string, line: number): RegistryEntry {
  return {
    id,
    registryLine: line,
    name: null,
    guidelineSource: null,
    classOfRecommendation: null,
    levelOfEvidence: null,
    lastReviewDate: null,
    nextReviewDue: null,
  };
}

function dummyEvaluator(name: string, commentLine: number, comment: string): EvaluatorBlock {
  return {
    name,
    commentLine,
    commentLiteral: comment,
    commentPattern: 'GAP_MOD_N',
    bodyStartLine: commentLine + 1,
    bodyEndLine: commentLine + 10,
    gapsPushIds: [],
  };
}

describe('reconcile — similarity', () => {
  it('returns 0 for empty inputs', () => {
    expect(similarity([], ['a'])).toBe(0);
    expect(similarity(['a'], [])).toBe(0);
  });

  it('returns 1.0 for identical token sets', () => {
    expect(similarity(['mech', 'valve'], ['mech', 'valve'])).toBe(1);
  });

  it('handles substring containment (e.g., "endo" matches "endocarditis")', () => {
    const s = similarity(['endo'], ['endocarditis']);
    // exactJaccard=0, substringOverlap=1 (length 4 in 11-length), 0.5 weighted / max(1,1) = 0.5
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(0.5);
  });
});

describe('reconcile — pairing', () => {
  it('pairs explicit registry-to-evaluator matches by name token overlap', () => {
    const reg = [dummyRegistry('gap-vd-1-mechanical-valve-anticoag', 100)];
    const evl = [dummyEvaluator('VD-1', 4638, '// Gap VD-1: Anticoagulation Missing in Mechanical Valve')];
    const { matches, assignedReg, assignedEval } = pairRegistryToEvaluators(reg, evl, 'vd');
    expect(matches).toHaveLength(1);
    expect(matches[0].registryId).toBe('gap-vd-1-mechanical-valve-anticoag');
    expect(matches[0].evaluatorBlockName).toBe('VD-1');
    expect(assignedReg.has(0)).toBe(true);
    expect(assignedEval.has(0)).toBe(true);
  });

  it('identifies orphans on each side when sets are unbalanced', () => {
    const reg = [
      dummyRegistry('gap-ep-anticoag-interruption', 100),
      dummyRegistry('gap-ep-laac', 200),
    ];
    const evl = [dummyEvaluator('EP-LAAC', 4013, '// EP-LAAC: LAAC Device Evaluation')];
    const { matches, assignedReg, assignedEval } = pairRegistryToEvaluators(reg, evl, 'ep');
    expect(matches).toHaveLength(1);
    // gap-ep-laac (matches "LAAC") should match EP-LAAC
    expect(matches[0].registryId).toBe('gap-ep-laac');
    expect(assignedReg.has(0)).toBe(false); // gap-ep-anticoag-interruption is orphan
    expect(assignedReg.has(1)).toBe(true);
  });
});

describe('reconcile — namingMismatches', () => {
  it('flags registry IDs not following gap-{prefix}- convention', () => {
    const reg = [
      dummyRegistry('gap-vd-1-mechanical-valve-anticoag', 100),
      dummyRegistry('gap-50-dapt', 200),
    ];
    const mismatches = detectNamingMismatches(reg, 'cad');
    // Both don't start with gap-cad-
    expect(mismatches).toHaveLength(2);
    expect(mismatches.find((m) => m.registryId === 'gap-50-dapt')).toBeDefined();
  });

  it('returns empty when all registry IDs follow convention', () => {
    const reg = [dummyRegistry('gap-vd-1', 100), dummyRegistry('gap-vd-2', 200)];
    expect(detectNamingMismatches(reg, 'vd')).toHaveLength(0);
  });
});

describe('reconcile — countDivergences', () => {
  it('explains gaps.push exceeds evaluator count via compound-comment block', () => {
    const evl: EvaluatorBlock[] = [
      {
        name: 'EP-RC',
        commentLine: 4774,
        commentLiteral: '// Gap EP-RC + EP-017: Rate Control in AFib (HFrEF-aware)',
        commentPattern: 'GAP_MOD_NAME',
        bodyStartLine: 4780,
        bodyEndLine: 4900,
        gapsPushIds: ['rate-control-missing', 'safety-non-dhp-ccb'],
      },
    ];
    const notes = buildCountDivergences(1, 1, 2, evl);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('GAPS_PUSH_VS_EVALUATOR');
    expect(notes[0].explanation).toMatch(/compound-comment/);
  });

  it('flags unexplained gaps.push divergence (no compound block)', () => {
    const evl: EvaluatorBlock[] = [];
    const notes = buildCountDivergences(0, 0, 1, evl);
    expect(notes).toHaveLength(1);
    expect(notes[0].explanation).toMatch(/without compound-comment block/);
  });
});

describe('reconcile — full integration on canonical extracts', () => {
  let specs: Map<string, SpecExtract>;
  let codes: Map<string, CodeExtract>;

  beforeAll(() => {
    specs = new Map();
    codes = new Map();
    for (const cfg of MODULE_CONFIGS) {
      const sp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.spec.json`);
      const cp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.code.json`);
      if (fs.existsSync(sp)) specs.set(cfg.code, JSON.parse(fs.readFileSync(sp, 'utf8')));
      if (fs.existsSync(cp)) codes.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')));
    }
  });

  it.each([
    ['SH', 'CLEAN'],
    ['VHD', 'CLEAN'],
    ['PV', 'CLEAN'],
  ])('module %s reconciles as %s', (code, expectedStatus) => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === code)!;
    const spec = specs.get(code)!;
    const codeX = codes.get(code)!;
    const r = buildReconciliation(spec, codeX, cfg.codePrefix);
    expect(r.status).toBe(expectedStatus);
    expect(r.registryOrphans).toHaveLength(0);
    expect(r.evaluatorOrphans).toHaveLength(0);
  });

  it('EP reconciliation surfaces gap-ep-anticoag-interruption registry orphan + EP-017 evaluator orphan', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'EP')!;
    const r = buildReconciliation(specs.get('EP')!, codes.get('EP')!, cfg.codePrefix);
    expect(r.status).toBe('DIVERGENT');
    expect(r.registryOrphans.find((o) => o.registryId === 'gap-ep-anticoag-interruption')).toBeDefined();
    expect(r.evaluatorOrphans.find((o) => o.evaluatorBlockName === 'EP-017')).toBeDefined();
  });

  it('CAD reconciliation surfaces gap-50-dapt naming mismatch', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'CAD')!;
    const r = buildReconciliation(specs.get('CAD')!, codes.get('CAD')!, cfg.codePrefix);
    expect(r.namingMismatches.find((m) => m.registryId === 'gap-50-dapt')).toBeDefined();
  });

  it('reconciliation is deterministic — two runs produce byte-identical JSON', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'VHD')!;
    const a = stableStringify(buildReconciliation(specs.get('VHD')!, codes.get('VHD')!, cfg.codePrefix));
    const b = stableStringify(buildReconciliation(specs.get('VHD')!, codes.get('VHD')!, cfg.codePrefix));
    expect(a).toBe(b);
  });
});
