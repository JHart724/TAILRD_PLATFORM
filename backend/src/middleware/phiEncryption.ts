/**
 * PHI Encryption Middleware
 *
 * Wires AES-256-GCM field-level encryption into Prisma `$use` middleware.
 * Encrypts/decrypts PHI fields per HIPAA §164.312(a)(2)(iv) addressable
 * implementation specification.
 *
 * Status (2026-05-07, post AUDIT-016 PR 1):
 *   - V0 envelope (legacy untagged): `enc:<iv>:<authTag>:<ciphertext>` — DECRYPT ONLY
 *     for backwards compatibility with existing production rows.
 *   - V1 envelope (single-key versioned): `enc:v1:<iv>:<authTag>:<ciphertext>` —
 *     EMITTED for all new writes by `keyRotation.encryptWithCurrent`.
 *   - V2 envelope (KMS-wrapped DEK): `enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>` —
 *     PR 2 wires kmsService for emission; decryption stub-throws until then.
 *
 * AUDIT-016 implementation status:
 *   - PR 1 (this PR) — envelope schema + V0/V1 detection + V1 emission
 *   - PR 2 (pending) — kmsService wiring (V2 emission, KMS-wrapped DEK)
 *   - PR 3 (pending) — migrateRecord() + background re-encryption job
 *
 * AUDIT-017 (PHI_ENCRYPTION_KEY length validation) — RESOLVED 2026-05-07,
 * bundled into AUDIT-016 PR 1. `validateKeyOrThrow` (in `keyRotation.ts`)
 * runs at module init outside demo mode; throws on missing / wrong-length /
 * non-hex key. Sister to AUDIT-015 fail-loud pattern.
 *
 * AUDIT-015 fail-loud invariants preserved:
 *   - Legacy plaintext rows throw unless PHI_LEGACY_PLAINTEXT_OK=true
 *   - Malformed ciphertext format throws (via envelopeFormat.parseEnvelope)
 *   - AES-GCM auth-tag failure propagates instead of being swallowed
 *
 * Cross-references:
 *   - keyRotation.ts — owns encryptWithCurrent + decryptAny + key validation
 *   - envelopeFormat.ts — pure parse/build for V0/V1/V2 schema
 *   - kmsService.ts — fully implemented; PR 2 wires for V2 envelope emission
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  decryptAny,
  encryptWithCurrent,
  validateKeyOrThrow,
  validateEnvelopeConfigOrThrow,
  type EncryptionContext,
} from '../services/keyRotation';

const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY;
const isDemoMode = process.env.DEMO_MODE === 'true';
// AUDIT-015 remediation: when true, allow reading legacy plaintext rows from
// PHI-encrypted columns (pre-encryption-rollout data). Default false in
// production. Set explicitly during a one-off backfill window.
const ALLOW_LEGACY_PLAINTEXT = process.env.PHI_LEGACY_PLAINTEXT_OK === 'true' || isDemoMode;
let plaintextWarned = false;

// AUDIT-017 (bundled with AUDIT-016 PR 1): validate PHI_ENCRYPTION_KEY at
// module load. Skipped in demo mode where the key may be intentionally absent.
// In any non-demo environment with a key set, an invalid key fails fast at
// startup rather than emitting bad ciphertext and tripping at decrypt time.
if (!isDemoMode && ENCRYPTION_KEY) {
  validateKeyOrThrow(ENCRYPTION_KEY);
}

// AUDIT-016 PR 2: validate V2 envelope config at module load. If
// PHI_ENVELOPE_VERSION=v2 is set without AWS_KMS_PHI_KEY_ALIAS, throws
// EnvelopeConfigError so deployment fails fast at startup. Sister to
// AUDIT-017 validateKeyOrThrow pattern.
validateEnvelopeConfigOrThrow();

// Base encryption context. AUDIT-016 PR 2 D2: extended per-record with
// model + field at each encrypt call site for HIPAA audit-trail anchor
// (CloudTrail kms:Decrypt event payload). See `contextFor()` below.
const BASE_ENCRYPT_CONTEXT: EncryptionContext = {
  service: 'tailrd-backend',
  purpose: 'phi-encryption',
};

function contextFor(model: string, field: string): EncryptionContext {
  return { ...BASE_ENCRYPT_CONTEXT, model, field };
}

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
  CarePlan: ['title', 'description'],  // AUDIT-075: +description (PAUSE 1 inventory; PHI patient-tied)
  // Clinical recommendation (AUDIT-075 NEW model — PAUSE 1 expanded scan)
  Recommendation: ['title', 'description', 'evidence', 'implementationNotes'],
  // Intervention tracking
  InterventionTracking: ['interventionName', 'indication', 'performingProvider', 'outcome'],
  // Breach and data requests
  BreachIncident: ['description'],
  PatientDataRequest: ['requestedBy', 'requestorEmail', 'notes'],  // AUDIT-075: +notes (right-to-deletion operator-supplied)
  // Internal notes (AUDIT-075 NEW model — PAUSE 1 expanded scan; CLINICAL noteType holds PHI)
  InternalNote: ['title', 'content'],
  // Error-tracking + ingest models (AUDIT-075 D2 layered sanitize-at-write + encrypt-residual)
  // Sanitize-at-write integration in routes/services per Step 4 callsite edits.
  WebhookEvent: ['errorMessage'],          // AUDIT-075 D2: CONSERVATIVE pattern set
  ReportGeneration: ['errorMessage'],      // AUDIT-075 D2: CONSERVATIVE pattern set
  UploadJob: ['errorMessage'],             // AUDIT-075 D2: CONSERVATIVE pattern set
  // AUDIT-018 sister-bundle (D3): AuditLog.description sanitize-at-write at writeAuditLog wrapper
  AuditLog: ['description'],
  // AUDIT-019 sister-bundle (D3): FailedFhirBundle plaintext PHI fragments per register entry
  // D2 AGGRESSIVE pattern set (FHIR bundle PHI surface justifies opt-in NAME pattern per design §4.2)
  FailedFhirBundle: ['errorMessage', 'originalPath'],
  // Staff PII (AUDIT-075 D4 partial — defense-in-depth posture; not strict PHI per HIPAA §164.514)
  // User.email DEFERRED to AUDIT-XXX-future (blind-index requirement per auth.ts:52 case-insensitive
  // findFirst lookup; non-deterministic AES-256-GCM ciphertext breaks equals match). Sister to AUDIT-014.
  User: ['firstName', 'lastName'],
  // MFA secrets (not PHI but equally sensitive — DB compromise must not expose TOTP)
  UserMFA: ['secret'],
};

// DateTime PHI fields that need Date→ISO conversion before encrypt + ISO→Date after decrypt
const DATETIME_PHI_FIELDS = new Set(['dateOfBirth']);

// JSON fields requiring serialize-then-encrypt (standard field encryption doesn't work on Json type)
// AUDIT-022 §17.1 cleanup (2026-05-07): removed `inputs` and `outcomes` —
// those fields don't exist in schema.prisma. The middleware silently no-oped
// on them (Prisma `data` doesn't carry the field) but
// verify-phi-legacy-json.js + audit-022 backfill mirrored them and tripped.
const PHI_JSON_FIELDS: Record<string, string[]> = {
  WebhookEvent: ['rawPayload'],
  RiskScoreAssessment: ['inputData', 'components'],
  InterventionTracking: ['findings', 'complications'],
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

async function encrypt(text: string, model: string, field: string): Promise<string> {
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
  return encryptWithCurrent(text, contextFor(model, field));
}

async function decrypt(envelope: string, model: string, field: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    if (!isDemoMode) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY is required outside demo mode. Cannot read PHI without key.');
    }
    return envelope;
  }

  // AUDIT-015 remediation: legacy plaintext (no enc: prefix). Throw unless
  // ALLOW_LEGACY_PLAINTEXT is set (migration window only).
  if (!envelope.startsWith('enc:')) {
    if (ALLOW_LEGACY_PLAINTEXT) return envelope;
    throw new Error('PHI decryption: unencrypted value found in encrypted-field column (set PHI_LEGACY_PLAINTEXT_OK=true if running a migration; otherwise this indicates corrupted data)');
  }

  // Delegate to keyRotation.decryptAny — handles V0 + V1 + V2 dispatch,
  // AUDIT-015 fail-loud invariants on malformed envelope + auth-tag failure.
  // Per-record context (model + field) propagated for KMS audit-trail anchor
  // (HIPAA §164.312(b) — CloudTrail kms:Decrypt event payload).
  return decryptAny(envelope, contextFor(model, field));
}

async function encryptFields(data: Record<string, any>, fields: string[], model: string): Promise<void> {
  for (const field of fields) {
    if (data[field] instanceof Date) {
      data[field] = (data[field] as Date).toISOString();
    }
    if (data[field] && typeof data[field] === 'string') {
      data[field] = await encrypt(data[field], model, field);
    }
  }
}

async function decryptRecord(record: Record<string, any>, fields: string[], model: string): Promise<Record<string, any>> {
  for (const field of fields) {
    if (record[field] && typeof record[field] === 'string') {
      const decrypted = await decrypt(record[field], model, field);
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

async function encryptJsonField(data: Record<string, any>, field: string, model: string): Promise<void> {
  if (data[field] != null) {
    const serialized = typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]);
    data[field] = await encrypt(serialized, model, field);
  }
}

async function decryptJsonField(record: Record<string, any>, field: string, model: string): Promise<void> {
  if (record[field] && typeof record[field] === 'string' && record[field].startsWith('enc:')) {
    try {
      const decrypted = await decrypt(record[field], model, field);
      record[field] = JSON.parse(decrypted);
    } catch {
      // If JSON parse fails (decrypted plaintext wasn't JSON), return as decrypted string.
      record[field] = await decrypt(record[field], model, field);
    }
  }
}

/**
 * Wire PHI field-level AES-256-GCM encryption onto a Prisma client.
 *
 * 2026-05-07 migration ($use → $extends per AUDIT-011 Phase b/c §8):
 *   Original implementation used `prisma.$use(async (params, next) => ...)`;
 *   migrated to Prisma 5+ `$extends({ query: { $allModels: { $allOperations
 *   } } })` API per AUDIT-011 Phase b/c design §8 — coordinated migration
 *   with Layer 3 tenant guard so the codebase doesn't propagate $use legacy
 *   tech debt (PR-bundled per §17.3).
 *
 * API mapping (per design refinement note §8.2):
 *   params.model       → model        (string)
 *   params.action      → operation    (string; same value space)
 *   params.args        → args         (object; preserved unchanged)
 *   next(params)       → query(args)  (function call)
 *
 * Behavior identity: encrypt-on-write + decrypt-on-read logic preserved
 * verbatim from the $use middleware. Per-record EncryptionContext
 * propagation (PR 2 — `{ service, purpose, model, field }`) carries
 * through unchanged.
 *
 * Returns the extended Prisma client (NEW signature 2026-05-07; was void
 * for $use which mutated in place). Caller stores the returned client as
 * the singleton; downstream consumers import the singleton.
 *
 * Wire-in order (per AUDIT-011 design refinement note §8.6 — locked):
 *   const tenantGuarded = applyPrismaTenantGuard(baseClient);
 *   const fullyExtended = applyPHIEncryption(tenantGuarded);
 *   export default fullyExtended;
 *
 * Layer 3 (tenant guard) registers FIRST → encryption SECOND. Tenant
 * violations throw before encryption runs (PHI plaintext never touched on
 * rejected queries; defense-in-depth).
 */
