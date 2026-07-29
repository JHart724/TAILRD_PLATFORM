/**
 * AUDIT-222: the ruleId assignment is FROZEN.
 *
 * ruleId is a persisted identity: stored therapy_gaps rows carry it, and the runners match on it. If an id
 * silently changed, every stored row for that rule would stop matching and the runner would create a
 * duplicate beside it - re-introducing the identity instability AUDIT-222 exists to remove.
 *
 * This test is the freeze enforcement. It re-extracts every gaps.push ruleId from the engine IN PUSH ORDER
 * and asserts it matches the committed report (docs/audit/AUDIT_222_RULEID_ASSIGNMENT.md) exactly.
 *
 * If this fails you have either (a) added/removed/reordered a gaps.push, or (b) changed an id. For (a) the
 * report must be regenerated as part of the same PR. For (b) STOP: an id may change only via a documented
 * data migration on therapy_gaps.ruleId (docs/audit/AUDIT_222_223_JOINT_DESIGN.md section 3).
 */
import * as fs from 'fs';
import * as path from 'path';

const ENGINE = path.join(__dirname, '../../src/ingestion/gaps/gapRuleEngine.ts');
const REPORT = path.join(__dirname, '../../../docs/audit/AUDIT_222_RULEID_ASSIGNMENT.md');

/** ruleIds as they appear in the engine, in gaps.push order. */
function idsFromEngine(): string[] {
  const lines = fs.readFileSync(ENGINE, 'utf-8').split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('gaps.push(')) continue;
    const m = /^\s*ruleId: '([^']+)',/.exec(lines[i + 1] ?? '');
    if (!m) throw new Error(`gaps.push at line ${i + 1} has no ruleId on the next line`);
    out.push(m[1]);
  }
  return out;
}

/** (ruleId, provenance) rows from the committed report table, in order. */
function rowsFromReport(): Array<{ ruleId: string; provenance: string }> {
  const lines = fs.readFileSync(REPORT, 'utf-8').split(/\r?\n/);
  const out: Array<{ ruleId: string; provenance: string }> = [];
  for (const l of lines) {
    const m = /^\|\s*#\d+ @ `gapRuleEngine\.ts:\d+`\s*\|\s*`([^`]+)`\s*\|\s*(registry-binding|generated)\s*\|$/.exec(l);
    if (m) out.push({ ruleId: m[1], provenance: m[2] });
  }
  return out;
}

describe('AUDIT-222 ruleId freeze', () => {
  const engineIds = idsFromEngine();
  const reportRows = rowsFromReport();

  it('every gaps.push carries a ruleId', () => {
    expect(engineIds).toHaveLength(368);
  });

  it('ruleIds are unique (identity must not be shared between rules)', () => {
    expect(new Set(engineIds).size).toBe(engineIds.length);
  });

  it('matches the committed frozen assignment report exactly, in push order', () => {
    expect(reportRows).toHaveLength(engineIds.length);
    expect(engineIds).toEqual(reportRows.map((r) => r.ruleId));
  });

  it('provenance namespaces are disjoint: generated ids are slug:-prefixed, adopted ids are not', () => {
    for (const r of reportRows) {
      if (r.provenance === 'generated') expect(r.ruleId.startsWith('slug:')).toBe(true);
      else expect(r.ruleId.startsWith('slug:')).toBe(false);
    }
  });

  it('the adopted/generated split is the recorded one (260 registry / 108 generated)', () => {
    const reg = reportRows.filter((r) => r.provenance === 'registry-binding').length;
    expect({ registry: reg, generated: reportRows.length - reg }).toEqual({ registry: 260, generated: 108 });
  });

  it('every registry-adopted id is a real RUNTIME_GAP_REGISTRY entry', () => {
    const src = fs.readFileSync(ENGINE, 'utf-8');
    const registryIds = new Set(Array.from(src.matchAll(/^\s+id: '([^']+)',$/gm)).map((m) => m[1]));
    const adopted = reportRows.filter((r) => r.provenance === 'registry-binding').map((r) => r.ruleId);
    expect(adopted.filter((id) => !registryIds.has(id))).toEqual([]);
  });
});
