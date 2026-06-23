/**
 * AUDIT-188 (2026-06-22): POST /heart-failure/gdmt-gaps real-query integrity.
 *
 * The endpoint was a whole-endpoint silent-mock (fabricated totalPatients/breakdown +
 * priorityPatients with invented NAMES 'Sarah Johnson' + estimatedBenefit dollars +
 * fabricated qualityMetrics). It now returns a real hospitalId-scoped therapyGap query
 * via the pure buildGdmtGapAnalysis(). These tests guard:
 *   - real per-class aggregation (distinct patients, Not-Prescribed vs Under-dosed split)
 *   - NO fabricated patient names / dollar figures remain (AUDIT-300 pure-removal)
 *   - patient references are ID-only (PHI discipline)
 *   - unsourced fields are null EmptyState, never a fabricated default
 */
import { buildGdmtGapAnalysis, HfMedGapRow } from '../../src/routes/decisionSupport';

const rows: HfMedGapRow[] = [
  { id: 'g1', patientId: 'p1', gapType: 'MEDICATION_MISSING', medication: 'dapagliflozin', identifiedAt: new Date('2026-06-01') },
  { id: 'g2', patientId: 'p2', gapType: 'MEDICATION_UNDERDOSED', medication: 'carvedilol', identifiedAt: new Date('2026-06-02') },
  { id: 'g3', patientId: 'p1', gapType: 'MEDICATION_MISSING', medication: 'spironolactone', identifiedAt: new Date('2026-06-03') },
  { id: 'g4', patientId: 'p3', gapType: 'MEDICATION_MISSING', medication: 'lisinopril', identifiedAt: new Date('2026-06-04') },
];

describe('buildGdmtGapAnalysis - real per-class aggregation', () => {
  const r = buildGdmtGapAnalysis(4, rows) as any;

  it('counts ACEi/ARB Not-Prescribed from a real missing gap (lisinopril -> p3)', () => {
    expect(r.gapBreakdown.aceArb.opportunities.find((o: any) => o.type === 'Not Prescribed').count).toBe(1);
    expect(r.gapBreakdown.aceArb.gapCount).toBe(1);
  });
  it('counts beta-blocker Under-dosed from a real underdosed gap (carvedilol -> p2)', () => {
    expect(r.gapBreakdown.betaBlocker.opportunities.find((o: any) => o.type === 'Under-dosed').count).toBe(1);
    expect(r.gapBreakdown.betaBlocker.opportunities.find((o: any) => o.type === 'Not Prescribed').count).toBe(0);
  });
  it('maps MRA (spironolactone) and SGLT2i (dapagliflozin) to the right pillars', () => {
    expect(r.gapBreakdown.mra.gapCount).toBe(1);
    expect(r.gapBreakdown.sglt2i.gapCount).toBe(1);
  });
  it('overallOptimization = share of HF patients with zero med gap (4 total, 3 with a gap -> 25%)', () => {
    expect(r.qualityMetrics.overallOptimization).toBe(25);
  });
  it('overallOptimization is null (not 0, not fabricated) when totalPatients is 0', () => {
    expect((buildGdmtGapAnalysis(0, []) as any).qualityMetrics.overallOptimization).toBeNull();
  });
});

describe('buildGdmtGapAnalysis - no fabricated identifiers / figures (AUDIT-188 + AUDIT-300)', () => {
  const r = buildGdmtGapAnalysis(4, rows) as any;
  const serialized = JSON.stringify(r);

  it('contains NO fabricated patient names', () => {
    expect(serialized).not.toContain('Sarah Johnson');
    expect(serialized).not.toContain('Jennifer Williams');
    expect(serialized).not.toContain('Robert Chen');
  });
  it('contains NO fabricated dollar figures (estimatedBenefit removed)', () => {
    expect(serialized).not.toContain('estimatedBenefit');
    expect(serialized).not.toMatch(/\$[0-9]/);
  });
  it('priorityPatients carry an internal patientId, never a name field', () => {
    expect(r.priorityPatients.length).toBe(4);
    for (const p of r.priorityPatients) {
      expect(p.patientId).toBeTruthy();
      expect(p.name).toBeUndefined();
    }
  });
  it('priorityPatients are sorted most-recent-first and capped at 10', () => {
    expect(r.priorityPatients[0].gapId).toBe('g4'); // 2026-06-04, newest
    expect(r.priorityPatients.length).toBeLessThanOrEqual(10);
  });
});

describe('buildGdmtGapAnalysis - unsourced fields are null EmptyState (no fabricated default)', () => {
  const r = buildGdmtGapAnalysis(4, rows) as any;
  it('per-class denominator fields the gap engine does not store are null', () => {
    expect(r.gapBreakdown.aceArb.eligible).toBeNull();
    expect(r.gapBreakdown.aceArb.prescribed).toBeNull();
    expect(r.gapBreakdown.aceArb.atTargetDose).toBeNull();
  });
  it('external benchmark + historical trend are null (not fabricated)', () => {
    expect(r.qualityMetrics.benchmark).toBeNull();
    expect(r.qualityMetrics.improvement).toBeNull();
    expect(r.qualityMetrics.target).toBeNull();
  });
});
