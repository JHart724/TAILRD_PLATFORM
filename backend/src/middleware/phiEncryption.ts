/**
 * PHI Encryption Middleware (current single-key state)
 *
 * Wires AES-256-GCM field-level encryption into Prisma `$use` middleware.
 * Encrypts/decrypts PHI fields per HIPAA §164.312(a)(2)(iv) addressable
 * implementation specification.
 *
 * Current envelope format (V0): `enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>`
 * Single key sourced from `process.env.PHI_ENCRYPTION_KEY`.
 *
 * AUDIT-016 status (HIGH P1, DESIGN PHASE COMPLETE 2026-05-07):
 *   Key rotation is NOT supported in this single-key state. Rotating the env
 *   var today would render all existing ciphertext undecryptable. Design for
 *   the rotation pattern is captured in:
 *
 *     docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md
 *
 *   Implementation will land in 3 follow-up PRs:
 *     - PR 1: V0/V1 envelope detection + V1 emission for new writes
 *     - PR 2: phiEncryption ↔ kmsService wiring (envelope encryption via KMS)
 *     - PR 3: migrateRecord() implementation + background re-encryption job
 *
 *   Until implementation PRs land, this file's encryption logic is UNCHANGED.
 *   The single-key V0 pattern remains in production. See `keyRotation.ts` for
 *   interface stubs (throw `DesignPhaseStubError` when called).
 *
 * AUDIT-015 fail-loud invariants preserved:
 *   - Legacy plaintext rows throw unless PHI_LEGACY_PLAINTEXT_OK=true
 *   - Malformed ciphertext format throws
 *   - AES-GCM auth-tag failure propagates instead of being swallowed
 */

import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const isDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';
// AUDIT-015 remediation: when true, allow reading legacy plaintext rows from
// PHI-encrypted columns (pre-encryption-rollout data). Default false in
// production. Set explicitly during a one-off backfill window.
const ALLOW_LEGACY_PLAINTEXT = process.env.PHI_LEGACY_PLAINTEXT_OK === 'true' || isDemoMode;
let plaintextWarned = false;

// PHI fields that must be encrypted at rest per HIPAA 164.312(a)(2)(iv)
// PHI string fields encrypted via middleware (HIPAA 164.312(a)(2)(iv))
const PHI_FIELD_MAP: Record<string, string[]> = {
  // Core patient data
  Patient: [
    'firstName', 'lastName', 'dateOfBirth', 'phone', 'email',
    'mrn', 'street', 'city', 'state', 'zipCode',
  ],
  // Clinical encounter data
  Encounter: ['chiefComplaint', 'primaryDiagnosis', 'attendingProvider'],
  Observation: ['valueText', 'observationName', 'orderingProvider'],
  Order: ['orderName', 'indication', 'instructions', 'orderingProvider'],
  Medication: ['medicationName', 'genericName', 'prescribedBy'],
  Condition: ['conditionName', 'recordedBy'],
  // Clinical decision support
  Alert: ['message'],
  DrugTitration: ['drugName'],
  CrossReferral: ['reason', 'notes'],
  CarePlan: ['title'],
  // Intervention tracking
  InterventionTracking: ['interventionName', 'indication', 'performingProvider', 'outcome'],
  // Breach and data requests
  BreachIncident: ['description'],
  PatientDataRequest: ['requestedBy', 'requestorEmail'],
  // MFA secrets (not PHI but equally sensitive — DB compromise must not expose TOTP)
  UserMFA: ['secret'],
};

// DateTime PHI fields that need Date→ISO conversion before encrypt + ISO→Date after decrypt
const DATETIME_PHI_FIELDS = new Set(['dateOfBirth']);

