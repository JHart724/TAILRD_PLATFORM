/**
 * Tests for the AUDIT-218 procedures backfill runner (scripts/backfillProcedures.ts).
 *
 * Unit: deterministic idempotency key, row mapping, orphan classification, malformed STOP-parse.
 * Integration: the stream processor's count invariant (inserted = source - orphans - collisions) on a
 * fixture CSV, and idempotent re-run (second pass inserts 0 via the deterministic-key skipDuplicates).
 * No S3 / no real prisma - the core is pure and injects an in-memory writer.
 */

import {
  deterministicProcedureId,
  mapProcedureRow,
  processProcedureStream,
  assertTenantPopulated,
  assertStreamProgress,
  resolveBuildSha,
  MalformedProcedureRowError,
  ProcedureRow,
  ProcedureWriter,
} from '../../src/scripts/backfillProcedures';
import { parseCSVLine } from '../../src/ingestion/csvParser';

const HEADER = 'START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION,BASE_COST,REASONCODE,REASONDESCRIPTION';

function idxFrom(header: string): (h: string) => number {
  const cells = parseCSVLine(header);
  const map: Record<string, number> = {};
  cells.forEach((h, i) => { map[h.toLowerCase().replace(/\s+/g, '_')] = i; });
  return (h: string) => (h in map ? map[h] : -1);
}
const IDX = idxFrom(HEADER);
const PMAP = new Map<string, string>([['P1', 'db-1'], ['P2', 'db-2']]); // PORPHAN deliberately absent

async function* fromLines(lines: string[]): AsyncGenerator<string> {
  for (const l of lines) yield l;
}

/** In-memory writer that simulates createMany({ skipDuplicates }) on the unique fhirProcedureId. */
class MemWriter implements ProcedureWriter {
  store = new Set<string>();
  async createMany(rows: ProcedureRow[]): Promise<{ count: number }> {
    let count = 0;
    for (const r of rows) { if (!this.store.has(r.fhirProcedureId)) { this.store.add(r.fhirProcedureId); count++; } }
    return { count };
  }
}

describe('deterministicProcedureId', () => {
  it('is stable for identical natural keys and synthea-prefixed', () => {
    const a = deterministicProcedureId('P1', '40701008', '2020-01-01T00:00:00Z', 'E1');
    const b = deterministicProcedureId('P1', '40701008', '2020-01-01T00:00:00Z', 'E1');
    expect(a).toBe(b);
    expect(a.startsWith('synthea:')).toBe(true);
  });
  it('differs when any natural-key field differs', () => {
    const base = deterministicProcedureId('P1', '40701008', '2020-01-01T00:00:00Z', 'E1');
    expect(deterministicProcedureId('P2', '40701008', '2020-01-01T00:00:00Z', 'E1')).not.toBe(base);
    expect(deterministicProcedureId('P1', '433236007', '2020-01-01T00:00:00Z', 'E1')).not.toBe(base);
    expect(deterministicProcedureId('P1', '40701008', '2021-01-01T00:00:00Z', 'E1')).not.toBe(base);
    expect(deterministicProcedureId('P1', '40701008', '2020-01-01T00:00:00Z', 'E2')).not.toBe(base);
  });
});

describe('mapProcedureRow', () => {
  const row = (patient: string, code: string) =>
    parseCSVLine(`2020-01-01T00:00:00Z,2020-01-01T00:15:00Z,${patient},E1,http://snomed.info/sct,${code},Echocardiography,300,,`);

  it('maps a resolved row to a Procedure insert (SNOMED into snomedCode, cptCode null)', () => {
    const r = mapProcedureRow(row('P1', '40701008'), IDX, PMAP, 'demo-synthea-threaded', 1);
    expect(r.kind).toBe('row');
    if (r.kind !== 'row') return;
    expect(r.row.patientId).toBe('db-1');
    expect(r.row.hospitalId).toBe('demo-synthea-threaded');
    expect(r.row.snomedCode).toBe('40701008');
    expect(r.row.cptCode).toBeNull();
    expect(r.row.procedureName).toBe('Echocardiography');
    expect(r.row.procedureDate).toBeInstanceOf(Date);
    expect(r.row.fhirProcedureId.startsWith('synthea:')).toBe(true);
  });

  it('classifies a row for an un-ingested patient as an orphan (not written)', () => {
    const r = mapProcedureRow(row('PORPHAN', '40701008'), IDX, PMAP, 'demo-synthea-threaded', 1);
    expect(r.kind).toBe('orphan');
  });

  it('STOP-parses (throws, never silent-skips) on a malformed row', () => {
    expect(() => mapProcedureRow(row('', '40701008'), IDX, PMAP, 'demo-synthea-threaded', 1))
      .toThrow(MalformedProcedureRowError); // empty PATIENT
    expect(() => mapProcedureRow(row('P1', ''), IDX, PMAP, 'demo-synthea-threaded', 1))
      .toThrow(MalformedProcedureRowError); // empty CODE
    expect(() => mapProcedureRow(['too', 'few'], IDX, PMAP, 'demo-synthea-threaded', 1))
      .toThrow(MalformedProcedureRowError); // cell count shorter than required columns
  });
});

