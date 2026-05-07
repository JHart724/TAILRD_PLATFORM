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
  buildV2,
  EnvelopeFormatError,
  type Envelope,
  type EnvelopeV0,
  type EnvelopeV1,
  type EnvelopeV2,
  type KeyVersion,
} from './envelopeFormat';
import { envelopeEncrypt, envelopeDecrypt } from './kmsService';

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

// ── AUDIT-016 PR 2 — V2 envelope config validation ─────────────────────────

/**
 * Thrown when V2 envelope emission config is misconfigured at startup.
 * Sister to KeyValidationError pattern. Fail-fast at module init prevents
 * inconsistent runtime state where some emit paths use V2 and others V1.
 *
 * Common causes:
 *   - PHI_ENVELOPE_VERSION=v2 set but AWS_KMS_PHI_KEY_ALIAS not set
 *   - PHI_ENVELOPE_VERSION set to an unrecognized value (e.g., 'v3')
 */
export class EnvelopeConfigError extends Error {
  constructor(reason: string) {
    super(`V2 envelope config invalid: ${reason}`);
    this.name = 'EnvelopeConfigError';
  }
}

/**
 * Validate envelope-emission configuration at module init.
 *
 * Default (PHI_ENVELOPE_VERSION unset OR 'v1'): no-op; V1 emission path used.
 *
 * V2 opt-in (PHI_ENVELOPE_VERSION='v2'): requires AWS_KMS_PHI_KEY_ALIAS to be
 * set. Fails fast otherwise per D3 (explicit gating + AUDIT-013 sister
 * fail-closed pattern).
 *
 * @throws EnvelopeConfigError on misconfiguration
 */
export function validateEnvelopeConfigOrThrow(env: NodeJS.ProcessEnv = process.env): void {
  const version = env.PHI_ENVELOPE_VERSION;
  if (version === undefined || version === '' || version === 'v1') return;
  if (version === 'v2') {
    if (!env.AWS_KMS_PHI_KEY_ALIAS) {
      throw new EnvelopeConfigError(
        'PHI_ENVELOPE_VERSION=v2 requires AWS_KMS_PHI_KEY_ALIAS to be set. ' +
        'Either set AWS_KMS_PHI_KEY_ALIAS (alias or ARN) or unset PHI_ENVELOPE_VERSION to fall back to V1.',
      );
    }
    return;
  }
  throw new EnvelopeConfigError(
    `PHI_ENVELOPE_VERSION must be 'v1' (default) or 'v2'; got: '${version}'`,
  );
}

/**
 * Determine whether `encryptWithCurrent` should emit V2 envelopes for the
 * current process. Reads env at call time so deployment env flips take
 * effect on the next encrypt without process restart (sister to
 * `auth.ts isMfaEnforced` pattern).
 */
