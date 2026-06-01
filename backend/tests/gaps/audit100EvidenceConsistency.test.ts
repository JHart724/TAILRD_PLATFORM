/**
 * AUDIT-100 - Evidence-object consistency for the 3 corrected DET_OK gaps
 * (MRA gap-hf-36, RAAS gap-hf-37-raas, CAD-statin gap-cad-statin).
 *
 * AUDIT-100 found these three rules carried copy-pasted `evidence` objects with
 * wrong clinical provenance (donor: beta-blocker, PAD-statin, digoxin). The gaps
 * still FIRED correctly (DET_OK); only the FDA-CDS-exemption transparency surface
 * was wrong. This suite is the deterministic prototype of the evidence-object
 * validator (next arc): for each corrected gap it asserts the four invariants a
 * self-consistent evidence object must satisfy, by invoking the real engine
 * (evaluateGapRules) rather than reading source text.
 *
 *   (a) detection still FIRES unchanged (the gap is present in the output)
 *   (b) evidence.guidelineSource matches the rule's own recommendations guideline
 *   (c) evidence.triggerCriteria references the actual gating drug/condition
 *   (d) classOfRecommendation / levelOfEvidence are the rule's true values
 *       (CAD-statin LOE corrected B -> A)
 *
 * Plus a regression guard per gap: the donor provenance text is GONE.
 *
 * §16 note: the RxNorm gating codes these gaps fire on were re-verified against
 * RxNav properties.json during the AUDIT-100 correction PR (MRA 9997/298869 =
 * spironolactone/eplerenone; RAAS 29046/3827/35296/52175/69749/1656339 =
 * lisinopril/enalapril/ramipril/losartan/valsartan/sacubitril-valsartan).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

type Gap = ReturnType<typeof evaluateGapRules>[number];

function ruleGuideline(gap: Gap): string {
  const rec = (gap.recommendations ?? {}) as Record<string, unknown>;
  // RAAS + CAD-statin expose recommendations.guideline; MRA exposes only .action.
  return String(rec.guideline ?? rec.action ?? '');
}

function evidenceJson(gap: Gap): string {
  return JSON.stringify(gap.evidence ?? {});
}

describe('AUDIT-100 evidence-object consistency (validator prototype)', () => {
  describe('MRA gap-hf-36 (donor was beta-blocker)', () => {
    // Gating: HF + LVEF<=40 + K<5.0 + eGFR>30 + not on MRA (9997/298869)
    const gaps = evaluateGapRules(
      ['I50.20'],
      { lvef: 30, potassium: 4.5, egfr: 60 },
      [],
      65,
    );
    const gap = gaps.find(g => g.status === 'MRA not prescribed in HFrEF with LVEF<=40%');

    it('(a) detection still fires', () => {
      expect(gap).toBeDefined();
      expect(gap!.evidence).toBeDefined();
    });

    it('(b) guidelineSource matches the rule guideline (2022 AHA/ACC/HFSA)', () => {
      expect(gap!.evidence!.guidelineSource).toContain('2022 AHA/ACC/HFSA');
      expect(ruleGuideline(gap!)).toContain('2022 AHA/ACC/HFSA');
    });

    it('(c) triggerCriteria references MRA gating, not beta-blocker', () => {
      const trigger = gap!.evidence!.triggerCriteria.join(' ');
      expect(trigger).toMatch(/MRA/);
      expect(trigger).toMatch(/LVEF/);
    });

    it('(d) COR 1 / LOE A; MRA exclusions, not bradycardia/cardiogenic shock', () => {
      expect(gap!.evidence!.classOfRecommendation).toBe('1');
      expect(gap!.evidence!.levelOfEvidence).toBe('A');
      const excl = (gap!.evidence!.exclusions ?? []).join(' ');
      expect(excl).toMatch(/Hyperkalemia/);
      expect(excl).toMatch(/eGFR < 30/);
    });

    it('regression: donor beta-blocker provenance is gone', () => {
      const json = evidenceJson(gap!);
      expect(json).not.toMatch(/beta-blocker/i);
      expect(json).not.toMatch(/bradycardia/i);
      expect(json).not.toMatch(/Cardiogenic shock/i);
    });
  });

  describe('RAAS gap-hf-37-raas (donor was PAD high-intensity statin)', () => {
    // Gating: HF + LVEF<=40 + not on RAAS inhibitor
    const gaps = evaluateGapRules(['I50.20'], { lvef: 30 }, [], 65);
    const gap = gaps.find(g => g.status === 'ACEi/ARB/ARNi not prescribed in HFrEF');

    it('(a) detection still fires', () => {
      expect(gap).toBeDefined();
      expect(gap!.evidence).toBeDefined();
    });

    it('(b) guidelineSource matches the rule guideline (2022 AHA/ACC/HFSA HF)', () => {
      expect(gap!.evidence!.guidelineSource).toContain('2022 AHA/ACC/HFSA Heart Failure Guideline');
      expect(ruleGuideline(gap!)).toContain('2022 AHA/ACC/HFSA Heart Failure Guideline');
    });

    it('(c) triggerCriteria references RAAS gating, not PAD statin', () => {
      const trigger = gap!.evidence!.triggerCriteria.join(' ');
      expect(trigger).toMatch(/RAAS/);
      expect(trigger).toMatch(/LVEF/);
    });

    it('(d) COR 1 / LOE A; RAAS exclusions present', () => {
      expect(gap!.evidence!.classOfRecommendation).toBe('1');
      expect(gap!.evidence!.levelOfEvidence).toBe('A');
      const excl = (gap!.evidence!.exclusions ?? []).join(' ');
      expect(excl).toMatch(/Hyperkalemia/);
      expect(excl).toMatch(/angioedema/i);
    });

    it('regression: donor PAD-statin provenance is gone', () => {
      const json = evidenceJson(gap!);
      expect(json).not.toMatch(/PAD/);
      expect(json).not.toMatch(/Peripheral Artery/i);
      expect(json).not.toMatch(/high-intensity statin/i);
    });
  });

  describe('CAD-statin gap-cad-statin (donor was digoxin; LOE was wrong B)', () => {
    // Gating: CAD (I25.*) + not on statin (83367/301542/36567/42463)
    const gaps = evaluateGapRules(['I25.10'], {}, [], 65);
    const gap = gaps.find(g => g.status === 'High-intensity statin not prescribed in CAD');

    it('(a) detection still fires', () => {
      expect(gap).toBeDefined();
      expect(gap!.evidence).toBeDefined();
    });

    it('(b) guidelineSource matches the rule guideline (2018 ACC/AHA Cholesterol)', () => {
      expect(gap!.evidence!.guidelineSource).toContain('2018 ACC/AHA Cholesterol');
      expect(ruleGuideline(gap!)).toContain('2018 ACC/AHA Cholesterol');
    });

    it('(c) triggerCriteria references CAD + statin (stays "no statin" per AUDIT-101)', () => {
      const trigger = gap!.evidence!.triggerCriteria.join(' ');
      expect(trigger).toMatch(/CAD/);
      expect(trigger).toMatch(/statin/);
    });

    it('(d) COR 1 / LOE corrected B -> A; statin exclusions present', () => {
      expect(gap!.evidence!.classOfRecommendation).toBe('1');
      expect(gap!.evidence!.levelOfEvidence).toBe('A');
      const excl = (gap!.evidence!.exclusions ?? []).join(' ');
      expect(excl).toMatch(/statin intolerance/i);
    });

    it('regression: donor digoxin provenance is gone', () => {
      const json = evidenceJson(gap!);
      expect(json).not.toMatch(/Digoxin/i);
      expect(json).not.toMatch(/DIG Trial/i);
    });
  });
});
