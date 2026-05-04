/**
 * Tests for crosswalkSchema.ts — type validation against spec.json + code.json.
 */

import { validateCrosswalk, summarizeValidation, Crosswalk } from '../../../scripts/auditCanonical/crosswalkSchema';
import { SpecExtract, CodeExtract } from '../../../scripts/auditCanonical/lib/types';

const minimalSpec: SpecExtract = {
  module: 'VHD',
  specSource: 'docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md',
  specSection: '§6.5',
  moduleHeaderLine: 749,
  totalGaps: 2,
  tierTotals: { T1: 1, T2: 1, T3: 0 },
  subcategories: [{ name: 'Mech', headerLine: 750, gapCount: 2 }],
  gaps: [
    {
      id: 'GAP-VHD-001',
      specLine: 753,
      tier: 'T1',
      tierMarkerLiteral: '| T1 |',
      subcategory: 'Mech',
      subcategoryHeaderLine: 750,
      name: 'Test gap 1',
      detectionLogic: 'detect',
      structuredDataElements: 'data',
      domains: ['D2'],
      phi: 'Non-PHI',
      bswPathwayTags: [],
      safetyTagLiteral: null,
      safetyTagCategory: null,
    },
    {
      id: 'GAP-VHD-002',
      specLine: 755,
      tier: 'T2',
      tierMarkerLiteral: '| T2 |',
      subcategory: 'Mech',
      subcategoryHeaderLine: 750,
      name: 'Test gap 2',
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

const minimalCode: CodeExtract = {
  module: 'VHD',
  codeSource: 'backend/src/ingestion/gaps/gapRuleEngine.ts',
  registry: [
    {
      id: 'gap-vd-1',
      registryLine: 100,
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
      name: 'VD-1',
      commentLine: 200,
      commentLiteral: '// Gap VD-1: Test',
      commentPattern: 'GAP_MOD_N',
      bodyStartLine: 201,
      bodyEndLine: 210,
      gapsPushIds: ['test-status'],
    },
  ],
  gapsPushCount: 1,
  moduleTagPattern: 'module: ModuleType.VALVULAR_DISEASE',
};

describe('validateCrosswalk', () => {
  it('returns valid=true for a fully-correct crosswalk', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-citation-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 753,
          tier: 'T1',
          classification: 'DET_OK',
          ruleBodyCite: {
            registryId: 'gap-vd-1',
            registryLine: 100,
            evaluatorBlockName: 'VD-1',
            evaluatorBodyLineRange: [201, 210],
            evaluatorModule: 'VHD',
          },
          auditNotes: 'Direct match',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
        {
          specGapId: 'GAP-VHD-002',
          specLine: 755,
          tier: 'T2',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: 'Not implemented',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('flags MISSING_RULE_BODY_CITE when DET_OK row has null ruleBodyCite', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 753,
          tier: 'T1',
          classification: 'DET_OK',
          ruleBodyCite: null,
          auditNotes: 'Missing cite',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
        {
          specGapId: 'GAP-VHD-002',
          specLine: 755,
          tier: 'T2',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: 'OK',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.valid).toBe(false);
    expect(r.errors.find((e) => e.code === 'MISSING_RULE_BODY_CITE')).toBeDefined();
  });

  it('flags MISSING_INFERRED_SAFETY_RATIONALE when inferredSafetyTag is set without rationale', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 753,
          tier: 'T1',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: 'STRUCTURAL_SAFETY',
          inferredSafetyRationale: null,
        },
        {
          specGapId: 'GAP-VHD-002',
          specLine: 755,
          tier: 'T2',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.errors.find((e) => e.code === 'MISSING_INFERRED_SAFETY_RATIONALE')).toBeDefined();
  });

  it('flags MISSING_ROW_FOR_SPEC_GAP when a spec gap has no crosswalk row', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 753,
          tier: 'T1',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.errors.find((e) => e.code === 'MISSING_ROW_FOR_SPEC_GAP' && e.message.includes('GAP-VHD-002'))).toBeDefined();
  });

  it('flags SPEC_LINE_MISMATCH when row.specLine differs from spec.json[gap].specLine', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 999, // wrong
          tier: 'T1',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
        {
          specGapId: 'GAP-VHD-002',
          specLine: 755,
          tier: 'T2',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.errors.find((e) => e.code === 'SPEC_LINE_MISMATCH')).toBeDefined();
  });

  it('flags REGISTRY_ID_NOT_FOUND when ruleBodyCite references nonexistent registry', () => {
    const xw: Crosswalk = {
      module: 'VHD',
      crosswalkVersion: '1.0',
      auditDate: '2026-05-04',
      auditMethod: 'rule-body-verified',
      rows: [
        {
          specGapId: 'GAP-VHD-001',
          specLine: 753,
          tier: 'T1',
          classification: 'DET_OK',
          ruleBodyCite: {
            registryId: 'gap-doesnt-exist',
            registryLine: 999,
            evaluatorBlockName: 'VD-1',
            evaluatorBodyLineRange: [201, 210],
            evaluatorModule: 'VHD',
          },
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
        {
          specGapId: 'GAP-VHD-002',
          specLine: 755,
          tier: 'T2',
          classification: 'SPEC_ONLY',
          ruleBodyCite: null,
          auditNotes: '',
          inferredSafetyTag: null,
          inferredSafetyRationale: null,
        },
      ],
      extras: [],
    };
    const r = validateCrosswalk(xw, minimalSpec, minimalCode);
    expect(r.errors.find((e) => e.code === 'REGISTRY_ID_NOT_FOUND')).toBeDefined();
  });

  it('summarizeValidation produces actionable summary string', () => {
    expect(summarizeValidation({ valid: true, errors: [], warnings: [] })).toBe('VALID');
    expect(summarizeValidation({ valid: true, errors: [], warnings: [{ path: '', code: 'X', message: '' }] })).toBe(
      'VALID (with 1 warning)',
    );
    expect(
      summarizeValidation({
        valid: false,
        errors: [
          { path: '', code: 'A', message: '' },
          { path: '', code: 'A', message: '' },
          { path: '', code: 'B', message: '' },
        ],
        warnings: [],
      }),
    ).toBe('INVALID (3 errors): A=2, B=1');
  });
});