function shouldEmitV2(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PHI_ENVELOPE_VERSION === 'v2' && Boolean(env.AWS_KMS_PHI_KEY_ALIAS);
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

/**
 * Result of a single (record, column) migration (V0 / V1 → V2).
 *
 * AUDIT-016 PR 3 (2026-05-07): signature extended from `(recordId, table)` (PR 1
 * committed shape) to `(recordId, table, column, context)`. The column-narrowing
 * additive change is required because migration operates on (table, column)
 * pairs — multiple PHI columns per row are migrated independently with
 * per-column EncryptionContext for HIPAA audit-trail anchor.
 *
 * Zero PR 1/PR 2 callers per inventory; signature extension is non-breaking.
 */
export interface MigrationResult {
  readonly recordId: string;
  readonly table: string;
  readonly column: string;
  readonly fromVersion: KeyVersion;
  readonly toVersion: KeyVersion;
  readonly fieldsConverted: number;
  readonly skipped: boolean;
  readonly migratedAt: Date;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext, emit current envelope version.
 *
 * Routing (per AUDIT-016 PR 2 D3 explicit gating):
 *   - PHI_ENVELOPE_VERSION='v2' AND AWS_KMS_PHI_KEY_ALIAS set → V2 emission
 *     via kmsService.envelopeEncrypt (KMS-wrapped DEK + per-record
 *     EncryptionContext for HIPAA audit-trail anchor)
 *   - else → V1 emission (single-key AES-256-GCM with PHI_ENCRYPTION_KEY;
 *     default; backwards-compat)
 *
 * @throws KeyValidationError if PHI_ENCRYPTION_KEY is invalid (V1 path)
 * @throws when KMS unreachable (V2 path; strict fail-loud per D4 — no V1 fallback)
 */
export async function encryptWithCurrent(
  plaintext: string,
  context: EncryptionContext,
): Promise<string> {
  if (shouldEmitV2()) {
    return encryptV2(plaintext, context);
  }
  return encryptV1(plaintext);
}

/**
 * V1 emission path (single-key AES-256-GCM with PHI_ENCRYPTION_KEY).
 * Internal — invoked when V2 gating is not satisfied (default).
 */
function encryptV1(plaintext: string): string {
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
 * V2 emission path (KMS envelope encryption with per-record context).
 * Bridges kmsService's object-shape result → envelopeFormat colon-delimited V2 string.
 */
async function encryptV2(plaintext: string, context: EncryptionContext): Promise<string> {
  const result = await envelopeEncrypt(plaintext, context);
  return buildV2(result.encryptedDataKey, result.iv, result.authTag, result.ciphertext);
}

/**
 * Decrypt any envelope version.
 *
 * Routing:
 *   - V0 + V1 → single-key AES-256-GCM with PHI_ENCRYPTION_KEY
 *   - V2 → kmsService.envelopeDecrypt with the same EncryptionContext
 *     supplied at encrypt time (KMS rejects on context mismatch)
 *
 * **Decrypt is NOT gated by `PHI_ENVELOPE_VERSION` flag** (per design note §2):
 * once V2 ciphertext exists in production, decryption must succeed regardless
 * of whether emission has been disabled (rollback safety).
 *
 * Fail-loud per AUDIT-015 pattern: malformed envelope, integrity check
 * failure, KMS rejection (network / KeyNotFound / AccessDenied / ContextMismatch)
 * all throw with explicit context. Caller never silently receives ciphertext.
 *
 * @throws EnvelopeFormatError on malformed envelope
 * @throws Error wrapped with `cause` on integrity check failure (V0 / V1)
 * @throws when KMS unreachable or rejects (V2)
 * @throws KeyValidationError if PHI_ENCRYPTION_KEY is invalid (V0 / V1)
 */
export async function decryptAny(
  envelope: string,
  context: EncryptionContext,
): Promise<string> {
  const parsed: Envelope = parseEnvelope(envelope);

  if (parsed.version === 'v0' || parsed.version === 'v1') {
    return decryptSingleKey(parsed, envelope);
  }

  // V2 — KMS-wrapped DEK. Bridge envelope object-fields → kmsService input shape.
  return envelopeDecrypt(
    {
      ciphertext: parsed.ciphertext,
      encryptedDataKey: parsed.wrappedDEK,
      iv: parsed.iv,
      authTag: parsed.authTag,
    },
    context,
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

// ── rotateKey — deferred per AUDIT-016 PR 3 D9 ───────────────────────────────

/**
 * Trigger ongoing key rotation policy (KEK or PHI_ENCRYPTION_KEY material per
 * NIST SP 800-57 365-day cryptoperiod).
 *
 * Deferred: AUDIT-016 PR 3 migrates V0/V1 envelope → V2 envelope (envelope-
 * format upgrade); `rotateKey()` implements KEK / key-material rotation policy
 * and is **out of PR 3 scope**. Will be implemented when ongoing-rotation
 * policy is operationalized — likely a future PR (possibly AUDIT-016 PR 4 or
 * a dedicated AUDIT-XXX) once the operator-side rotation cadence + key-version
 * tracking schema land.
 *
 * Stub remains because the signature is committed contract; consumers can
 * import the symbol now and the implementation lands later without breakage.
 *
 * @throws DesignPhaseStubError until ongoing key rotation policy is implemented
 */
export async function rotateKey(): Promise<KeyVersion> {
  throw new DesignPhaseStubError('rotateKey()');
}

// ── migrateRecord — AUDIT-016 PR 3 implementation ───────────────────────────

/**
 * Migrate a single record's PHI column from V0 / V1 to V2 envelope.
 *
 * Flow:
 *   1. Caller supplies the existing column value (already filtered by
 *      `LIKE 'enc:%' AND NOT LIKE 'enc:v2:%'` at the migration script's SQL
 *      discovery layer — this function does NOT re-fetch the value).
 *   2. `parseEnvelope` discriminates V0 / V1 / V2.
 *   3. If V2: log race-protected skip (per AUDIT-016 PR 3 D3) and return
 *      `skipped: true` with NO DB write. (Race protection: a concurrent writer
 *      could have V2-encrypted between SQL fetch and this call.)
 *   4. Else: `decryptAny` (V0/V1 single-key local AES path) → `encryptWithCurrent`
 *      (V2 emit path; KMS-wrapped DEK via kmsService) → raw SQL UPDATE bypassing
 *      `applyPHIEncryption` middleware (which would double-encrypt the V2
 *      envelope).
 *
 * Raw SQL UPDATE rationale (eighth §17.1 architectural-precedent of the arc):
 *   `prisma.<model>.update({ data: { <col>: v2envelope } })` would re-route
 *   through `applyPHIEncryption.$use`, encrypting the already-encrypted V2
 *   envelope and producing double-wrapped corruption. `$executeRawUnsafe` with
 *   parameterized id + ciphertext bypasses the middleware. table + column come
 *   from the migration script's hardcoded TARGETS allow-list (compile-time
 *   constants), NOT user input — zero SQL injection surface.
 *
 * V2-input no-op write discipline (D3):
 *   When parseEnvelope returns V2, the function returns immediately with
 *   `skipped: true`. NO DB UPDATE is issued (writes pollute audit trail and
 *   waste KMS calls). Sister to AUDIT-022 idempotency pattern.
 *
 * @param recordId  primary-key id of the record to migrate
 * @param table     table name (from hardcoded TARGETS allow-list)
 * @param column    column name (from hardcoded TARGETS allow-list)
 * @param context   per-record EncryptionContext for KMS audit-trail anchor
 *                  (HIPAA §164.312(b) CloudTrail kms:Decrypt event payload)
 * @param prismaClient  Prisma client with `$executeRawUnsafe` — caller-injected
 *                      to keep the function pure-function-testable
 * @param currentValue  current column value (already encrypted; supplied by caller)
 *
 * @throws EnvelopeFormatError on malformed envelope
 * @throws Error wrapped on integrity check failure
 * @throws when KMS unreachable (V2 emit; no V1 fallback per D4)
 * @throws when SQL UPDATE fails (caller's responsibility to record + continue)
 */
export async function migrateRecord(
  recordId: string,
  table: string,
  column: string,
  context: EncryptionContext,
  prismaClient: { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number> },
  currentValue: string,
): Promise<MigrationResult> {
  const migratedAt = new Date();
  const parsed: Envelope = parseEnvelope(currentValue);

  // V2-input race protection: caller's SQL filter excluded V2, but a concurrent
  // writer between fetch and this call could have V2-encrypted. Skip-and-log
  // with NO DB write per D3.
  if (parsed.version === 'v2') {
    return {
      recordId,
      table,
      column,
      fromVersion: 'v2',
      toVersion: 'v2',
      fieldsConverted: 0,
      skipped: true,
      migratedAt,
    };
  }

  // V0/V1 → V2 path. decryptAny handles both V0 untagged and V1 versioned
  // single-key envelopes via the local AES-256-GCM path with PHI_ENCRYPTION_KEY.
  const plaintext = await decryptAny(currentValue, context);

  // encryptWithCurrent dispatches V2 emit when shouldEmitV2(env) is true
  // (PHI_ENVELOPE_VERSION=v2 AND AWS_KMS_PHI_KEY_ALIAS set). Migration script's
  // pre-flight verifies these env vars before the run starts.
  const v2envelope = await encryptWithCurrent(plaintext, context);

  // Defense-in-depth: verify the just-emitted envelope is actually V2. If env
  // gating fell back to V1 (PHI_ENVELOPE_VERSION unset mid-run), refuse to
  // write — would migrate V0/V1 → V1 instead of V2, defeating the migration.
  const emitted: Envelope = parseEnvelope(v2envelope);
  if (emitted.version !== 'v2') {
    throw new Error(
      `migrateRecord: encryptWithCurrent did not emit V2 envelope (got ${emitted.version}). ` +
      `Verify PHI_ENVELOPE_VERSION=v2 and AWS_KMS_PHI_KEY_ALIAS are set before --execute.`,
    );
  }

  // Raw SQL UPDATE bypasses applyPHIEncryption middleware. table + column come
  // from compile-time constants in the migration script TARGETS array; recordId
  // + v2envelope are parameterized via $executeRawUnsafe positional args.
  await prismaClient.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`,
    v2envelope,
    recordId,
  );

  return {
    recordId,
    table,
    column,
    fromVersion: parsed.version,
    toVersion: 'v2',
    fieldsConverted: 1,
    skipped: false,
    migratedAt,
  };
}