export function applyPHIEncryption<TClient extends PrismaClient>(
  prisma: TClient,
): ReturnType<TClient['$extends']> {
  return prisma.$extends({
    name: 'audit-016-phi-encryption',
    query: {
      $allModels: {
        $allOperations: async ({ args, model, operation, query }) => {
          const stringFields = PHI_FIELD_MAP[model];
          const jsonFields = PHI_JSON_FIELDS[model];

          if (!stringFields && !jsonFields) {
            return query(args);
          }

          const fields = stringFields || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const argsAny = args as any;

          // Encrypt on write (string fields + JSON fields)
          if (['create', 'update', 'upsert', 'updateMany'].includes(operation)) {
            const data = argsAny?.data;
            if (data) {
              await encryptFields(data, fields, model);
              if (jsonFields) {
                for (const jf of jsonFields) await encryptJsonField(data, jf, model);
              }
            }
            if (operation === 'upsert') {
              if (argsAny?.create) {
                await encryptFields(argsAny.create, fields, model);
                if (jsonFields) {
                  for (const jf of jsonFields) await encryptJsonField(argsAny.create, jf, model);
                }
              }
              if (argsAny?.update) {
                await encryptFields(argsAny.update, fields, model);
                if (jsonFields) {
                  for (const jf of jsonFields) await encryptJsonField(argsAny.update, jf, model);
                }
              }
            }
          }

          if (operation === 'createMany' && argsAny?.data) {
            const rows = Array.isArray(argsAny.data) ? argsAny.data : [argsAny.data];
            for (const row of rows) {
              await encryptFields(row, fields, model);
              if (jsonFields) {
                for (const jf of jsonFields) await encryptJsonField(row, jf, model);
              }
            }
          }

          const result = await query(args);

          // Decrypt on read (string fields + JSON fields)
          if (result) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decryptOne = async (r: Record<string, any>): Promise<Record<string, any>> => {
              await decryptRecord(r, fields, model);
              if (jsonFields) {
                for (const jf of jsonFields) await decryptJsonField(r, jf, model);
              }
              return r;
            };
            if (Array.isArray(result)) {
              return Promise.all(
                result.map((r) =>
                  typeof r === 'object' && r !== null ? decryptOne(r) : Promise.resolve(r),
                ),
              );
            }
            if (typeof result === 'object' && result !== null) {
              return decryptOne(result);
            }
          }

          return result;
        },
      },
    },
  }) as ReturnType<TClient['$extends']>;
}

// Generate a new 256-bit encryption key (run once, store in Secrets Manager)
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