describe('resolveBuildSha (execution-vehicle fidelity emit)', () => {
  it('returns APP_GIT_SHA when the image build populated it', () => {
    expect(resolveBuildSha({ APP_GIT_SHA: 'abc1234' } as NodeJS.ProcessEnv)).toBe('abc1234');
  });
  it("falls back to 'dev' when unset (local build passes no build-arg)", () => {
    expect(resolveBuildSha({} as NodeJS.ProcessEnv)).toBe('dev');
    expect(resolveBuildSha({ APP_GIT_SHA: '' } as NodeJS.ProcessEnv)).toBe('dev');
  });
});

describe('non-progress tripwire guards (AUDIT-115/016)', () => {
  it('assertTenantPopulated throws on an empty patient map, passes otherwise', () => {
    expect(() => assertTenantPopulated(0, 'demo-synthea-threaded')).toThrow(/0 patients/);
    expect(() => assertTenantPopulated(25571, 'demo-synthea-threaded')).not.toThrow();
  });

  it('assertStreamProgress throws on 0 source rows read', () => {
    expect(() => assertStreamProgress({ sourceRows: 0, resolved: 0, inserted: 0, execute: false }))
      .toThrow(/0 source rows/);
  });

  it('assertStreamProgress throws on execute inserting 0 despite resolved rows', () => {
    expect(() => assertStreamProgress({ sourceRows: 100, resolved: 90, inserted: 0, execute: true }))
      .toThrow(/inserted 0 rows despite 90 resolved/);
  });

  it('assertStreamProgress passes: execute with inserts, dry-run with 0 inserts, and 0-resolved (all-orphan)', () => {
    expect(() => assertStreamProgress({ sourceRows: 100, resolved: 90, inserted: 90, execute: true })).not.toThrow();
    expect(() => assertStreamProgress({ sourceRows: 100, resolved: 90, inserted: 0, execute: false })).not.toThrow(); // dry-run never inserts
    expect(() => assertStreamProgress({ sourceRows: 100, resolved: 0, inserted: 0, execute: true })).not.toThrow(); // not the "despite resolved" case
  });
});

describe('processProcedureStream (integration invariant)', () => {
  // 6 data rows: 4 resolved distinct, 1 orphan, 1 in-CSV duplicate of row 1 (same natural key).
  const FIXTURE = [
    HEADER,
    '2020-01-01T00:00:00Z,,P1,E1,http://snomed.info/sct,40701008,Echocardiography,300,,',
    '2020-02-01T00:00:00Z,,P1,E2,http://snomed.info/sct,433236007,Transthoracic echo,300,,',
    '2020-03-01T00:00:00Z,,P2,E3,http://snomed.info/sct,105376000,Transesophageal echo,300,,',
    '2020-04-01T00:00:00Z,,PORPHAN,E4,http://snomed.info/sct,40701008,Echocardiography,300,,', // orphan
    '2020-01-01T00:00:00Z,,P1,E1,http://snomed.info/sct,40701008,Echocardiography,300,,',       // dup of row 1
    '2020-05-01T00:00:00Z,,P2,E5,http://snomed.info/sct,999999,Some other procedure,50,,',       // non-echo
  ];

  it('execute: inserted = source - orphans - collisions, with echo spot-counts', async () => {
    const w = new MemWriter();
    const res = await processProcedureStream(fromLines(FIXTURE), PMAP, 'demo-synthea-threaded', true, w);
    expect(res.sourceRows).toBe(6);
    expect(res.orphansDropped).toBe(1);
    expect(res.inCsvCollisions).toBe(1);
    expect(res.inserted).toBe(4); // 6 - 1 - 1
    expect(res.echoSnomed['40701008']).toBe(1); // the duplicate is dropped before the echo count
    expect(res.echoSnomed['433236007']).toBe(1);
    expect(res.echoSnomed['105376000']).toBe(1);
    expect(w.store.size).toBe(4);
  });

  it('dry-run: wouldInsert equals the resolved count and writes nothing', async () => {
    const w = new MemWriter();
    const res = await processProcedureStream(fromLines(FIXTURE), PMAP, 'demo-synthea-threaded', false, w);
    expect(res.inserted).toBe(4);
    expect(w.store.size).toBe(0); // dry-run never calls the writer
  });

  it('is idempotent: a second execute pass against the same store inserts 0', async () => {
    const w = new MemWriter();
    const first = await processProcedureStream(fromLines(FIXTURE), PMAP, 'demo-synthea-threaded', true, w);
    expect(first.inserted).toBe(4);
    const second = await processProcedureStream(fromLines(FIXTURE), PMAP, 'demo-synthea-threaded', true, w);
    expect(second.inserted).toBe(0); // deterministic key + skipDuplicates -> no re-insert
    expect(w.store.size).toBe(4);
  });
});
