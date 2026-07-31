/**
 * Tranche 3 Slice 1: PCI/CABG date threading - GAP-CAD-061 (DAPT de-escalation window) +
 * GAP-CAD-051 (post-PCI non-cardiac surgery timing) + the procedureRecency derivations.
 *
 * These tests are the FIRE proof. On demo-synthea-threaded the production substance check can only
 * prove non-fire for 061 (the 30-90d post-PCI window holds 0 patients and the tenant emits no oral
 * antiplatelets - measured 2026-07-30), so fire behavior is proven here synthetically.
 *
 * evaluateGapRules is pure: (dxCodes, labValues, medCodes, age, gender?, race?, meds?, procedureCodes?).
 * The derived signals (months_since_pci / ncs_after_pci_months) are passed directly in labValues for the
 * evaluator tests; the derivations themselves are covered in the first two describes.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { deriveMonthsSincePci, deriveNcsAfterPciMonths } from '../../src/ingestion/procedureRecency';
import { SNOMED_CORONARY_REVASC, SNOMED_NONCARDIAC_SURGERY } from '../../src/terminology/cardiovascularValuesets';

const PCI = SNOMED_CORONARY_REVASC.PCI; // 415070008
const NOW = new Date('2026-07-31T00:00:00Z').getTime();
const d = (s: string) => new Date(s);

const RULE_061 = 'gap-cad-061-dapt-deescalation';
const RULE_051 = 'gap-cad-051-ncs-timing';

const find061 = (labs: Record<string, number>, medCodes: string[], procs: string[], dx: string[] = ['I25.10']) =>
  evaluateGapRules(dx, labs, medCodes, 68, 'MALE', 'WHITE', [], procs).find((g: any) => g.ruleId === RULE_061);
const find051 = (labs: Record<string, number>, procs: string[], dx: string[] = ['I25.10']) =>
  evaluateGapRules(dx, labs, [], 68, 'MALE', 'WHITE', [], procs).find((g: any) => g.ruleId === RULE_051);

describe('deriveMonthsSincePci', () => {
  it('returns whole months since the MOST RECENT PCI', () => {
    const procs = [
      { snomedCode: PCI, procedureDate: d('2024-01-15') },
      { snomedCode: PCI, procedureDate: d('2026-05-28') }, // ~2.1 months before NOW
    ];
    expect(deriveMonthsSincePci(procs, NOW)).toBe(2);
  });

  it('returns undefined when no PCI is on record (never-fire-on-absence upstream)', () => {
    expect(deriveMonthsSincePci([], NOW)).toBeUndefined();
    expect(deriveMonthsSincePci([{ snomedCode: '232717009', procedureDate: d('2026-05-01') }], NOW)).toBeUndefined();
  });

  it('skips null/invalid dates rather than treating them as epoch', () => {
    expect(deriveMonthsSincePci([{ snomedCode: PCI, procedureDate: null }], NOW)).toBeUndefined();
    expect(deriveMonthsSincePci([{ snomedCode: PCI, procedureDate: 'not-a-date' }], NOW)).toBeUndefined();
  });

  it('clamps a future-dated PCI to 0, never negative', () => {
    expect(deriveMonthsSincePci([{ snomedCode: PCI, procedureDate: d('2026-08-15') }], NOW)).toBe(0);
  });
});

describe('deriveNcsAfterPciMonths', () => {
  const CHOLE = SNOMED_NONCARDIAC_SURGERY.LAPAROSCOPIC_CHOLECYSTECTOMY;
  const TKA = SNOMED_NONCARDIAC_SURGERY.TOTAL_KNEE_REPLACEMENT;

  it('returns whole months from a PCI to the first curated NCS after it', () => {
    const procs = [
      { snomedCode: PCI, procedureDate: d('2026-01-01') },
      { snomedCode: CHOLE, procedureDate: d('2026-03-01') }, // 59d -> 1 month
    ];
    expect(deriveNcsAfterPciMonths(procs)).toBe(1);
  });

  it('minimizes over ALL (PCI, NCS) pairs - a later PCI does not erase an earlier violation', () => {
    const procs = [
      { snomedCode: PCI, procedureDate: d('2025-01-01') },
      { snomedCode: TKA, procedureDate: d('2025-03-15') }, // 73d after first PCI -> 2 months
      { snomedCode: PCI, procedureDate: d('2026-06-01') }, // later PCI, no NCS after it
    ];
    expect(deriveNcsAfterPciMonths(procs)).toBe(2);
  });

  it('returns undefined when the NCS PRECEDES every PCI (surgery before stenting is not a timing event)', () => {
    const procs = [
      { snomedCode: CHOLE, procedureDate: d('2025-01-01') },
      { snomedCode: PCI, procedureDate: d('2026-01-01') },
    ];
    expect(deriveNcsAfterPciMonths(procs)).toBeUndefined();
  });

  it('returns undefined with no PCI or no NCS on record', () => {
    expect(deriveNcsAfterPciMonths([{ snomedCode: PCI, procedureDate: d('2026-01-01') }])).toBeUndefined();
    expect(deriveNcsAfterPciMonths([{ snomedCode: CHOLE, procedureDate: d('2026-01-01') }])).toBeUndefined();
  });

  it('CODE-SET PRECISION: cardiac procedures after a PCI NEVER count as non-cardiac surgery', () => {
    for (const cardiac of ['232717009' /* CABG */, '414088005' /* emergency CABG */, '773996000' /* TAVI */, '18286008' /* cardiac ablation */, '63697000' /* cardiopulmonary bypass */]) {
      const procs = [
        { snomedCode: PCI, procedureDate: d('2026-01-01') },
        { snomedCode: cardiac, procedureDate: d('2026-02-01') },
      ];
      expect(deriveNcsAfterPciMonths(procs)).toBeUndefined();
    }
  });

  it('CODE-SET PRECISION: deliberately-excluded non-cardiac codes (emergent/minor/dental) never count', () => {
    for (const excluded of ['80146002' /* appendectomy: emergent-dominant */, '81733005' /* dental surgical */, '274031008' /* rectal polypectomy: endoscopic */, '22523008' /* vasectomy: office minor */]) {
      const procs = [
        { snomedCode: PCI, procedureDate: d('2026-01-01') },
        { snomedCode: excluded, procedureDate: d('2026-02-01') },
      ];
      expect(deriveNcsAfterPciMonths(procs)).toBeUndefined();
    }
  });
});

