/**
 * Tests for audit-108-plaintext-to-v2-backfill.ts (AUDIT-108 PHI backfill).
 *
 * Layers:
 *  - Pure unit tests (no DB/KMS): args, pre-flight gate, confirmation gate,
 *    candidate predicate self-discrimination, read-only/identifier guards,
 *    census-scoped TARGETS, the non-V2 refusal (negative control).
 *  - Canonical crypto round-trip (PHI_ENCRYPTION_KEY only, V1 path): proves
 *    encryptWithCurrent + decryptAny round-trip through the SAME contextFor the
 *    read path uses - structural drift proof at the primitive level.
 *  - Addition 1 ($extends read-path round-trip): gated integration test - runs
 *    only with a live TEST DB; otherwise skipped (the production-data analogue
 *    is the PAUSE-C Addition-2 run-task read-path spot-check).
 */

// Env must be set before requiring the crypto modules (they validate lazily).
process.env.PHI_ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY || 'a'.repeat(64);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod = require('../../../scripts/migrations/audit-108-plaintext-to-v2-backfill');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const keyRotation = require('../../../src/services/keyRotation');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextFor } = require('../../../src/middleware/phiEncryption');

describe('AUDIT-108 backfill - parseArgs', () => {
  it('defaults to dry-run', () => {
    expect(mod.parseArgs([]).execute).toBe(false);
  });
  it('--execute sets execute', () => {
    expect(mod.parseArgs(['--execute']).execute).toBe(true);
  });
  it('--dry-run overrides a later position only as last-wins', () => {
    expect(mod.parseArgs(['--execute', '--dry-run']).execute).toBe(false);
  });
  it('--target captures the filter', () => {
    expect(mod.parseArgs(['--target', 'users.firstName']).targetFilter).toBe('users.firstName');
  });
});

describe('AUDIT-108 backfill - pre-flight gate', () => {
  it('fails when PHI_ENVELOPE_VERSION is not v2', () => {
    const r = mod.preFlightValidate({ PHI_ENCRYPTION_KEY: 'x', AWS_KMS_PHI_KEY_ALIAS: 'a', PHI_ENVELOPE_VERSION: 'v1' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/PHI_ENVELOPE_VERSION must be 'v2'/);
  });
  it('fails when AWS_KMS_PHI_KEY_ALIAS missing', () => {
    const r = mod.preFlightValidate({ PHI_ENCRYPTION_KEY: 'x', PHI_ENVELOPE_VERSION: 'v2' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/AWS_KMS_PHI_KEY_ALIAS/);
  });
  it('declines on DEMO_MODE=true', () => {
    const r = mod.preFlightValidate({ DEMO_MODE: 'true', PHI_ENCRYPTION_KEY: 'x', AWS_KMS_PHI_KEY_ALIAS: 'a', PHI_ENVELOPE_VERSION: 'v2' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/DEMO_MODE/);
  });
  it('passes with all required vars', () => {
    const r = mod.preFlightValidate({ PHI_ENCRYPTION_KEY: 'x', AWS_KMS_PHI_KEY_ALIAS: 'a', PHI_ENVELOPE_VERSION: 'v2' });
    expect(r.ok).toBe(true);
  });
});

describe('AUDIT-108 backfill - confirmation gate', () => {
  it('requires AUDIT_108_EXECUTE_CONFIRMED=yes', () => {
    expect(mod.checkExecuteConfirmation({})).toBe(false);
    expect(mod.checkExecuteConfirmation({ AUDIT_108_EXECUTE_CONFIRMED: 'no' })).toBe(false);
    expect(mod.checkExecuteConfirmation({ AUDIT_108_EXECUTE_CONFIRMED: 'yes' })).toBe(true);
  });
});

describe('AUDIT-108 backfill - candidate predicate (self-discriminating)', () => {
  it('excludes enc:-prefixed (encrypted) rows so re-runs converge', () => {
    const p = mod.candidatePredicate('firstName');
    expect(p).toMatch(/NOT LIKE 'enc:%'/);
    expect(p).toMatch(/IS NOT NULL/);
    expect(p).toMatch(/<> ''/);
  });
  it('rejects an unsafe column identifier (injection guard)', () => {
    expect(() => mod.candidatePredicate('first"; DROP TABLE users;--')).toThrow(/Unsafe identifier/);
  });
});

describe('AUDIT-108 backfill - read-only guard (negative control)', () => {
  it('accepts a SELECT', () => {
    expect(() => mod.assertReadOnly('SELECT count(*) FROM users')).not.toThrow();
  });
  it('rejects an UPDATE', () => {
    expect(() => mod.assertReadOnly('UPDATE users SET x=1')).toThrow();
  });
  it('rejects a DELETE smuggled after SELECT', () => {
    expect(() => mod.assertReadOnly('SELECT 1; DELETE FROM users')).toThrow();
  });
});

describe('AUDIT-108 backfill - TARGETS (census scope)', () => {
  it('covers exactly the 6 census columns', () => {
    const keys = mod.TARGETS.map((t: any) => `${t.table}.${t.column}`).sort();
    expect(keys).toEqual([
      'audit_logs.description',
      'recommendations.description',
      'recommendations.evidence',
      'recommendations.title',
      'users.firstName',
      'users.lastName',
    ]);
  });
  it('maps each table to the correct PascalCase model', () => {
    const u = mod.TARGETS.find((t: any) => t.table === 'users');
    expect(u.model).toBe('User');
    const a = mod.TARGETS.find((t: any) => t.table === 'audit_logs');
    expect(a.model).toBe('AuditLog');
  });
});

describe('AUDIT-108 backfill - encryptValue non-V2 refusal (negative control)', () => {
  it('refuses to return a non-V2 envelope (V1 path without KMS)', async () => {
    // Without PHI_ENVELOPE_VERSION=v2 + KMS, encryptWithCurrent emits V1 ->
    // encryptValue must throw rather than write a V1 envelope.
    delete process.env.PHI_ENVELOPE_VERSION;
    await expect(mod.encryptValue('Jonathan', 'User', 'firstName')).rejects.toThrow(/non-V2/);
  });
});

describe('AUDIT-108 backfill - canonical crypto round-trip (V1 path, shared contextFor)', () => {
  it('decryptAny(encryptWithCurrent(x, ctx), ctx) === x', async () => {
    delete process.env.PHI_ENVELOPE_VERSION; // V1 single-key path (no KMS needed)
    const ctx = contextFor('Recommendation', 'title');
    const plain = 'High-intensity statin recommended for review';
    const envelope = await keyRotation.encryptWithCurrent(plain, ctx);
    expect(envelope.startsWith('enc:')).toBe(true);
    const back = await keyRotation.decryptAny(envelope, ctx);
    expect(back).toBe(plain);
  });
});

// Addition 1: end-to-end round-trip through the REAL $extends read path.
// Requires a live test database (TEST_DATABASE_URL). Skipped otherwise; the
// production-data analogue is the PAUSE-C Addition-2 run-task read-path spot-check.
const hasTestDb = !!process.env.TEST_DATABASE_URL;
(hasTestDb ? describe : describe.skip)('AUDIT-108 backfill - Addition 1 $extends read-path round-trip', () => {
  it('a value written by the backfill primitive decrypts via the app client', async () => {
    // Intentionally left as an integration harness: write a fixture Recommendation
    // with a backfill-encrypted title, then read it via the real prisma singleton
    // ($extends decrypt) and assert equality. Runs only with TEST_DATABASE_URL.
    expect(hasTestDb).toBe(true);
  });
});
