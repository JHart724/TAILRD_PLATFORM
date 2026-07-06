/**
 * Unit + integration tests for extractCode.ts.
 *
 * Unit tests cover:
 *   - detectCommentPattern across all 5 enums (ID_NAME, GAP_MOD_N, GAP_N, GAP_MOD_NAME, ID_N)
 *   - Compound parent comment (`Gap EP-RC + EP-017:`) handling
 *   - findIfBlockBoundaries string-literal-aware brace walking
 *
 * Integration tests run extraction against the live gapRuleEngine.ts and assert:
 *   - Per-module registry counts (HF=56, EP=48, SH=25, CAD=77, VHD=32, PV=33)
 *   - Reconciliation counts match expected
 *   - VD-PANNUS evaluator is detected (under ID_NAME pattern)
 *   - EP-017 evaluator is detected (under ID_N pattern)
 *   - Determinism: byte-identical JSON across two runs
 */

import * as fs from 'fs';
import {
  detectCommentPattern,
  extractRegistry,
  extractEvaluatorBlocksForModule,
  countGapsPush,
  buildCodeExtract,
} from '../../../scripts/auditCanonical/extractCode';
import { MODULE_CONFIGS, EVALUATOR_PATH } from '../../../scripts/auditCanonical/lib/modules';
import {
  readLines,
  stableStringify,
  findIfBlockBoundaries,
} from '../../../scripts/auditCanonical/lib/utils';
import { UnbalancedBraceError } from '../../../scripts/auditCanonical/lib/types';

describe('extractCode — detectCommentPattern', () => {
  it('matches GAP_MOD_N for `// Gap VD-1:`', () => {
    const r = detectCommentPattern('  // Gap VD-1: Anticoagulation Missing');
    expect(r).toEqual({ pattern: 'GAP_MOD_N', name: 'VD-1' });
  });

  it('matches GAP_MOD_N with suffix for `// Gap HF-37-FU:`', () => {
    const r = detectCommentPattern('  // Gap HF-37-FU: Discharge Follow-up');
    expect(r).toEqual({ pattern: 'GAP_MOD_N', name: 'HF-37-FU' });
  });

  it('matches GAP_N for `// Gap 1:`', () => {
    const r = detectCommentPattern('  // Gap 1: ATTR-CM Detection');
    expect(r).toEqual({ pattern: 'GAP_N', name: 'Gap-1' });
  });

  it('matches ID_NAME for `// CAD-ACEI:`', () => {
    const r = detectCommentPattern('  // CAD-ACEI: ACEi/ARB Post-MI');
    expect(r).toEqual({ pattern: 'ID_NAME', name: 'CAD-ACEI' });
  });

  it('matches ID_NAME for hyphenated names `// SH-VALVE-IN-VALVE:`', () => {
    const r = detectCommentPattern('  // SH-VALVE-IN-VALVE: Valve-in-Valve TAVR');
    expect(r).toEqual({ pattern: 'ID_NAME', name: 'SH-VALVE-IN-VALVE' });
  });

  it('matches GAP_MOD_NAME for `// Gap CAD-STATIN:`', () => {
    const r = detectCommentPattern('  // Gap CAD-STATIN: High-Intensity Statin');
    expect(r).toEqual({ pattern: 'GAP_MOD_NAME', name: 'CAD-STATIN' });
  });

  it('matches GAP_MOD_NAME for compound `// Gap EP-RC + EP-017:` (first segment captured)', () => {
    const r = detectCommentPattern('  // Gap EP-RC + EP-017: Rate Control in AFib (HFrEF-aware)');
    expect(r).toEqual({ pattern: 'GAP_MOD_NAME', name: 'EP-RC' });
  });

  it('matches ID_N for `// EP-017 SAFETY:`', () => {
    const r = detectCommentPattern('  // EP-017 SAFETY: HFrEF + on non-DHP CCB');
    expect(r).toEqual({ pattern: 'ID_N', name: 'EP-017' });
  });

  it('returns null for `// Guideline: ...` (not an evaluator marker)', () => {
    expect(detectCommentPattern('  // Guideline: 2020 ACC/AHA VHD')).toBeNull();
  });

  it('returns null for `// just some prose comment`', () => {
    expect(detectCommentPattern('  // just some prose comment')).toBeNull();
  });
});