describe('GAP-CAD-061: DAPT de-escalation post-PCI (TWILIGHT/TICO)', () => {
  const DAPT = ['1191' /* aspirin ingredient */, '32968' /* clopidogrel */];

  it('FIRES in the 1-3 month window on full DAPT', () => {
    expect(find061({ months_since_pci: 1 }, DAPT, [PCI])).toBeDefined();
    expect(find061({ months_since_pci: 2 }, DAPT, [PCI])).toBeDefined();
    expect(find061({ months_since_pci: 3 }, DAPT, [PCI])).toBeDefined();
  });

  it('fires with any P2Y12 (ticagrelor, prasugrel), not only clopidogrel', () => {
    expect(find061({ months_since_pci: 2 }, ['1191', '1116632'], [PCI])).toBeDefined();
    expect(find061({ months_since_pci: 2 }, ['1191', '613391'], [PCI])).toBeDefined();
  });

  it('WINDOW BOUNDARIES: does not fire at 0 months (too early) or 4+ months (window closed)', () => {
    expect(find061({ months_since_pci: 0 }, DAPT, [PCI])).toBeUndefined();
    expect(find061({ months_since_pci: 4 }, DAPT, [PCI])).toBeUndefined();
    expect(find061({ months_since_pci: 24 }, DAPT, [PCI])).toBeUndefined();
  });

  it('HOLLOW GUARD: never fires when months_since_pci is absent (no PCI date on record)', () => {
    expect(find061({}, DAPT, [PCI])).toBeUndefined();
  });

  it('never fires without the PCI procedure code', () => {
    expect(find061({ months_since_pci: 2 }, DAPT, [])).toBeUndefined();
  });

  it('never fires unless BOTH DAPT components are active (aspirin AND a P2Y12)', () => {
    expect(find061({ months_since_pci: 2 }, ['1191'], [PCI])).toBeUndefined();       // aspirin only
    expect(find061({ months_since_pci: 2 }, ['32968'], [PCI])).toBeUndefined();      // P2Y12 only
    expect(find061({ months_since_pci: 2 }, [], [PCI])).toBeUndefined();             // neither
  });

  it('hospice exclusion (Z51.5) suppresses the gap', () => {
    expect(find061({ months_since_pci: 2 }, DAPT, [PCI], ['I25.10', 'Z51.5'])).toBeUndefined();
  });

  it('carries the FDA CDS evidence object with the 2021 revascularization anchor and consider-language', () => {
    const gap: any = find061({ months_since_pci: 2 }, DAPT, [PCI]);
    expect(gap.evidence.guidelineSource).toContain('2021 ACC/AHA/SCAI');
    expect(gap.evidence.classOfRecommendation).toBe('Class 2a');
    expect(gap.evidence.levelOfEvidence).toBe('LOE B-R');
    expect(gap.status).toMatch(/^Consider /);
    expect(gap.status).not.toMatch(/\b(order|prescribe|must)\b/i);
    // The un-threaded spec arms are surfaced, not silent (PARTIAL ceiling honesty).
    expect(gap.evidence.exclusions.join(' ')).toContain('ischemic-risk stratification');
  });
});

