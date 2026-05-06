/**
 * Key Rotation Service — AUDIT-016 implementation
 *
 * Status (2026-05-07):
 *   - PR 1 (this PR) — V0/V1 envelope detection + V1 emission for new writes;
 *     AUDIT-017 PHI_ENCRYPTION_KEY validation bundled (D4).
 *   - PR 2 (pending) — kmsService wiring (V2 envelope emission, KMS-wrapped DEK).
 *   - PR 3 (pending) — migrateRecord() + background re-encryption job.
 *
 * Design source of truth: docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md
 *   Note: design doc §5 was revised inline 2026-05-07 to V0/V1/V2 schema (was
 *   single-V1 with placeholder wrappedDEK). Driver: §17.1 consumer audit during
 *   PR 1 implementation flagged signal-shape-honesty problem with placeholder
 *   wrappedDEK. Fifth §17.1 architectural-precedent finding of the arc.
 *
 * Backwards-compat contract (PR 1):
 *   - All existing V0 ciphertext continues to decrypt without modification
 *   - New writes emit V1
 *   - Mixed-state queries (V0 + V1 in same result set) decrypt cleanly per-row
 *   - AUDIT-015 fail-loud invariants preserved on both V0 and V1 paths
 *   - PHI_LEGACY_PLAINTEXT_OK gate preserved (in phiEncryption.ts caller)
 *
 * Cross-references:
 *   - AUDIT-016 register entry — docs/audit/AUDIT_FINDINGS_REGISTER.md
 *   - AUDIT-017 register entry — RESOLVED 2026-05-07 (validateKeyOrThrow + module init)
 *   - AUDIT-015 fail-loud pattern — backend/src/middleware/phiEncryption.ts
 *   - AUDIT-022 migration filter compatibility — verified (both V0 and V1 match `enc:%`)
 *   - HIPAA §164.312(a)(2)(iv) — addressable encryption/decryption implementation spec
 *   - kmsService.ts — fully implemented; PR 2 wires this for V2 envelope emission
 *   - envelopeFormat.ts — pure parse/build utilities; sister module to this one
 */

import crypto from 'crypto';
import {
  parseEnvelope,
  buildV1,
  EnvelopeFormatError,
  type Envelope,
  type EnvelopeV0,
  type EnvelopeV1,
  type EnvelopeV2,
  type KeyVersion,
} from './envelopeFormat';

// Re-export envelope types so existing consumers (keyRotation.test.ts) don't
// need to update their imports. envelopeFormat.ts is the canonical home.
export type { Envelope, EnvelopeV0, EnvelopeV1, EnvelopeV2, KeyVersion };
export { EnvelopeFormatError };

// ── Constants ───────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const EXPECTED_KEY_HEX_LENGTH = 64;        // 256-bit AES key = 32 bytes = 64 hex chars
const HEX_REGEX = /^[0-9a-fA-F]+$/;

// ── Stub error (rotateKey + migrateRecord still throw) ──────────────────────

/**
 * Thrown when `rotateKey()` or `migrateRecord()` is called during the design
 * phase. Replaced by real implementations in AUDIT-016 PR 2 + PR 3.
 *
 * Design source: docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md §10
 */
export class DesignPhaseStubError extends Error {
  constructor(operation: string) {
    super(
      `AUDIT-016 design phase: ${operation} is not yet implemented. ` +
      `See docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md §10 for the 3-PR ` +
      `implementation plan. PR 1 ships envelope format + V1 emission; PR 2 ships ` +
      `KMS wiring (V2 emission); PR 3 ships rotateKey + migrateRecord implementations.`,
    );
    this.name = 'DesignPhaseStubError';
  }
}

// ── AUDIT-017 — PHI_ENCRYPTION_KEY validation (bundled per D4) ─────────────

/**
 * Thrown when PHI_ENCRYPTION_KEY is missing, wrong-length, or non-hex.
 * Sister to AUDIT-015 fail-loud pattern: caller never proceeds with invalid
 * key material; throw propagates so deployment fails fast at startup.
 */
export class KeyValidationError extends Error {
  constructor(reason: string) {
    super(`PHI_ENCRYPTION_KEY validation failed: ${reason}`);
    this.name = 'KeyValidationError';
  }
}

/**
 * Validate PHI_ENCRYPTION_KEY material per AUDIT-017.
 *
 * Requirements (HIPAA §164.312(a)(2)(iv) + NIST FIPS 197 AES-256):
 *   - Must be set (non-empty string)
 *   - Must be 64 hex characters (32 bytes / 256-bit AES key)
 *   - Must contain only hex characters [0-9a-fA-F]
 *
 * @throws KeyValidationError on any invariant violation
 */
export function validateKeyOrThrow(key: string | undefined): asserts key is string {
  if (!key) {
    throw new KeyValidationError(
      'key is not set (required for AES-256-GCM encryption per HIPAA §164.312(a)(2)(iv))',
    );
  }
  if (key.length !== EXPECTED_KEY_HEX_LENGTH) {
    throw new KeyValidationError(
      `key length is ${key.length} chars; expected ${EXPECTED_KEY_HEX_LENGTH} hex chars (256-bit AES key per NIST FIPS 197)`,
    );
  }
  if (!HEX_REGEX.test(key)) {
    throw new KeyValidationError(
      `key contains non-hex characters; expected ${EXPECTED_KEY_HEX_LENGTH} hex chars`,
    );
  }
}

