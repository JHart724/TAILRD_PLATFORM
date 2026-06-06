/**
 * AUDIT-113 patient PHI decrypt blast-radius probe - unit tests.
 *
 * Mirrors the audit-016-pr3-step-1-7-firstname-provenance.test.ts +
 * audit-016-pr3-v2-rekey-purpose.test.ts precedent:
 *   - prisma + logger mocked at module level (no real Prisma/Winston init)
 *   - decryptAny + the client are dependency-injected into the unit under test
 *     (classifyField / probeRecordViaRealClient), so no crypto / AWS / DB runs
 *
 * Test scope:
 *   T1 parseArgs: defaults + validation throws (batch / pause / limit / unknown)
 *   T2 classifyField envelope classification:
 *        absent / canonical-ok / non-canonical-purpose / wrong-key-or-context /
 *        corrupted-integrity / unparseable
 *   T3 probeRecordViaRealClient: success -> null; throw -> captured name+message
 *        +category; long message truncated
 *   T4 PHI discipline: classifyField returns METADATA ONLY (no plaintext leaks)
 *   T5 constants: TARGET_FIELDS = the 4 worklist PHI fields; MODULES = the 6
 *        route predicates with correct enums
 *
 * PHI in tests: synthetic non-PHI fixtures only ("enc:v2:w:i:t:c", "boom"); no
 * Synthea-realistic patterns; no real PHI.
 */

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: { $queryRawUnsafe: jest.fn(), $disconnect: jest.fn(), patient: { findFirst: jest.fn(), findMany: jest.fn() }, hospital: { findMany: jest.fn() } },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import {
  parseArgs,
  classifyField,
  probeRecordViaRealClient,
  TARGET_FIELDS,
  MODULES,
  type TargetField,
} from '../../../scripts/migrations/audit-113-patient-phi-decrypt-blast-radius';

// A parseable synthetic V2 envelope (6 colon-parts; no real crypto material).
const V2 = 'enc:v2:wrapped:iv:tag:ciphertext';

function mkCounters() { return { secondaryProbes: 0 }; }

describe('AUDIT-113 probe - parseArgs (T1)', () => {
  it('defaults', () => {
    expect(parseArgs([])).toEqual({ batch: 500, pauseMs: 100, resumeHospital: undefined, afterId: undefined, limitPerHospital: undefined });
  });
  it('parses all flags', () => {
    expect(parseArgs(['--batch', '250', '--pause-ms', '50', '--resume-hospital', 'h1', '--after-id', 'p9', '--limit-per-hospital', '10']))
      .toEqual({ batch: 250, pauseMs: 50, resumeHospital: 'h1', afterId: 'p9', limitPerHospital: 10 });
  });
  it.each([
    ['--batch', '0'], ['--batch', '99999'], ['--batch', 'x'],
    ['--pause-ms', '-1'], ['--pause-ms', 'y'],
    ['--limit-per-hospital', '0'],
  ])('throws on invalid %s %s', (flag, val) => {
    expect(() => parseArgs([flag, val])).toThrow();
  });
  it('throws on unknown arg', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
  });
});

