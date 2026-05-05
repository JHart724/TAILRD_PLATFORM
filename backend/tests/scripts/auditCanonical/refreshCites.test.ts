/**
 * Tests for refreshCites.ts.
 *
 * Per AUDIT-040 design (operator-approved 2026-05-05): 7 tests covering
 * surgical line-number refresh + content byte-preservation + idempotency +
 * cross-module + structured-error fail-loud behavior.
 */

import {
  refreshCrosswalk,
  RegistryIdNotFoundInRefresh,
  EvaluatorBlockNotFoundInRefresh,
  CrossModuleSourceMissing,
} from '../../../scripts/auditCanonical/refreshCites';
import { Crosswalk } from '../../../scripts/auditCanonical/crosswalkSchema';
import { SpecExtract, CodeExtract, ModuleCode } from '../../../scripts/auditCanonical/lib/types';
import { stableStringify } from '../../../scripts/auditCanonical/lib/utils';

// =============================================================================
// Fixtures
// =============================================================================

function makeSpec(module: ModuleCode, gapId: string, specLine: number): SpecExtract {
  return {
    module,
    specSource: 'docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md',
    specSection: '§6.0',
    moduleHeaderLine: 1,
    totalGaps: 1,
    tierTotals: { T1: 1, T2: 0, T3: 0 },
    subcategories: [{ name: 'Test', headerLine: 1, gapCount: 1 }],
    gaps: [
      {
        id: gapId,
        specLine,
        tier: 'T1',
        tierMarkerLiteral: '| T1 |',
        subcategory: 'Test',
        subcategoryHeaderLine: 1,
        name: 'Test gap',
        detectionLogic: 'detect',
        structuredDataElements: 'data',
        domains: ['D2'],
        phi: 'Non-PHI',
        bswPathwayTags: [],
        safetyTagLiteral: null,
        safetyTagCategory: null,
      },
    ],
  };
}

function makeCode(
  module: ModuleCode,
  registryId: string,
  registryLine: number,
  evaluatorBlockName: string,
  bodyStartLine: number,
  bodyEndLine: number,
): CodeExtract {
  return {
    module,
    codeSource: 'backend/src/ingestion/gaps/gapRuleEngine.ts',
    registry: [
      {
        id: registryId,
        registryLine,
        name: 'Test',
        guidelineSource: null,
        classOfRecommendation: null,
        levelOfEvidence: null,
        lastReviewDate: null,
        nextReviewDue: null,
      },
    ],
    evaluatorBlocks: [
      {
        name: evaluatorBlockName,
        commentLine: bodyStartLine - 1,
        commentLiteral: `// ${evaluatorBlockName}: Test`,
        commentPattern: 'GAP_MOD_N',
        bodyStartLine,
        bodyEndLine,
        gapsPushIds: [],
      },
    ],
    gapsPushCount: 1,
    moduleTagPattern: `module: ModuleType.${module}`,
  };
}

