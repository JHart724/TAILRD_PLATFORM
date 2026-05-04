/**
 * Tests for parseExistingAddendum.ts — markdown row parsing across 3 table layouts.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseAddendumRow,
  parseAddendumToDraft,
} from '../../../scripts/auditCanonical/parseExistingAddendum';
import { ReconciliationResult } from '../../../scripts/auditCanonical/reconcile';
import { CANONICAL_OUTPUT_DIR, REPO_ROOT } from '../../../scripts/auditCanonical/lib/modules';
import { SpecExtract, CodeExtract } from '../../../scripts/auditCanonical/lib/types';

describe('parseAddendumRow — 5-column layout (HF/PV/CAD)', () => {
  it('parses GAP-HF-001 DET_OK row', () => {
    const line = '| GAP-HF-001 | T1 | HFrEF: BB not prescribed | `gap-hf-35-beta-blocker` + `gdmtEngine.ts` | DET_OK |';
    const r = parseAddendumRow(line, 60);
    expect(r).not.toBeNull();
    expect(r!.specGapId).toBe('GAP-HF-001');
    expect(r!.tier).toBe('T1');
    expect(r!.classification).toBe('DET_OK');
    expect(r!.registryIdsFromCell).toEqual(['gap-hf-35-beta-blocker']);
    expect(r!.parseConfidence).toBeGreaterThan(0.5);
  });

  it('normalizes PARTIAL → PARTIAL_DETECTION', () => {
    const line = '| GAP-HF-002 | T1 | HFrEF: non-evidence-based BB | `gap-hf-35-beta-blocker` | PARTIAL |';
    const r = parseAddendumRow(line, 61);
    expect(r!.classification).toBe('PARTIAL_DETECTION');
  });

  it('handles SPEC_ONLY rows with — em-dash impl cell', () => {
    const line = '| GAP-HF-015 | T2 | HF: Digoxin inappropriate use | — | SPEC_ONLY |';
    const r = parseAddendumRow(line, 80);
    expect(r!.classification).toBe('SPEC_ONLY');
    expect(r!.registryIdsFromCell).toHaveLength(0);
  });
});

describe('parseAddendumRow — 8-column layout (EP/SH)', () => {
  it('parses GAP-EP-001 with extra Stage/Pathway/Tags columns', () => {
    const line = '| GAP-EP-001 | T1 | AF anticoag CHA2DS2-VASc qualifying | `gap-ep-oac-afib` + `gap-ep-af-stroke-risk` | 3 | P3+P4 | Adherence | **DET_OK** |';
    const r = parseAddendumRow(line, 64);
    expect(r!.specGapId).toBe('GAP-EP-001');
    expect(r!.tier).toBe('T1');
    expect(r!.classification).toBe('DET_OK');
    expect(r!.registryIdsFromCell).toEqual(['gap-ep-oac-afib', 'gap-ep-af-stroke-risk']);
  });

  it('handles SPEC_ONLY with prose impl cell `(registry only; no ...)`', () => {
    const line = '| GAP-EP-006 | T1 | Dabigatran in CrCl<30 (SAFETY) | (registry only; no CrCl-gated dabigatran SAFETY check in evaluator) | 7 | P3 | SAFETY | **SPEC_ONLY** |';
    const r = parseAddendumRow(line, 65);
    expect(r!.classification).toBe('SPEC_ONLY');
    expect(r!.registryIdsFromCell).toHaveLength(0);
  });

  it('strips markdown bold from classification cell', () => {
    const line = '| GAP-SH-001 | T1 | EARLY TAVR | `gap-sh-2-tavr-eval` line 4923+ | 4 | P1 | — | **PARTIAL** |';
    const r = parseAddendumRow(line, 62);
    expect(r!.classification).toBe('PARTIAL_DETECTION');
  });
});

describe('parseAddendumRow — 7-column VHD layout (re-audited)', () => {
  it('parses bold-wrapped GAP-VHD-005 DET_OK row', () => {
    const line = '| **GAP-VHD-005** | 754 | `\\| T1 \\|` + `(CRITICAL SAFETY)` in gap text | "Mechanical valve: DOAC prescribed (CRITICAL SAFETY). ..." | `gap-vd-6-doac-mechanical-valve` line 5312+ (explicit RE-ALIGN trial citation, Class 3 Harm) | **DET_OK** | **SPEC-EXPLICIT CRITICAL SAFETY** ✓ covered |';
    const r = parseAddendumRow(line, 66);
    expect(r).not.toBeNull();
    expect(r!.specGapId).toBe('GAP-VHD-005');
    expect(r!.classification).toBe('DET_OK');
    expect(r!.registryIdsFromCell).toEqual(['gap-vd-6-doac-mechanical-valve']);
  });

  it('parses bold-wrapped SPEC_ONLY row with no registry cite', () => {
    const line = '| **GAP-VHD-050** | 830 | `\\| T1 \\|` | "S. aureus bacteremia: TEE indication adherence. ..." | No S. aureus + TEE rule in evaluator. | **SPEC_ONLY** | None |';
    const r = parseAddendumRow(line, 67);
    expect(r!.specGapId).toBe('GAP-VHD-050');
    expect(r!.classification).toBe('SPEC_ONLY');
    expect(r!.registryIdsFromCell).toHaveLength(0);
  });
});

describe('parseAddendumRow — non-gap rows', () => {
  it('returns null for table header rows', () => {
    expect(parseAddendumRow('| ID | Tier | Spec Gap | Impl Match | Class |', 58)).toBeNull();
  });

  it('returns null for separator rows', () => {
    expect(parseAddendumRow('|----|-----|----------|------------|-------|', 59)).toBeNull();
  });

  it('returns null for prose paragraphs', () => {
    expect(parseAddendumRow('GAP-HF-001 mentioned in some prose', 100)).toBeNull();
  });
});

describe('parseAddendumToDraft — full integration', () => {
  it('produces draft with all spec gaps covered (defaulting missing to SPEC_ONLY)', () => {
    // VHD addendum compresses T2/T3 — the parser should default missing gaps to SPEC_ONLY
    const specPath = path.join(CANONICAL_OUTPUT_DIR, 'VHD.spec.json');
    const codePath = path.join(CANONICAL_OUTPUT_DIR, 'VHD.code.json');
    const reconPath = path.join(CANONICAL_OUTPUT_DIR, 'VHD.reconciliation.json');
    if (!fs.existsSync(specPath) || !fs.existsSync(codePath) || !fs.existsSync(reconPath)) {
      // Skip if extracts not present (run extractSpec/extractCode/reconcile first)
      return;
    }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as SpecExtract;
    const code = JSON.parse(fs.readFileSync(codePath, 'utf8')) as CodeExtract;
    const reconciliation = JSON.parse(fs.readFileSync(reconPath, 'utf8')) as ReconciliationResult;

    const addendumPath = path.join(REPO_ROOT, 'docs/audit/PHASE_0B_VHD_AUDIT_ADDENDUM.md');
    if (!fs.existsSync(addendumPath)) return;

    const { crosswalk, parseStats } = parseAddendumToDraft('VHD', addendumPath, {
      module: 'VHD',
      spec,
      code,
      reconciliation,
    });

    expect(crosswalk.draft).toBe(true);
    expect(crosswalk.module).toBe('VHD');
    expect(crosswalk.rows.length).toBe(spec.totalGaps);
    // VHD-005 was T1 DET_OK in re-audit
    const vhd5 = crosswalk.rows.find((r) => r.specGapId === 'GAP-VHD-005');
    expect(vhd5).toBeDefined();
    expect(vhd5!.classification).toBe('DET_OK');
    // Defaulted SPEC_ONLY count should match parseStats
    expect(parseStats.missingSpecGaps).toBeGreaterThan(0); // VHD compresses T2/T3
  });
});
