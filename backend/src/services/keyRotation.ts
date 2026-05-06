/**
 * Key Rotation Service — DESIGN PHASE STUBS
 *
 * Interface stubs for AUDIT-016 PHI key rotation. All exported functions
 * throw `DesignPhaseStubError` when called.
 *
 * Implementation lands in 3 follow-up PRs per the design plan:
 *   - PR 1: Envelope format V0/V1 + version tag (~5-7h)
 *   - PR 2: phiEncryption ↔ kmsService wiring (~5-8h)
 *   - PR 3: Migration handler + background job (~4-7h)
 *
 * Design source of truth: docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md
 *
 * Operator decisions (2026-05-07):
 *   - Option B: AWS KMS (wire existing kmsService.ts; not currently consumed by phiEncryption)
 *   - Rotation cadence: 180-day app-layer DEK + 365-day AWS-layer KEK
 *   - Key custody: framework in design doc; specifics in operator runbook
 *   - Migration: background job + access-fallback; 30-day target completion window
 *
 * Cross-references:
 *   - AUDIT-016 register entry (HIGH P1) — docs/audit/AUDIT_FINDINGS_REGISTER.md
 *   - HIPAA §164.312(a)(2)(iv) — addressable encryption/decryption implementation spec
 *   - kmsService.ts — fully implemented, awaiting wiring in implementation PR 2
 *   - phiEncryption.ts — current single-key middleware; JSDoc updated this PR
 */

/**
 * Thrown when any keyRotation export is called during the design phase.
 * Implementation PRs will replace these stubs with real implementations.
 *
 * Design source: docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md
 */