function makeCrosswalk(rows: Crosswalk['rows']): Crosswalk {
  return {
    module: 'VHD',
    crosswalkVersion: '1.0',
    auditDate: '2026-05-05',
    auditMethod: 'rule-body-citation-AUDIT-030D',
    rows,
    extras: [],
    strategicPosture: '',
    sequencingNotes: '',
    lessonsLearned: '',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('refreshCites — refreshCrosswalk', () => {
  it('updates evaluatorBodyLineRange when source has shifted', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 753);
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753,
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 100,
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [150, 200], // STALE — should refresh to [200, 250]
          evaluatorModule: 'VHD',
        },
        auditNotes: '',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.citesUpdated).toBe(1);
    expect(r.evaluatorBodyLineRangeUpdated).toBe(1);
    expect(r.updatedCrosswalk.rows[0].ruleBodyCite!.evaluatorBodyLineRange).toEqual([200, 250]);
  });

  it('updates registryLine when source has shifted', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 753);
    const code = makeCode('VHD', 'gap-vd-1', 600, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753,
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 500, // STALE — should refresh to 600
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: '',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.citesUpdated).toBe(1);
    expect(r.registryLineUpdated).toBe(1);
    expect(r.updatedCrosswalk.rows[0].ruleBodyCite!.registryLine).toBe(600);
  });

  it('updates specLine when CK v4.0 has shifted', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 800); // shifted from 753 to 800
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753, // STALE
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 100,
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: '',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.specLineUpdated).toBe(1);
    expect(r.updatedCrosswalk.rows[0].specLine).toBe(800);
  });

  it('preserves auditNotes byte-for-byte (multi-line manual override text)', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 753);
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const auditNote =
      'MANUAL OVERRIDE: AUDIT-033 RESOLVED 2026-05-05 — registry entry added (this PR);\n' +
      'evaluator at line 4797 fires SAFETY gap with Class 3 (Harm) classification.\n' +
      '  Indented sub-bullet with special chars: 1.0–1.16 axios → ✓ ` ${interpolated} \\backslash';
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753,
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 50, // STALE — will trigger refresh, exercising preservation path
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: auditNote,
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.updatedCrosswalk.rows[0].auditNotes).toBe(auditNote);
  });

  it('preserves classification across DET_OK / PARTIAL_DETECTION / SPEC_ONLY rows', () => {
    const spec: SpecExtract = {
      ...makeSpec('VHD', 'GAP-VHD-001', 753),
      totalGaps: 3,
      tierTotals: { T1: 3, T2: 0, T3: 0 },
      gaps: [
        { ...makeSpec('VHD', 'GAP-VHD-001', 753).gaps[0], id: 'GAP-VHD-001' },
        { ...makeSpec('VHD', 'GAP-VHD-002', 754).gaps[0], id: 'GAP-VHD-002', specLine: 754 },
        { ...makeSpec('VHD', 'GAP-VHD-003', 755).gaps[0], id: 'GAP-VHD-003', specLine: 755 },
      ],
    };
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753,
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 50,
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: 'A',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
      {
        specGapId: 'GAP-VHD-002',
        specLine: 754,
        tier: 'T1',
        classification: 'PARTIAL_DETECTION',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 50,
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: 'B',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
      {
        specGapId: 'GAP-VHD-003',
        specLine: 755,
        tier: 'T1',
        classification: 'SPEC_ONLY',
        ruleBodyCite: null,
        auditNotes: 'C',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.updatedCrosswalk.rows[0].classification).toBe('DET_OK');
    expect(r.updatedCrosswalk.rows[1].classification).toBe('PARTIAL_DETECTION');
    expect(r.updatedCrosswalk.rows[2].classification).toBe('SPEC_ONLY');
    expect(r.updatedCrosswalk.rows[2].ruleBodyCite).toBeNull();
  });

  it('refreshes cross-module cites against the cited module code.json', () => {
    // Row in EP module cites VHD evaluator (cross-module pattern, e.g., GAP-EP-007 → VHD VD-6)
    const spec = makeSpec('EP', 'GAP-EP-007', 312);
    const epCode = makeCode('EP', 'gap-ep-other', 100, 'EP-OTHER', 200, 250);
    const vhdCode = makeCode('VHD', 'gap-vd-6', 999, 'VD-6', 5500, 5600);
    const xw: Crosswalk = {
      ...makeCrosswalk([]),
      module: 'EP',
      rows: [
        {
          specGapId: 'GAP-EP-007',
          specLine: 312,
          tier: 'T1',
          classification: 'DET_OK',
          ruleBodyCite: {
            registryId: 'gap-vd-6',
            registryLine: 800, // STALE — should refresh to 999 (VHD's value)
            evaluatorBlockName: 'VD-6',
            evaluatorBodyLineRange: [5400, 5500], // STALE — should refresh to [5500, 5600]
            evaluatorModule: 'VHD',
          },
          auditNotes: 'cross-module',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
    };
    const allCode = new Map<ModuleCode, CodeExtract>([
      ['EP', epCode],
      ['VHD', vhdCode],
    ]);
    const r = refreshCrosswalk({ module: 'EP', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r.citesUpdated).toBe(1);
    const cite = r.updatedCrosswalk.rows[0].ruleBodyCite!;
    expect(cite.registryLine).toBe(999);
    expect(cite.evaluatorBodyLineRange).toEqual([5500, 5600]);
    expect(cite.evaluatorModule).toBe('VHD');
  });

  it('idempotent — refresh on already-current crosswalk produces byte-identical output', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 753);
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753, // already current
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-1',
          registryLine: 100, // already current
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250], // already current
          evaluatorModule: 'VHD',
        },
        auditNotes: 'preserved',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    const r1 = refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode });
    expect(r1.citesUpdated).toBe(0);
    expect(r1.specLineUpdated).toBe(0);

    // Second pass on first pass's output
    const r2 = refreshCrosswalk({
      module: 'VHD',
      crosswalk: r1.updatedCrosswalk,
      spec,
      allCodeExtracts: allCode,
    });
    expect(r2.citesUpdated).toBe(0);

    // Byte-identical via stableStringify
    expect(stableStringify(r1.updatedCrosswalk)).toBe(stableStringify(r2.updatedCrosswalk));
    // Byte-identical with input (no change at all)
    expect(stableStringify(xw)).toBe(stableStringify(r1.updatedCrosswalk));
  });
});

describe('refreshCites — structured errors', () => {
  it('throws RegistryIdNotFoundInRefresh when registryId no longer exists in code.json', () => {
    const spec = makeSpec('VHD', 'GAP-VHD-001', 753);
    const code = makeCode('VHD', 'gap-vd-1', 100, 'VD-1', 200, 250);
    const xw = makeCrosswalk([
      {
        specGapId: 'GAP-VHD-001',
        specLine: 753,
        tier: 'T1',
        classification: 'DET_OK',
        ruleBodyCite: {
          registryId: 'gap-vd-DELETED',
          registryLine: 999,
          evaluatorBlockName: 'VD-1',
          evaluatorBodyLineRange: [200, 250],
          evaluatorModule: 'VHD',
        },
        auditNotes: '',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
      },
    ]);
    const allCode = new Map<ModuleCode, CodeExtract>([['VHD', code]]);
    expect(() =>
      refreshCrosswalk({ module: 'VHD', crosswalk: xw, spec, allCodeExtracts: allCode }),
    ).toThrow(RegistryIdNotFoundInRefresh);
  });

  it('throws CrossModuleSourceMissing when evaluatorModule code extract not loaded', () => {
    const spec = makeSpec('EP', 'GAP-EP-007', 312);
    const epCode = makeCode('EP', 'gap-ep-x', 100, 'EP-X', 200, 250);
    const xw: Crosswalk = {
      ...makeCrosswalk([]),
      module: 'EP',
      rows: [
        {
          specGapId: 'GAP-EP-007',
          specLine: 312,
          tier: 'T1',
          classification: 'DET_OK',
          ruleBodyCite: {
            registryId: 'gap-vd-6',
            registryLine: 999,
            evaluatorBlockName: 'VD-6',
            evaluatorBodyLineRange: [5500, 5600],
            evaluatorModule: 'VHD', // VHD not in allCodeExtracts
          },
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
    };
    const allCode = new Map<ModuleCode, CodeExtract>([['EP', epCode]]); // VHD missing
    expect(() =>
      refreshCrosswalk({ module: 'EP', crosswalk: xw, spec, allCodeExtracts: allCode }),
    ).toThrow(CrossModuleSourceMissing);
  });
});