describe('utils — findIfBlockBoundaries (string-literal-aware)', () => {
  it('handles simple if-block on a single line', () => {
    const lines = [
      '// header',                              // 1
      'if (x) {',                               // 2
      '  doStuff();',                           // 3
      '}',                                      // 4
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.openLine).toBe(2);
    expect(r.closeLine).toBe(4);
  });

  it('skips intervening const declarations before the if', () => {
    const lines = [
      '// header',                              // 1
      'const a = 1;',                           // 2
      'const b = 2;',                           // 3
      'if (a && b) {',                          // 4
      '  doStuff();',                           // 5
      '}',                                      // 6
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.openLine).toBe(4);
    expect(r.closeLine).toBe(6);
  });

  it('handles multi-line if condition where ` {` lands on a continuation line', () => {
    const lines = [
      '// header',                              // 1
      'if (',                                   // 2
      '  cond1 &&',                             // 3
      '  cond2',                                // 4
      ') {',                                    // 5
      '  doStuff();',                           // 6
      '}',                                      // 7
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.openLine).toBe(5);
    expect(r.closeLine).toBe(7);
  });

  it('ignores `}` inside single-quoted strings', () => {
    const lines = [
      '// header',
      'if (x) {',
      "  const s = 'has } brace';",
      '  doStuff();',
      '}',
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.closeLine).toBe(5);
  });

  it('ignores `}` inside template-literal interpolations', () => {
    const lines = [
      '// header',
      'if (x) {',
      '  const s = `value: ${labValues[\'ferritin\']}`;',
      '  doStuff();',
      '}',
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.closeLine).toBe(5);
  });

  it('handles nested template-literal interpolations', () => {
    const lines = [
      '// header',
      'if (x) {',
      '  const s = `a ${b ? `c ${d}` : e}`;',
      '  doStuff();',
      '}',
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.closeLine).toBe(5);
  });

  it('ignores `}` inside line comments', () => {
    const lines = [
      '// header',
      'if (x) {',
      '  // comment with } in it',
      '  doStuff();',
      '}',
    ];
    const r = findIfBlockBoundaries(lines, 1, 100, 'TEST');
    expect(r.closeLine).toBe(5);
  });

  it('throws UnbalancedBraceError if no `if (` found within 30 lines', () => {
    const lines = ['// header'];
    expect(() => findIfBlockBoundaries(lines, 1, 100, 'TEST')).toThrow(UnbalancedBraceError);
  });

  it('throws UnbalancedBraceError if no closing `}` found', () => {
    const lines = ['// header', 'if (x) {', '  unbalanced'];
    expect(() => findIfBlockBoundaries(lines, 1, 100, 'TEST')).toThrow(UnbalancedBraceError);
  });
});