describe('GAP-CAD-051: post-PCI non-cardiac surgery timing (2016 DAPT FU)', () => {
  it('FIRES when a curated NCS lands under 6 months post-PCI', () => {
    expect(find051({ ncs_after_pci_months: 0 }, [PCI])).toBeDefined();
    expect(find051({ ncs_after_pci_months: 2 }, [PCI])).toBeDefined();
    expect(find051({ ncs_after_pci_months: 5 }, [PCI])).toBeDefined();
  });

  it('WINDOW BOUNDARY: does not fire at 6+ months (the DES optimal-delay arm is satisfied)', () => {
    expect(find051({ ncs_after_pci_months: 6 }, [PCI])).toBeUndefined();
    expect(find051({ ncs_after_pci_months: 12 }, [PCI])).toBeUndefined();
  });

  it('HOLLOW GUARD: never fires when ncs_after_pci_months is absent (no qualifying pair)', () => {
    expect(find051({}, [PCI])).toBeUndefined();
  });

  it('never fires without the PCI procedure code', () => {
    expect(find051({ ncs_after_pci_months: 2 }, [])).toBeUndefined();
  });

  it('hospice exclusion (Z51.5) suppresses the gap', () => {
    expect(find051({ ncs_after_pci_months: 2 }, [PCI], ['I25.10', 'Z51.5'])).toBeUndefined();
  });

  it('carries the FDA CDS evidence object citing BOTH guideline arms and the conservative default', () => {
    const gap: any = find051({ ncs_after_pci_months: 2 }, [PCI]);
    expect(gap.evidence.guidelineSource).toContain('2016 ACC/AHA');
    expect(gap.evidence.classOfRecommendation).toBe('Class 1');
    expect(gap.evidence.levelOfEvidence).toBe('LOE B-NR');
    // Ruling (2): the note cites the BMS 30-day arm, the DES 6-month arm, AND the IIb 3-month
    // consideration; stent-type unavailability is stated, not silent.
    const note = gap.recommendations.note;
    expect(note).toContain('30 days after BMS');
    expect(note).toContain('6 months after DES');
    expect(note).toContain('Class IIb');
    expect(note).toContain('Stent type');
    expect(gap.recommendations.action).toMatch(/^Consider /);
    expect(gap.status).not.toMatch(/\b(order|prescribe|must)\b/i);
    expect(gap.evidence.exclusions.join(' ')).toContain('stent type');
  });

  it('the two rules are INDEPENDENT: a patient can fire both (in-window DAPT + early surgery)', () => {
    const labs = { months_since_pci: 2, ncs_after_pci_months: 2 };
    const gaps = evaluateGapRules(['I25.10'], labs, ['1191', '32968'], 68, 'MALE', 'WHITE', [], [PCI]);
    expect(gaps.find((g: any) => g.ruleId === RULE_061)).toBeDefined();
    expect(gaps.find((g: any) => g.ruleId === RULE_051)).toBeDefined();
  });
});