// Cache validation result so we only re-validate when env changes.
let _validatedKey: string | null = null;
let _validatedFor: string | undefined = undefined;

function ensureValidatedKey(): string {
  const env = process.env.PHI_ENCRYPTION_KEY;
  if (_validatedKey !== null && _validatedFor === env) {
    return _validatedKey;
  }
  validateKeyOrThrow(env);
  _validatedKey = env;
  _validatedFor = env;
  return env;
}

/** Test helper — clear validation cache so env-mutating tests re-validate. */
export function _resetKeyValidationCacheForTests(): void {
  _validatedKey = null;
  _validatedFor = undefined;
}

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Encryption context for KMS calls — narrows access scope and provides audit trail.
 * Per `kmsService.ts` existing pattern: { service: 'tailrd-backend', purpose: 'phi-encryption' }
 *
 * Per-record propagation extension (added in PR 2): includes model + field name
 * so an attacker with cross-context decrypt access cannot redirect ciphertext
 * between fields.
 */
export interface EncryptionContext {
  readonly service: string;
  readonly purpose: string;
  readonly model?: string;
  readonly field?: string;
}

/** Result of a single record migration (V0 / V1 → V2). PR 3 implements migrateRecord(). */
export interface MigrationResult {
  readonly recordId: string;
  readonly table: string;
  readonly fromVersion: KeyVersion;
  readonly toVersion: KeyVersion;
  readonly fieldsConverted: number;
  readonly skipped: boolean;
  readonly migratedAt: Date;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext, emit V1 envelope.
 *
 * Single-key AES-256-GCM with PHI_ENCRYPTION_KEY. Caller-supplied
 * EncryptionContext is currently unused by V1 path; PR 2 propagates context
 * into KMS GenerateDataKey for V2 emission.
 *
 * @throws KeyValidationError if PHI_ENCRYPTION_KEY is invalid
 */
export async function encryptWithCurrent(
  plaintext: string,
  _context: EncryptionContext,
): Promise<string> {
  const keyHex = ensureValidatedKey();
  const keyBuf = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return buildV1(iv.toString('hex'), authTag, encrypted);
}

/**
 * Decrypt any envelope version. Routes V0 + V1 through single-key AES-256-GCM
 * with PHI_ENCRYPTION_KEY. V2 routing throws DesignPhaseStubError until PR 2
 * ships kmsService wiring.
 *
 * Fail-loud per AUDIT-015 pattern: malformed envelope (EnvelopeFormatError),
 * integrity check failure (auth-tag mismatch), or unsupported envelope version
 * all throw with explicit context. Caller never silently receives ciphertext.
 *
 * @throws EnvelopeFormatError on malformed envelope
 * @throws Error wrapped with `cause` on integrity check failure
 * @throws DesignPhaseStubError on V2 envelope (PR 2 lands V2 decrypt)
 * @throws KeyValidationError if PHI_ENCRYPTION_KEY is invalid
 */
export async function decryptAny(
  envelope: string,
  _context: EncryptionContext,
): Promise<string> {
  const parsed: Envelope = parseEnvelope(envelope);

  if (parsed.version === 'v0' || parsed.version === 'v1') {
    return decryptSingleKey(parsed, envelope);
  }

  // V2 — KMS-wrapped DEK; PR 2 wires kmsService.envelopeDecrypt.
  throw new DesignPhaseStubError(
    `decryptAny() V2 path (envelope version: ${parsed.version}; ships in AUDIT-016 PR 2)`,
  );
}

/**
 * Internal — V0/V1 single-key AES-256-GCM decrypt path.
 * Both V0 and V1 use the same key material (PHI_ENCRYPTION_KEY); the only
 * difference is the envelope's serialized layout (V0 untagged vs V1 versioned).
 */
function decryptSingleKey(parsed: EnvelopeV0 | EnvelopeV1, originalEnvelope: string): string {
  const keyHex = ensureValidatedKey();
  const keyBuf = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(parsed.iv, 'hex');
  const authTag = Buffer.from(parsed.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(authTag);
  try {
    let decrypted = decipher.update(parsed.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    // AUDIT-015 fail-loud — wrap with explicit context preserving envelope version.
    const wrapped: any = new Error(
      `PHI decryption: integrity check failed (envelope=${parsed.version}; ${err?.message || 'auth tag mismatch'})`,
    );
    wrapped.cause = err;
    wrapped.envelopeVersion = parsed.version;
    wrapped.envelopePreview = originalEnvelope.slice(0, 32);
    throw wrapped;
  }
}

// ── Stub functions (PR 2 + PR 3) ────────────────────────────────────────────

/**
 * Trigger key rotation. PR 3 implements; throws stub error in PR 1.
 *
 * @throws DesignPhaseStubError until AUDIT-016 PR 3 lands
 */
export async function rotateKey(): Promise<KeyVersion> {
  throw new DesignPhaseStubError('rotateKey()');
}

/**
 * Migrate a single record's PHI fields from V0 / V1 to V2 envelope.
 * PR 3 implements; throws stub error in PR 1 + PR 2.
 *
 * @throws DesignPhaseStubError until AUDIT-016 PR 3 lands
 */
export async function migrateRecord(
  _recordId: string,
  _table: string,
): Promise<MigrationResult> {
  throw new DesignPhaseStubError('migrateRecord()');
}