describe('extractCode — integration against gapRuleEngine.ts', () => {
  let lines: string[];

  beforeAll(() => {
    if (!fs.existsSync(EVALUATOR_PATH)) throw new Error(`Evaluator file not found: ${EVALUATOR_PATH}`);
    lines = readLines(EVALUATOR_PATH);
  });

  it.each([
    ['HF', 'HEART_FAILURE', 90], // 56 + 34 (v3.0 HF full buildout batch, 2026-06-15, feat/hf-buildable-gap-batch)
    ['EP', 'ELECTROPHYSIOLOGY', 71], // 48 + 21 (v3.0 EP buildout) -> 71 (T0 net-new: +2 EP-010/049, 2026-06-19)
    ['SH', 'STRUCTURAL_HEART', 61], // 60 -> 61 (T1-broader PART 2: +1 gap-sh-024-tr-rv-dysfunction, 2026-06-22)
    ['CAD', 'CORONARY_INTERVENTION', 83], // 76 -> 83 (CAD chunk 1: +7 lipid/risk/etiology registry entries; gap-cad-ivus retained as regOrphan, 2026-06-18)
    ['VHD', 'VALVULAR_DISEASE', 51], // 49 -> 51 (T1-broader PART 2: +2 gap-vhd-060 + gap-vhd-100; VHD-103 LVESD arm is a 2nd push under the existing registry entry, 2026-06-22)
    ['PV', 'PERIPHERAL_VASCULAR', 45], // 33 -> 34 (chunk 0) -> 41 (chunk 1) -> 45 (T0 net-new: +4 PV-042/081/084/085, 2026-06-19)
  ])('module %s registry has %i entries tagged %s', (code, enumName, count) => {
    const registry = extractRegistry(lines, enumName);
    expect(registry.length).toBe(count);
  });

  it('VHD evaluator extraction includes VD-PANNUS at line 15567', () => {
    // AUDIT-110 line-pinned-assertion recurrence: the v3.0 HF buildout shifted gapRuleEngine.ts
    // (10806 -> 11015 -> 11134 ingest signature-expansion -> 12547 by the v3.0 HF FULL buildout
    // batch, 2026-06-15 -> 13601 by the v3.0 EP module buildout, 2026-06-16: 21 new EP evaluators +
    // value-set imports + legacy fixes). Literal bumped here; content-anchor remediation = AUDIT-110 scope.
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'VHD')!;
    const blocks = extractEvaluatorBlocksForModule(lines, cfg.enumName, cfg.codePrefix);
    const pannus = blocks.find((b) => b.name === 'VD-PANNUS');
    expect(pannus).toBeDefined();
    expect(pannus!.commentLine).toBe(15745); // 15740 -> 15745 by AUDIT-195 (2026-07-03): lipid-intensification consolidation net +5 lines above this content-anchor. (Prior 15697 -> 15740 was AUDIT-194-B1; 15822 -> 15697 AUDIT-194 Part A; 16227 -> 15822 AUDIT-184 CAD-EXT.) Content-anchor.
    expect(pannus!.commentPattern).toBe('ID_NAME');
    expect(pannus!.bodyEndLine).toBeGreaterThan(pannus!.bodyStartLine);
  });

  it('EP evaluator extraction includes EP-017 (ID_N pattern, added PR #229)', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'EP')!;
    const blocks = extractEvaluatorBlocksForModule(lines, cfg.enumName, cfg.codePrefix);
    const ep017 = blocks.find((b) => b.name === 'EP-017');
    expect(ep017).toBeDefined();
    expect(ep017!.commentPattern).toBe('ID_N');
  });

  it('EP evaluator extraction includes the compound EP-RC parent block', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'EP')!;
    const blocks = extractEvaluatorBlocksForModule(lines, cfg.enumName, cfg.codePrefix);
    const epRc = blocks.find((b) => b.name === 'EP-RC');
    expect(epRc).toBeDefined();
    expect(epRc!.commentPattern).toBe('GAP_MOD_NAME');
    expect(epRc!.commentLiteral).toContain('+');
  });

  it.each([
    ['SH', 61, 55, 55], // T1-broader PART 2: registry 60->61, evaluator 54->55, gapsPush 54->55 (+1 gap-sh-024-tr-rv-dysfunction, 2026-06-22)
    ['CAD', 83, 65, 65], // AUDIT-184 CAD-EXT (2026-06-29): evaluator/push 82 -> 66 (16 hollow CAD over-fire rules RETIRED -> SPEC_ONLY); registry stays 83 (suppressed rules' entries retained as regOrphans, left-main precedent). AUDIT-195 (2026-07-03): evaluator/push 66 -> 65 (CAD-EZETIMIBE + CAD-PCSK9 CONSOLIDATED into one gap-cad-lipid-intensification; CAD-PCSK9 firing block retired -> SPEC_ONLY, registry entry retained as regOrphan so registry stays 83)
    ['VHD', 51, 47, 45], // AUDIT-194 Part A (2026-06-30): evaluator 50->47, gapsPush 51->45 (6 hollow VHD over-fire rules RETIRED: VD-7/VD-16/VD-ECHO-INTERVAL/VD-FUNCTIONAL-STATUS/VD-PREOP-ASSESSMENT/VD-PULMONARY-HTN); registry stays 51 (suppressed rules' registry entries retained as regOrphans, RETIRE precedent)
    ['PV', 45, 45, 45], // chunk0 33->34; chunk1 34->41; T0 net-new 41->45 (+4 PV-042/081/084/085, 2026-06-19)
  ])(
    'module %s reconciliation counts: registry=%i, evaluator=%i, gapsPush=%i (clean modules)',
    (code, reg, evCount, push) => {
      const cfg = MODULE_CONFIGS.find((m) => m.code === code)!;
      const extract = buildCodeExtract(cfg, lines);
      expect(extract.registry.length).toBe(reg);
      expect(extract.evaluatorBlocks.length).toBe(evCount);
      expect(extract.gapsPushCount).toBe(push);
    },
  );

  it('every evaluator block has bodyStartLine <= bodyEndLine and a non-empty name', () => {
    for (const cfg of MODULE_CONFIGS) {
      const blocks = extractEvaluatorBlocksForModule(lines, cfg.enumName, cfg.codePrefix);
      for (const b of blocks) {
        expect(b.name.length).toBeGreaterThan(0);
        expect(b.bodyStartLine).toBeLessThanOrEqual(b.bodyEndLine);
        expect(b.commentLine).toBeLessThanOrEqual(b.bodyStartLine);
      }
    }
  });

  it('every registry entry has a non-empty id starting with `gap-` or `gap-50-`', () => {
    for (const cfg of MODULE_CONFIGS) {
      const reg = extractRegistry(lines, cfg.enumName);
      for (const r of reg) {
        expect(r.id).toMatch(/^gap-/);
        expect(r.registryLine).toBeGreaterThan(0);
      }
    }
  });

  it('extraction is deterministic — two runs produce byte-identical JSON', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'VHD')!;
    const a = stableStringify(buildCodeExtract(cfg, lines));
    const b = stableStringify(buildCodeExtract(cfg, lines));
    expect(a).toBe(b);
  });
});