// JSON fields requiring serialize-then-encrypt (standard field encryption doesn't work on Json type)
const PHI_JSON_FIELDS: Record<string, string[]> = {
  WebhookEvent: ['rawPayload'],
  RiskScoreAssessment: ['inputData', 'components', 'inputs'],
  InterventionTracking: ['findings', 'complications', 'outcomes'],
  Alert: ['triggerData'],
  Phenotype: ['evidence'],
  ContraindicationAssessment: ['reasons', 'alternatives', 'monitoring'],
  TherapyGap: ['barriers', 'recommendations'],
  Encounter: ['diagnosisCodes'],
  CdsHooksSession: ['fhirContext', 'cards'],
  AuditLog: ['previousValues', 'newValues', 'metadata'],
  CarePlan: ['goals', 'activities', 'careTeam'],
  DrugTitration: ['barriers', 'monitoringPlan'],
  DeviceEligibility: ['criteria', 'barriers', 'contraindications'],
  CrossReferral: ['triggerData'],
  CQLResult: ['result'],
};

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    if (!isDemoMode) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY is required outside demo mode. Cannot store PHI unencrypted.');
    }
    if (!plaintextWarned) {
      plaintextWarned = true;
      console.error('[PHI-WARN] DEMO_MODE active without PHI_ENCRYPTION_KEY — PHI stored as plaintext');
    }
    return text;
  }
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    if (!isDemoMode) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY is required outside demo mode. Cannot read PHI without key.');
    }
    return encryptedText;
  }

  // AUDIT-015 remediation: legacy plaintext (no enc: prefix). Throw unless
  // ALLOW_LEGACY_PLAINTEXT is set (migration window only).
  if (!encryptedText.startsWith('enc:')) {
    if (ALLOW_LEGACY_PLAINTEXT) return encryptedText;
    throw new Error('PHI decryption: unencrypted value found in encrypted-field column (set PHI_LEGACY_PLAINTEXT_OK=true if running a migration; otherwise this indicates corrupted data)');
  }

  // AUDIT-015 remediation: malformed format. Throw rather than silently
  // returning ciphertext.
  const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('PHI decryption: malformed ciphertext format (expected enc:iv:authTag:ciphertext)');
  }

  // AUDIT-015 remediation: AES-GCM auth-tag failure now propagates instead
  // of being swallowed by catch-and-return-ciphertext. crypto.decipher.final()
  // throws on auth-tag mismatch; let that throw bubble up.
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    // Wrap with context so operators can distinguish integrity failure from
    // other crypto errors. Preserve original error for observability.
    const wrapped: any = new Error(`PHI decryption: integrity check failed (${err?.message || 'auth tag mismatch'})`);
    wrapped.cause = err;
    throw wrapped;
  }
}

function encryptFields(data: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (data[field] instanceof Date) {
      data[field] = (data[field] as Date).toISOString();
    }
    if (data[field] && typeof data[field] === 'string') {
      data[field] = encrypt(data[field]);
    }
  }
}

function decryptRecord(record: Record<string, any>, fields: string[]): Record<string, any> {
  for (const field of fields) {
    if (record[field] && typeof record[field] === 'string') {
      const decrypted = decrypt(record[field]);
      if (DATETIME_PHI_FIELDS.has(field) && typeof decrypted === 'string') {
        const d = new Date(decrypted);
        record[field] = !isNaN(d.getTime()) ? d : decrypted;
      } else {
        record[field] = decrypted;
      }
    }
  }
  return record;
}

function encryptJsonField(data: Record<string, any>, field: string): void {
  if (data[field] != null) {
    const serialized = typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]);
    data[field] = encrypt(serialized);
  }
}

function decryptJsonField(record: Record<string, any>, field: string): void {
  if (record[field] && typeof record[field] === 'string' && record[field].startsWith('enc:')) {
    try {
      const decrypted = decrypt(record[field]);
      record[field] = JSON.parse(decrypted);
    } catch {
      // If JSON parse fails, return as decrypted string
      record[field] = decrypt(record[field]);
    }
  }
}

export function applyPHIEncryption(prisma: PrismaClient): void {
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    const model = params.model as string | undefined;
    const stringFields = model ? PHI_FIELD_MAP[model] : undefined;
    const jsonFields = model ? PHI_JSON_FIELDS[model] : undefined;

    if (!model || (!stringFields && !jsonFields)) {
      return next(params);
    }

    const fields = stringFields || [];

    // Encrypt on write (string fields + JSON fields)
    if (['create', 'update', 'upsert', 'updateMany'].includes(params.action)) {
      const data = params.args?.data;
      if (data) {
        encryptFields(data, fields);
        if (jsonFields) jsonFields.forEach(jf => encryptJsonField(data, jf));
      }
      if (params.action === 'upsert') {
        if (params.args?.create) {
          encryptFields(params.args.create, fields);
          if (jsonFields) jsonFields.forEach(jf => encryptJsonField(params.args.create, jf));
        }
        if (params.args?.update) {
          encryptFields(params.args.update, fields);
          if (jsonFields) jsonFields.forEach(jf => encryptJsonField(params.args.update, jf));
        }
      }
    }

    if (params.action === 'createMany' && params.args?.data) {
      const rows = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
      for (const row of rows) {
        encryptFields(row, fields);
        if (jsonFields) jsonFields.forEach(jf => encryptJsonField(row, jf));
      }
    }

    const result = await next(params);

    // Decrypt on read (string fields + JSON fields)
    if (result) {
      const decryptOne = (r: Record<string, any>) => {
        decryptRecord(r, fields);
        if (jsonFields) jsonFields.forEach(jf => decryptJsonField(r, jf));
        return r;
      };
      if (Array.isArray(result)) {
        return result.map((r) => (typeof r === 'object' && r !== null ? decryptOne(r) : r));
      }
      if (typeof result === 'object' && result !== null) {
        return decryptOne(result);
      }
    }

    return result;
  });
}

// Generate a new 256-bit encryption key (run once, store in Secrets Manager)
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
