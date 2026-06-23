/**
 * AUDIT-187 (2026-06-22): FFR/iFR decision-support response integrity.
 *
 * Guards the resolved finding (verdict b): the endpoint MUST NOT return a fabricated
 * population statistic / revenue projection (the dropped `qualityMetrics` block:
 * ffrUtilization '68.4%', benchmark '75%', improvementOpportunity '+$1.2M annual revenue')
 * as if it were queried or computed. Also covers the real decision-support logic
 * (FAME / DEFINE-FLAIR thresholds) and the qualitative documentation note.
 */
import { buildFfrDecisionSupport } from '../../src/routes/decisionSupport';

describe('buildFfrDecisionSupport - decision logic (FAME / DEFINE-FLAIR)', () => {
  it('FFR <= 0.80 -> revascularization (FFR-positive)', () => {
    expect(buildFfrDecisionSupport({ ffrValue: 0.75 }).recommendation).toMatch(/Revascularization recommended \(FFR-positive\)/);
  });
  it('FFR > 0.80 -> medical therapy (FFR-negative)', () => {
    expect(buildFfrDecisionSupport({ ffrValue: 0.85 }).recommendation).toMatch(/Medical therapy recommended \(FFR-negative\)/);
  });
  it('iFR <= 0.89 -> revascularization (iFR-positive)', () => {
    expect(buildFfrDecisionSupport({ ifrValue: 0.85 }).recommendation).toMatch(/iFR-positive/);
  });
  it('stenosis >= 90 (no FFR/iFR) -> revascularization (severe stenosis)', () => {
    expect(buildFfrDecisionSupport({ stenosisPercent: 95 }).recommendation).toMatch(/severe stenosis/);
  });
  it('stenosis 50-90 (no FFR/iFR) -> physiological assessment recommended', () => {
    const r = buildFfrDecisionSupport({ stenosisPercent: 70 });
    expect(r.recommendation).toMatch(/Physiological assessment recommended/);
    expect(r.evidenceLevel).toMatch(/FAME\/DEFINE-FLAIR/);
  });
  it('defaults safely on empty input (no throw)', () => {
    expect(() => buildFfrDecisionSupport()).not.toThrow();
    expect(buildFfrDecisionSupport().stenosisPercent).toBe(60);
  });
});

describe('buildFfrDecisionSupport - no fabricated figure (AUDIT-187 resolved)', () => {
  const result = buildFfrDecisionSupport({ ffrValue: 0.78, id: 'CAD-001' });
  const serialized = JSON.stringify(result);

  it('does NOT return a qualityMetrics block', () => {
    expect((result as Record<string, unknown>).qualityMetrics).toBeUndefined();
  });
  it('does NOT contain the fabricated utilization / revenue figures', () => {
    expect(serialized).not.toContain('68.4');
    expect(serialized).not.toContain('1.2M');
    expect(serialized).not.toContain('ffrUtilization');
    expect(serialized).not.toContain('improvementOpportunity');
  });
  it('carries no quantified $ or % figure dressed as data (qualitative note only)', () => {
    expect(serialized).not.toMatch(/\$[0-9]/);
    expect(result.documentationNote).toMatch(/appropriate-use/);
    expect(result.documentationNote).not.toMatch(/[0-9]%/);
  });
});
