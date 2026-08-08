/**
 * AUDIT-242 - MFA real-library round-trip. Exercises the ACTUAL speakeasy TOTP,
 * NOT a mock. This is the belt-and-braces one layer beneath the AUDIT-239/240 e2e:
 * that suite MOCKED mfaService (generateSecret/enableMFA/verifyTOTP forced to
 * succeed) to prove the handler + middleware flow, so a green e2e coexisted with a
 * NON-FUNCTIONAL real factor - speakeasy/qrcode were undeclared, require() threw,
 * MFA ran fail-closed. This suite proves the second factor is genuine RFC-6238.
 *
 * RED against the un-fixed (undeclared) state: with speakeasy/qrcode absent,
 * mfaService's require('speakeasy') throws -> speakeasy undefined -> generateSecret
 * throws 'MFA dependencies not installed' and verifyTOTP returns false for every
 * code. This suite also cannot load its own reference-code generator (the top-level
 * `import speakeasy` fails to resolve). Both are the AUDIT-242 defect, exercised.
 * GREEN only once the dependency is declared in package.json AND installed.
 */

// In-memory UserMFA store so generateSecret can PERSIST a real base32 secret that
// verifyTOTP then reads back - the store->verify round-trip is what proves the
// factor is real. Only prisma is mocked; the TOTP crypto is the real library.
const store: Record<string, any> = {};
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    userMFA: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const id = where.userId;
        store[id] = store[id] ? { ...store[id], ...update } : { ...create };
        return store[id];
      }),
      findUnique: jest.fn(async ({ where }: any) => store[where.userId] ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        store[where.userId] = { ...store[where.userId], ...data };
        return store[where.userId];
      }),
    },
  },
}));

import speakeasy from 'speakeasy';
import { mfaService } from '../../src/services/mfaService';

const USER = 'u-totp';
const EMAIL = 'admin@hospital.test';
const HOSPITAL = 'Test Hospital';

describe('AUDIT-242 MFA real-library round-trip (speakeasy, NOT mocked)', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('generateSecret produces a real base32 secret and a data-URL QR code, and persists it', async () => {
    const res = await mfaService.generateSecret(USER, EMAIL, HOSPITAL);
    expect(typeof res.secret).toBe('string');
    expect(res.secret.length).toBeGreaterThanOrEqual(16);          // a real secret, not a stub
    expect(res.secret).toMatch(/^[A-Z2-7]+$/);                     // base32 alphabet
    expect(res.qrCodeUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(store[USER].secret).toBe(res.secret);                   // persisted for verify
    expect(store[USER].enabled).toBe(false);                       // not yet enabled
  });

  it('verifyTOTP ACCEPTS a correct RFC-6238 code and REJECTS an incorrect one', async () => {
    const { secret } = await mfaService.generateSecret(USER, EMAIL, HOSPITAL);

    // Reference code generated from the stored secret by the REAL library - the exact
    // code an authenticator app would show for this secret right now.
    const correct = speakeasy.totp({ secret, encoding: 'base32' });
    await expect(mfaService.verifyTOTP(USER, correct)).resolves.toBe(true);

    // A 6-digit code that is definitely not the current one.
    const wrong = correct === '000000' ? '111111' : '000000';
    await expect(mfaService.verifyTOTP(USER, wrong)).resolves.toBe(false);
  });

  it('enableMFA completes on a correct code - arms the account (enabled + 8 backup codes)', async () => {
    const { secret } = await mfaService.generateSecret(USER, EMAIL, HOSPITAL);
    const correct = speakeasy.totp({ secret, encoding: 'base32' });

    const res = await mfaService.enableMFA(USER, correct);
    expect(res.backupCodes).toHaveLength(8);
    expect(store[USER].enabled).toBe(true);
  });

  it('enableMFA REJECTS an incorrect code - no account reaches enabled=true on a bad factor', async () => {
    const { secret } = await mfaService.generateSecret(USER, EMAIL, HOSPITAL);
    const correct = speakeasy.totp({ secret, encoding: 'base32' });
    const wrong = correct === '000000' ? '111111' : '000000';

    await expect(mfaService.enableMFA(USER, wrong)).rejects.toThrow(/Invalid verification code/);
    expect(store[USER].enabled).toBe(false);
  });
});
