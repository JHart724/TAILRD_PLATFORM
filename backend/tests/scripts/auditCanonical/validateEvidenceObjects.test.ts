/**
 * Unit + integration tests for validateEvidenceObjects.ts.
 *
 * Unit tests cover the normalization + claim-extraction edge cases that protect
 * the ZERO-false-flag guarantee:
 *   - COR normalize / graded-token reduction ('Class 1', '3 (Harm)', non-graded)
 *   - LOE normalize / graded-token reduction ('LOE B-R', 'FDA Mandate')
 *   - COR claim extraction excludes Vaughan-Williams (1a/1c, roman) + NYHA
 *   - guideline YEAR set intersection (multi-guideline ';'/'+'-joined)
 *
 * Integration tests run analyzeSource against:
 *   - the live gapRuleEngine.ts  -> MUST report 0 inconsistencies + 0 warnings
 *     (baseline clean post-AUDIT-103; pushCount == evidenceCount == 263)
 *   - the negative-control FIXTURE -> MUST flag the synthetic bad rule on all
 *     three fields (proves the gate fires, not just passes vacuously) while
 *     leaving the synthetic consistent control rule unflagged.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  analyzeSource,
  normalizeCor,
  gradedCor,
  normalizeLoe,
  gradedLoe,
  extractCorClaims,
  extractLoeClaims,
  extractYears,
} from '../../../scripts/auditCanonical/validateEvidenceObjects';
import { EVALUATOR_PATH } from '../../../scripts/auditCanonical/lib/modules';

// =============================================================================
// Normalization - COR
// =============================================================================

describe('validateEvidenceObjects - COR normalization', () => {
  it('strips "Class " prefix and lowercases', () => {
    expect(normalizeCor('Class 1')).toBe('1');
    expect(normalizeCor('Class 2a')).toBe('2a');
    expect(normalizeCor('2b')).toBe('2b');
  });

  it('reduces graded values to arabic token', () => {
    expect(gradedCor('1')).toBe('1');
    expect(gradedCor('Class 2a')).toBe('2a');
    expect(gradedCor('2b')).toBe('2b');
    expect(gradedCor('3')).toBe('3');
  });

  it('reduces parenthetical-qualified COR to its leading token', () => {
    expect(gradedCor('3 (Harm)')).toBe('3');
    expect(gradedCor('Class 3 (Harm)')).toBe('3');
    expect(gradedCor('Class 1 (data required for safety evaluation)')).toBe('1');
  });

  it('returns null for non-graded COR (no false-flag)', () => {
    expect(gradedCor('Expert Consensus')).toBeNull();
    expect(gradedCor('FDA Mandate')).toBeNull();
  });
});

// =============================================================================
// Normalization - LOE
// =============================================================================

describe('validateEvidenceObjects - LOE normalization', () => {
  it('strips "LOE " prefix and uppercases', () => {
    expect(normalizeLoe('LOE B')).toBe('B');
    expect(normalizeLoe('b-r')).toBe('B-R');
  });

  it('reduces graded values to token incl. suffixed forms', () => {
    expect(gradedLoe('A')).toBe('A');
    expect(gradedLoe('LOE B')).toBe('B');
    expect(gradedLoe('B-R')).toBe('B-R');
    expect(gradedLoe('B-NR')).toBe('B-NR');
    expect(gradedLoe('C-LD')).toBe('C-LD');
    expect(gradedLoe('C-EO')).toBe('C-EO');
  });

  it('returns null for non-graded LOE (no false-flag)', () => {
    expect(gradedLoe('FDA Mandate')).toBeNull();
  });
});

// =============================================================================
// Claim extraction edge cases
// =============================================================================

describe('validateEvidenceObjects - COR claim extraction', () => {
  it('captures arabic COR claims', () => {
    expect(extractCorClaims('per 2020 ACC/AHA VHD, Class 1, LOE A')).toEqual(['1']);
    expect(extractCorClaims('downgraded to Class 2a recommendation')).toEqual(['2a']);
    expect(extractCorClaims('Class 3 (Harm) in HFrEF')).toEqual(['3']);
  });

  it('excludes Vaughan-Williams arabic variants (1a/1c)', () => {
    expect(extractCorClaims('Class 1a antiarrhythmic agent')).toEqual([]);
    expect(extractCorClaims('a Class 1c drug')).toEqual([]);
  });

  it('excludes roman numerals (NYHA / Vaughan-Williams)', () => {
    expect(extractCorClaims('NYHA Class II-III symptoms')).toEqual([]);
    expect(extractCorClaims('a Class III AAD (amiodarone)')).toEqual([]);
    expect(extractCorClaims('Class IV heart failure')).toEqual([]);
  });

  it('suppresses NYHA-prefixed arabic "Class"', () => {
    expect(extractCorClaims('NYHA Class 2 patients')).toEqual([]);
  });

  it('captures a genuine COR claim that follows an unrelated word', () => {
    expect(extractCorClaims('this is a Class 1 indication')).toEqual(['1']);
  });
});

describe('validateEvidenceObjects - LOE claim extraction', () => {
  it('captures LOE claims incl. suffixed forms', () => {
    expect(extractLoeClaims('Class 1, LOE A')).toEqual(['A']);
    expect(extractLoeClaims('Class 2a, LOE B-R')).toEqual(['B-R']);
    expect(extractLoeClaims('LOE B-NR observational')).toEqual(['B-NR']);
  });

  it('does not capture stray letters that are not LOE tokens', () => {
    expect(extractLoeClaims('the LOE was high')).toEqual([]);
  });
});

describe('validateEvidenceObjects - year extraction', () => {
  it('extracts all 4-digit guideline years', () => {
    expect(extractYears('2020 ACC/AHA VHD')).toEqual(['2020']);
    expect(
      extractYears('2022 AHA/ACC/HFSA HF Guideline + 2023 ACC/AHA/ACCP/HRS AF Guideline'),
    ).toEqual(['2022', '2023']);
  });

  it('returns no years for trial-only citations', () => {
    expect(extractYears('DAPA-HF / EMPEROR-Reduced trials')).toEqual([]);
  });
});

// =============================================================================
// Integration - live engine MUST be clean
// =============================================================================

describe('validateEvidenceObjects - live gapRuleEngine.ts baseline', () => {
  const src = fs.readFileSync(EVALUATOR_PATH, 'utf8');
  const result = analyzeSource(src, 'gapRuleEngine.ts');

  it('finds 326 gaps.push nodes, all with an evidence object', () => {
    expect(result.pushCount).toBe(326); // 305 + 21 (v3.0 EP module buildout, 2026-06-16, feat/ep-chunk1-af-anticoag)
    expect(result.evidenceCount).toBe(326);
  });

  it('reports ZERO inconsistencies (clean baseline post-AUDIT-103)', () => {
    expect(result.inconsistencies).toEqual([]);
  });

  it('reports ZERO soft comment warnings', () => {
    expect(result.warnings).toEqual([]);
  });
});

// =============================================================================
// Integration - negative control: the gate MUST fire on a bad fixture
// =============================================================================

describe('validateEvidenceObjects - negative control (gate fires, not vacuous)', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'evidenceInconsistent.fixture.ts');
  const src = fs.readFileSync(fixturePath, 'utf8');
  const result = analyzeSource(src, 'evidenceInconsistent.fixture.ts');

  it('parses both synthetic push nodes', () => {
    expect(result.pushCount).toBe(2);
    expect(result.evidenceCount).toBe(2);
  });

  it('flags the synthetic inconsistent rule on all three evidence fields', () => {
    const fields = result.inconsistencies.map((f) => f.field).sort();
    expect(fields).toEqual([
      'classOfRecommendation',
      'guidelineSource',
      'levelOfEvidence',
    ]);
  });

  it('does NOT flag the synthetic consistent control rule', () => {
    const consistentLineFindings = result.inconsistencies.filter((f) =>
      f.ruleLabel.includes('positive control'),
    );
    expect(consistentLineFindings).toEqual([]);
  });
});
