/**
 * v3.0 EP buildout chunk 4 (2026-06-16) - bradycardia/syncope + LAAC remainder (final EP authoring chunk).
 * Built: EP-030/033/097/067. Deferred (data-blocked -> register): EP-031 (vasovagal/recurrence not codable),
 * EP-094 (exertional pattern not codable), EP-101 (coronary-angio CPT + acute-inpatient pathway).
 * EP-093 is pre-existing DET_OK (legacy fold-in, not authored here).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const AF = 'I48.0';
const AVBLOCK = 'I44.2';
const OH = 'I95.1';
const METOPROLOL = '6918';   // rate-control / AV-nodal blocker
const DIGOXIN = '3407';
const LAAC = '33340';
const APIXABAN = '1364430';
const ASPIRIN = '1191';
const PACEMAKER = '33208';

// ---- EP-030: bradycardia on AV-nodal blocker -> reduce drug first ----
describe('EP-030 bradycardia on AV-nodal blocker', () => {
  it('fires: HR 45 + on metoprolol + no complete AV block + no pacemaker', () => {
    const g = evaluateGapRules([], { heart_rate: 45 }, [METOPROLOL], 70, 'MALE', undefined, [], []);
    expect(find(g, 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision')).toBeTruthy();
  });
  it('gates: HR 70 (not bradycardic)', () => {
    const g = evaluateGapRules([], { heart_rate: 70 }, [METOPROLOL], 70, 'MALE', undefined, [], []);
    expect(find(g, 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision')).toBeFalsy();
  });
  it('gates (standing check): complete AV block (I44.2) needs pacing, not dose reduction', () => {
    const g = evaluateGapRules([AVBLOCK], { heart_rate: 45 }, [METOPROLOL], 70, 'MALE', undefined, [], []);
    expect(find(g, 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision')).toBeFalsy();
  });
  it('gates: not on an AV-nodal blocker', () => {
    const g = evaluateGapRules([], { heart_rate: 45 }, [], 70, 'MALE', undefined, [], []);
    expect(find(g, 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision')).toBeFalsy();
  });
  it('gates: existing pacemaker', () => {
    const g = evaluateGapRules([], { heart_rate: 45 }, [METOPROLOL], 70, 'MALE', undefined, [], [PACEMAKER]);
    expect(find(g, 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision')).toBeFalsy();
  });
});

// ---- EP-033: chronic AF with HR<40 -> adjust meds vs pacing ----
describe('EP-033 chronic AF HR<40', () => {
  it('fires: AF + HR 35 + on rate control + no pacemaker', () => {
    const g = evaluateGapRules([AF], { heart_rate: 35 }, [DIGOXIN], 72, 'MALE', undefined, [], []);
    expect(find(g, 'Chronic AF with HR<40 on rate control: adjust medication vs pacing')).toBeTruthy();
  });
  it('gates: HR 50 (not <40)', () => {
    const g = evaluateGapRules([AF], { heart_rate: 50 }, [DIGOXIN], 72, 'MALE', undefined, [], []);
    expect(find(g, 'Chronic AF with HR<40 on rate control: adjust medication vs pacing')).toBeFalsy();
  });
  it('gates: no AF', () => {
    const g = evaluateGapRules([], { heart_rate: 35 }, [DIGOXIN], 72, 'MALE', undefined, [], []);
    expect(find(g, 'Chronic AF with HR<40 on rate control: adjust medication vs pacing')).toBeFalsy();
  });
});

// ---- EP-097: orthostatic hypotension med review ----
describe('EP-097 orthostatic hypotension med review', () => {
  it('fires: I95.1 + on a BP-lowering agent', () => {
    const g = evaluateGapRules([OH], {}, [METOPROLOL], 75, 'FEMALE', undefined, [], []);
    expect(find(g, 'Orthostatic hypotension on BP-lowering therapy: medication review')).toBeTruthy();
  });
  it('gates: OH but on no BP-lowering agent', () => {
    const g = evaluateGapRules([OH], {}, [], 75, 'FEMALE', undefined, [], []);
    expect(find(g, 'Orthostatic hypotension on BP-lowering therapy: medication review')).toBeFalsy();
  });
  it('gates: no orthostatic hypotension diagnosis', () => {
    const g = evaluateGapRules([], {}, [METOPROLOL], 75, 'FEMALE', undefined, [], []);
    expect(find(g, 'Orthostatic hypotension on BP-lowering therapy: medication review')).toBeFalsy();
  });
});

// ---- EP-067: post-LAAC antithrombotic safety ----
describe('EP-067 post-LAAC antithrombotic', () => {
  it('fires: LAAC done + on NO antithrombotic', () => {
    const g = evaluateGapRules([AF], {}, [], 76, 'MALE', undefined, [], [LAAC]);
    expect(find(g, 'Post-LAAC patient not on any antithrombotic therapy')).toBeTruthy();
  });
  it('gates: on apixaban (OAC present)', () => {
    const g = evaluateGapRules([AF], {}, [APIXABAN], 76, 'MALE', undefined, [], [LAAC]);
    expect(find(g, 'Post-LAAC patient not on any antithrombotic therapy')).toBeFalsy();
  });
  it('gates: on aspirin (antiplatelet present)', () => {
    const g = evaluateGapRules([AF], {}, [ASPIRIN], 76, 'MALE', undefined, [], [LAAC]);
    expect(find(g, 'Post-LAAC patient not on any antithrombotic therapy')).toBeFalsy();
  });
  it('gates: no LAAC on record', () => {
    const g = evaluateGapRules([AF], {}, [], 76, 'MALE', undefined, [], []);
    expect(find(g, 'Post-LAAC patient not on any antithrombotic therapy')).toBeFalsy();
  });
});