describe('AUDIT-113 probe - classifyField envelope classification (T2)', () => {
  const okDecrypt = async () => 'PLAINTEXT-NEVER-LOGGED';

  it('absent value -> canonical-ok / absent version, no decrypt attempted', async () => {
    const c = mkCounters();
    const r = await classifyField('mrn', null, okDecrypt, c);
    expect(r.envelopeClass).toBe('canonical-ok');
    expect(r.envelopeVersion).toBe('absent');
    expect(c.secondaryProbes).toBe(0);
  });

  it('canonical decrypt succeeds -> canonical-ok (a non-failing field)', async () => {
    const r = await classifyField('lastName', V2, okDecrypt, mkCounters());
    expect(r.envelopeClass).toBe('canonical-ok');
    expect(r.envelopeVersion).toBe('v2');
    expect(r.canonicalErrorName).toBeNull();
  });

  it('canonical fails, alternate purpose succeeds -> non-canonical-purpose', async () => {
    // reject canonical (phi-encryption); resolve any other purpose
    const decrypt = async (_e: string, ctx: { purpose: string }) => {
      if (ctx.purpose === 'phi-encryption') throw Object.assign(new Error('InvalidCiphertextException'), { name: 'InvalidCiphertextException' });
      return 'ok-under-migration';
    };
    const r = await classifyField('firstName', V2, decrypt, mkCounters());
    expect(r.envelopeClass).toBe('non-canonical-purpose:phi-migration-v0v1-to-v2');
    expect(r.canonicalCategory).toBe('InvalidCiphertextException');
  });

  it('canonical + all purposes fail (non-integrity) -> wrong-key-or-context', async () => {
    const decrypt = async () => { throw Object.assign(new Error('AccessDeniedException'), { name: 'AccessDeniedException' }); };
    const r = await classifyField('dateOfBirth', V2, decrypt, mkCounters());
    expect(r.envelopeClass).toBe('wrong-key-or-context');
    expect(r.canonicalCategory).toBe('AccessDeniedException');
  });

  it('canonical + all purposes fail (integrity) -> corrupted-or-unparseable', async () => {
    const decrypt = async () => { throw new Error('PHI decryption: integrity check failed (v2)'); };
    const r = await classifyField('mrn', V2, decrypt, mkCounters());
    expect(r.envelopeClass).toBe('corrupted-or-unparseable');
    expect(r.canonicalCategory).toBe('IntegrityCheckFailed');
  });

  it('unparseable envelope + decrypt fails -> corrupted-or-unparseable (no alt-purpose probing)', async () => {
    const decrypt = jest.fn(async () => { throw new Error('boom'); });
    const r = await classifyField('mrn', 'not-an-envelope', decrypt, mkCounters());
    expect(r.envelopeVersion).toBe('unparseable');
    expect(r.envelopeClass).toBe('corrupted-or-unparseable');
    // canonical attempt only - alternate purposes are NOT probed when unparseable
    expect(decrypt).toHaveBeenCalledTimes(1);
  });
});

describe('AUDIT-113 probe - probeRecordViaRealClient (T3)', () => {
  it('clean decrypt -> null (no error captured)', async () => {
    const client = { patient: { findFirst: async () => ({ firstName: 'x', lastName: 'y', mrn: 'z', dateOfBirth: 'd' }) } };
    expect(await probeRecordViaRealClient(client, 'p1', 'h1')).toBeNull();
  });

  it('decrypt throw -> captured name + category, message truncated to <= 215 chars', async () => {
    const long = 'E'.repeat(500);
    const client = { patient: { findFirst: async () => { throw Object.assign(new Error(long), { name: 'UnknownError' }); } } };
    const r = await probeRecordViaRealClient(client, 'p1', 'h1');
    expect(r).not.toBeNull();
    expect(r!.name).toBe('UnknownError');
    expect(r!.category).toBe('UnknownError');
    expect(r!.message.length).toBeLessThanOrEqual(215); // 200 + "...[truncated]"
    expect(r!.message.endsWith('[truncated]')).toBe(true);
  });
});

describe('AUDIT-113 probe - PHI discipline (T4)', () => {
  it('classifyField result carries metadata only - no plaintext key', async () => {
    const okDecrypt = async () => 'SUPER-SECRET-PLAINTEXT';
    const r = await classifyField('firstName', V2, okDecrypt, mkCounters());
    const keys = Object.keys(r).sort();
    expect(keys).toEqual(['canonicalCategory', 'canonicalErrorMessage', 'canonicalErrorName', 'envelopeClass', 'envelopeVersion', 'field'].sort());
    expect(JSON.stringify(r)).not.toContain('SUPER-SECRET-PLAINTEXT');
  });
});

describe('AUDIT-113 probe - constants (T5)', () => {
  it('TARGET_FIELDS = the 4 worklist-selected PHI fields', () => {
    expect([...TARGET_FIELDS]).toEqual(['firstName', 'lastName', 'mrn', 'dateOfBirth'] as TargetField[]);
  });
  it('MODULES = the 6 route predicates with correct flag + enum', () => {
    expect(MODULES.map((m) => m.key)).toEqual([
      'heart-failure', 'electrophysiology', 'structural-heart',
      'coronary-intervention', 'valvular-disease', 'peripheral-vascular',
    ]);
    expect(MODULES.find((m) => m.key === 'coronary-intervention')).toMatchObject({ flag: 'coronaryPatient', module: 'CORONARY_INTERVENTION' });
    expect(MODULES.find((m) => m.key === 'heart-failure')).toMatchObject({ flag: 'heartFailurePatient', module: 'HEART_FAILURE' });
  });
});