export class DesignPhaseStubError extends Error {
  constructor(operation: string) {
    super(
      `AUDIT-016 design phase: ${operation} is not yet implemented. ` +
      `See docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md §10 for the 3-PR ` +
      `implementation plan. Status: DESIGN PHASE COMPLETE per AUDIT-016 register entry.`,
    );
    this.name = 'DesignPhaseStubError';
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Key version marker for ciphertext envelope.
 *
 * V0 = legacy (current production state): enc:<iv>:<authTag>:<ciphertext>
 *   - Single key sourced from process.env.PHI_ENCRYPTION_KEY
 *   - No version tag; no wrapped DEK
 *   - All current PHI rows in production are V0
 *
 * V1 = post-rotation deploy: enc:v1:<wrappedDEK>:<iv>:<authTag>:<ciphertext>
 *   - DEK generated per encrypt call via KMS GenerateDataKey
 *   - DEK wrapped by KMS-managed KEK
 *   - DEK never persisted in plaintext
 *
 * Future versions reserved:
 *   V2 = per-tenant DEK wrapping (multi-tenant isolation; future v2.0 scope)
 *   V3 = post-quantum hybrid (NIST PQC migration; ~2030 horizon)
 */
export type KeyVersion = 'v0' | 'v1';

/**
 * Encryption context for KMS calls — narrows access scope and provides audit trail.
 * Per `kmsService.ts` existing pattern: { service: 'tailrd-backend', purpose: 'phi-encryption' }
 *
 * Per-record propagation extension (added in implementation PR 2): includes model + field name
 * so that an attacker with cross-context decrypt access cannot redirect ciphertext between fields.
 */
export interface EncryptionContext {
  readonly service: string;
  readonly purpose: string;
  readonly model?: string;
  readonly field?: string;
}

/**
 * V0 envelope (legacy) — current production state.
 * Schema: enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 * 4 colon-delimited segments.
 */
export interface EnvelopeV0 {
  readonly version: 'v0';
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

/**
 * V1 envelope (target post-rotation) — KMS envelope encryption.
 * Schema: enc:v1:<wrappedDEK-base64>:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 * 6 colon-delimited segments (includes 'v1' marker after 'enc:' prefix).
 */
export interface EnvelopeV1 {
  readonly version: 'v1';
  readonly wrappedDEK: string;
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

export type Envelope = EnvelopeV0 | EnvelopeV1;

/**
 * Result of a single record migration (V0 → V1).
 */
export interface MigrationResult {
  readonly recordId: string;
  readonly table: string;
  readonly fromVersion: KeyVersion;
  readonly toVersion: KeyVersion;
  readonly fieldsConverted: number;
  readonly skipped: boolean;          // true if record was already V1 (idempotent no-op)
  readonly migratedAt: Date;
}

// ── Stub function signatures ────────────────────────────────────────────────

/**
 * Trigger key rotation: KMS-managed KEK rotation is automatic at the AWS layer (365-day).
 * This function manages app-layer DEK-rotation discipline (180-day cadence).
 *
 * Implementation will:
 *   1. Query KMS for current KEK metadata (kmsService.getKeyInfo)
 *   2. Mark current DEK-rotation watermark in app-side metadata table
 *   3. Trigger background re-encryption job for records with DEKs older than 180 days
 *   4. Return new key version marker
 *
 * @returns the new active key version after rotation
 * @throws DesignPhaseStubError until implementation PR 2 lands
 */
export async function rotateKey(): Promise<KeyVersion> {
  throw new DesignPhaseStubError('rotateKey()');
}

/**
 * Encrypt plaintext using the current active key version (V1 in target state).
 * Generates a fresh DEK per call via KMS, wraps it, and emits V1 envelope.
 *
 * @param plaintext UTF-8 string to encrypt (no length limit — envelope encryption handles arbitrary size)
 * @param context EncryptionContext for KMS audit trail + access narrowing
 * @returns serialized envelope string (enc:v1:<wrappedDEK>:<iv>:<authTag>:<ciphertext>)
 * @throws DesignPhaseStubError until implementation PR 1 lands
 */
export async function encryptWithCurrent(
  _plaintext: string,
  _context: EncryptionContext,
): Promise<string> {
  throw new DesignPhaseStubError('encryptWithCurrent()');
}

/**
 * Decrypt any version of envelope. Detects V0 vs V1 by parsing prefix.
 *
 * V0 path: parse legacy 4-segment envelope; decrypt with process.env.PHI_ENCRYPTION_KEY
 * V1 path: parse 6-segment envelope; unwrap DEK via KMS; decrypt with DEK
 *
 * Fail-loud per AUDIT-015 pattern: malformed envelope, integrity check failure,
 * KMS API failure, or context mismatch all throw with explicit context.
 *
 * @param envelope serialized ciphertext envelope (V0 or V1)
 * @param context EncryptionContext for V1 KMS calls (ignored for V0)
 * @returns decrypted plaintext
 * @throws DesignPhaseStubError until implementation PR 1 lands
 */
export async function decryptAny(
  _envelope: string,
  _context: EncryptionContext,
): Promise<string> {
  throw new DesignPhaseStubError('decryptAny()');
}

/**
 * Migrate a single record from V0 to V1 envelope (idempotent on V1 input).
 *
 * Implementation will:
 *   1. Read record's PHI fields via Prisma
 *   2. For each PHI field: decrypt as V0 → re-encrypt as V1
 *   3. Write back via Prisma update (triggers existing applyPHIEncryption middleware)
 *   4. Return migration result (counts + idempotency flag)
 *
 * Used by:
 *   - Background re-encryption job (PR 3)
 *   - Optional access-fallback re-encryption (PHI_REENCRYPT_ON_READ env var, off by default)
 *
 * @param recordId Prisma record primary key
 * @param table model name in PHI_FIELD_MAP or PHI_JSON_FIELDS
 * @returns MigrationResult with conversion counts + idempotency flag
 * @throws DesignPhaseStubError until implementation PR 3 lands
 */
export async function migrateRecord(
  _recordId: string,
  _table: string,
): Promise<MigrationResult> {
  throw new DesignPhaseStubError('migrateRecord()');
}
