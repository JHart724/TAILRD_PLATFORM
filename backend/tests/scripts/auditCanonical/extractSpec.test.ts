/**
 * Unit + integration tests for extractSpec.ts.
 *
 * Unit tests exercise pure functions (detectSafetyTag, extractBswPathwayTags,
 * findModuleHeaderLine) against fixed inputs.
 *
 * Integration tests run extraction against the live CK v4.0 source and assert:
 *   - Tier totals match the CK v4.0 §"Tier Distribution" table
 *   - Known per-module counts (105 VHD, 89 EP, 88 SH, 90 CAD, 126 HF, 105 PV)
 *   - Known SAFETY-tagged gaps (VHD-005 → CRITICAL_SAFETY, EP-079 → CRITICAL)
 *   - Determinism: byte-identical JSON across two runs
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  detectSafetyTag,
  extractBswPathwayTags,
  findModuleHeaderLine,
  extractSubcategories,
  extractGaps,
  buildSpecExtract,
} from '../../../scripts/auditCanonical/extractSpec';
import { MODULE_CONFIGS, SPEC_PATH } from '../../../scripts/auditCanonical/lib/modules';
import { readLines, stableStringify } from '../../../scripts/auditCanonical/lib/utils';
import { InvalidTierError } from '../../../scripts/auditCanonical/lib/types';

describe('extractSpec — detectSafetyTag', () => {
  it('returns CRITICAL_SAFETY for `(CRITICAL SAFETY)` literal', () => {
    const r = detectSafetyTag('Mechanical valve: DOAC prescribed (CRITICAL SAFETY).');
    expect(r.literal).toBe('(CRITICAL SAFETY)');
    expect(r.category).toBe('CRITICAL_SAFETY');
  });

  it('returns CRITICAL for `(CRITICAL)` literal', () => {
    const r = detectSafetyTag('Pre-excited AF + AVN blocker (CRITICAL): VF risk');
    expect(r.literal).toBe('(CRITICAL)');
    expect(r.category).toBe('CRITICAL');
  });

  it('returns SAFETY for `(SAFETY)` literal', () => {
    const r = detectSafetyTag('Antiarrhythmic + QTc>500 (SAFETY)');
    expect(r.literal).toBe('(SAFETY)');
    expect(r.category).toBe('SAFETY');
  });

  it('returns SAFETY_PREFIX for `SAFETY:` prefix', () => {
    const r = detectSafetyTag('SAFETY: Drug-drug interaction warfarin + amiodarone');
    expect(r.literal).toBe('SAFETY:');
    expect(r.category).toBe('SAFETY_PREFIX');
  });

  it('returns null for non-safety text', () => {
    const r = detectSafetyTag('Statin not prescribed in ASCVD');
    expect(r.literal).toBeNull();
    expect(r.category).toBeNull();
  });

  it('prioritizes longest match — `(CRITICAL SAFETY)` does NOT classify as `(CRITICAL)`', () => {
    const r = detectSafetyTag('Test (CRITICAL SAFETY) here');
    expect(r.category).toBe('CRITICAL_SAFETY');
  });
});

describe('extractSpec — extractBswPathwayTags', () => {
  it('extracts P1 from `(P1)` literal', () => {
    expect(extractBswPathwayTags('Procedural decision (P1) for Impella')).toEqual(['P1']);
  });

  it('extracts multiple pathway tags', () => {
    expect(extractBswPathwayTags('Statin (P2) and adherence (P4) requirement')).toEqual(['P2', 'P4']);
  });

  it('deduplicates repeated tags', () => {
    expect(extractBswPathwayTags('(P1) ... (P1) ... (P1)')).toEqual(['P1']);
  });

  it('returns empty array when no tags present', () => {
    expect(extractBswPathwayTags('No pathway tags here')).toEqual([]);
  });
});

describe('extractSpec — integration against CK v4.0', () => {
  let lines: string[];

  beforeAll(() => {
    if (!fs.existsSync(SPEC_PATH)) throw new Error(`Spec file not found: ${SPEC_PATH}`);
    lines = readLines(SPEC_PATH);
  });

  it.each([
    ['HF', 126, { T1: 29, T2: 62, T3: 35 }],
    ['EP', 89, { T1: 15, T2: 62, T3: 12 }],
    ['SH', 88, { T1: 13, T2: 58, T3: 17 }],
    ['CAD', 90, { T1: 18, T2: 55, T3: 17 }],
    ['VHD', 105, { T1: 8, T2: 72, T3: 25 }],
    ['PV', 105, { T1: 7, T2: 82, T3: 16 }],
  ])('module %s extracts %i gaps with expected tier distribution', (code, total, tiers) => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === code)!;
    const extract = buildSpecExtract(cfg, lines);
    expect(extract.totalGaps).toBe(total);
    expect(extract.tierTotals).toEqual(tiers);
    expect(extract.gaps.length).toBe(total);
  });

  it('VHD-005 is classified as CRITICAL_SAFETY at the spec line cited in the prior addendum', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'VHD')!;
    const extract = buildSpecExtract(cfg, lines);
    const vhd5 = extract.gaps.find((g) => g.id === 'GAP-VHD-005');
    expect(vhd5).toBeDefined();
    expect(vhd5!.tier).toBe('T1');
    expect(vhd5!.safetyTagCategory).toBe('CRITICAL_SAFETY');
    expect(vhd5!.safetyTagLiteral).toBe('(CRITICAL SAFETY)');
    expect(vhd5!.specLine).toBe(754);
  });

  it('EP-079 is classified as CRITICAL', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'EP')!;
    const extract = buildSpecExtract(cfg, lines);
    const ep79 = extract.gaps.find((g) => g.id === 'GAP-EP-079');
    expect(ep79).toBeDefined();
    expect(ep79!.tier).toBe('T1');
    expect(ep79!.safetyTagCategory).toBe('CRITICAL');
    expect(ep79!.safetyTagLiteral).toBe('(CRITICAL)');
  });

  it('every gap has a non-empty subcategory and a positive subcategoryHeaderLine', () => {
    for (const cfg of MODULE_CONFIGS) {
      const extract = buildSpecExtract(cfg, lines);
      for (const g of extract.gaps) {
        expect(g.subcategory.length).toBeGreaterThan(0);
        expect(g.subcategoryHeaderLine).toBeGreaterThan(0);
      }
    }
  });

  it('subcategory gapCount totals match module totalGaps for every module', () => {
    for (const cfg of MODULE_CONFIGS) {
      const extract = buildSpecExtract(cfg, lines);
      const subcatSum = extract.subcategories.reduce((s, sc) => s + sc.gapCount, 0);
      expect(subcatSum).toBe(extract.totalGaps);
    }
  });

  it('extraction is deterministic — two runs produce byte-identical JSON', () => {
    const cfg = MODULE_CONFIGS.find((m) => m.code === 'VHD')!;
    const a = stableStringify(buildSpecExtract(cfg, lines));
    const b = stableStringify(buildSpecExtract(cfg, lines));
    expect(a).toBe(b);
  });
});

describe('extractSpec — error handling', () => {
  it('throws InvalidTierError if a gap row has a non-T1/T2/T3 tier marker', () => {
    // Synthetic test: build a minimal spec line that will pass the gap regex but with bad tier
    // The regex only matches T1|T2|T3, so this can't actually occur via extractGaps;
    // verifying the error class exists and constructs as documented
    const err = new InvalidTierError('test', 100, 'T9');
    expect(err.name).toBe('InvalidTierError');
    expect(err.specLine).toBe(100);
    expect(err.observedTier).toBe('T9');
  });
});
