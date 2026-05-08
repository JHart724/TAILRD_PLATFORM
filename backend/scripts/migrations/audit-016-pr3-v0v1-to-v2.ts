/**
 * AUDIT-016 PR 3 — V0/V1 → V2 envelope re-encryption migration.
 *
 * Discovers PHI columns containing V0 (`enc:<iv>:<authTag>:<ciphertext>`) or
 * V1 (`enc:v1:<iv>:<authTag>:<ciphertext>`) ciphertext and re-encrypts each
 * row's value as V2 (`enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>`) via
 * `keyRotation.migrateRecord` (which uses `kmsService.envelopeEncrypt` with
 * per-record EncryptionContext for HIPAA §164.312(b) audit-trail anchor).
 *
 * Sister architecture to AUDIT-022 PR #253 backfill
 * (`audit-022-legacy-json-phi-backfill.ts`):
 *   - One-shot operator-triggered script (not scheduled job)
 *   - SQL discovery filter + batched Prisma processing
 *   - --dry-run (default) / --execute (gated by env confirmation)
 *   - Per-row try/catch + safety abort + summary artifact
 *   - Audit trail: per-row + per-batch events (best-effort per D5)
 *
 * SQL discovery filter (D2):
 *   column LIKE 'enc:%' AND column NOT LIKE 'enc:v2:%'
 *   Includes V0 + V1; excludes V2 + plaintext (idempotent on re-run).
 *
 * Modes:
 *   --dry-run            (default) per-target V0+V1+V2 split; no writes.
 *   --execute            re-encrypt V0+V1 candidates as V2. Requires
 *                        AUDIT_016_PR3_EXECUTE_CONFIRMED=yes in environment.
 *   --batch <N>          batch size for execute mode (default 50; 55× KMS
 *                        rate-limit headroom at default config).
 *   --pause-ms <N>       sleep N ms between batches and between targets (default 100).
 *   --target <t>.<col>   restrict to a single (table, column) pair.
 *
 * Production safeguards:
 *   - Confirmation gate: --execute exits 1 unless AUDIT_016_PR3_EXECUTE_CONFIRMED=yes.
 *     Forces operator to follow docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md.
 *   - Pre-flight env validation: DATABASE_URL + PHI_ENCRYPTION_KEY +
 *     AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2 checked before any DB query.
 *     Without PHI_ENVELOPE_VERSION=v2, encryptWithCurrent emits V1 instead of V2,
 *     defeating the migration. Defense-in-depth: migrateRecord re-parses the
 *     emitted envelope and refuses to write non-V2.
 *   - Rate-limiting: --pause-ms bounds DB + KMS load on arbitrary row counts.
 *   - Summary artifact: every run writes a timestamped JSON envelope to
 *     `backend/var/audit-016-pr3-{mode}-{ISO}.json` for compliance archival.
 *   - Backup reminder: --execute prints an informational warning before run.
 *
 * Concurrent-write safety:
 *   This script DOES NOT take row-level locks. The migration assumes no
 *   concurrent writers update PHI columns during the execution window.
 *   Operator runbook recommends off-hours execution. Race protection in
 *   migrateRecord catches V2 records that appear between SQL fetch and write
 *   (skip-and-log; no DB write per D3).
 *
 * Idempotency:
 *   1. SQL filter excludes V2 from candidate set (re-run resumes cleanly).
 *   2. Per-row parseEnvelope re-check (race protection) skips any V2 that
 *      slipped through; no write occurs (D3 no-op-write discipline).
 *   3. MigrationResult.skipped flag tracks race-skipped count separately.
 *
 * Audit trail (HIPAA §164.312(b); all best-effort per D5):
 *   - File: `auditLogger.info`/`error` per row + per batch.
 *   - DB: `AuditLog` row per batch (action='PHI_MIGRATION_BATCH_*').
 *   - Filesystem: summary artifact in backend/var/.
 *   - NONE in HIPAA_GRADE_ACTIONS Set (per-row volume + storm risk; AUDIT-076
 *     partial closure remains separate PR scope).
 *
 * AUDIT-075 cross-reference (D8):
 *   This script migrates the columns currently listed in PHI_FIELD_MAP +
 *   PHI_JSON_FIELDS at merge time. When AUDIT-075 lands and extends those
 *   maps with errorMessage / description / notes columns, this script must be
 *   re-run to migrate the newly-covered columns. Operator runbook §6 documents
 *   the re-run requirement.
 *
 * Exit codes:
 *   0 = clean run (no failures)
 *   1 = run completed with one or more per-row failures (continue-on-error),
 *       OR confirmation gate / pre-flight env validation failed
 *   2 = fatal error (DB connect, unhandled exception)
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts --dry-run
 *   AUDIT_016_PR3_EXECUTE_CONFIRMED=yes \
 *     PHI_ENVELOPE_VERSION=v2 \
 *     AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
 *     npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts \
 *       --execute --batch 50 --pause-ms 100
 *   npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts \
 *     --execute --target patients.firstName
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';
import { auditLogger } from '../../src/middleware/auditLogger';
// AUDIT-011 marker pattern migrated 2026-05-07: removed import; use string-keyed
// `__tenantGuardBypass: true` directly on Prisma args (survives Prisma 5.22
// $extends sanitization).
import {
  migrateRecord,
  type EncryptionContext,
  type MigrationResult,
} from '../../src/services/keyRotation';

// ── TARGETS ─────────────────────────────────────────────────────────────────
// PR 3 covers BOTH string columns (PHI_FIELD_MAP) AND JSON columns
// (PHI_JSON_FIELDS) — superset of AUDIT-022. New TARGETS array (NOT imported
// from AUDIT-022) per design refinement note §2.2 — clean decouple avoids
// cross-script maintenance drift.
//
// `model` is the Prisma client property name (camelCase first char) — used by
// EncryptionContext for KMS audit-trail anchor.
// `table` is the underlying postgres table (matches @@map).
// `column` is the actual column name (camelCase per Prisma → snake_case in DB
//   only when @map directive present; PHI columns currently use camelCase
//   identical between Prisma and Postgres).

interface Target {
  readonly table: string;
  readonly model: string;       // Prisma model name (PascalCase) — for EncryptionContext
  readonly column: string;
  readonly kind: 'string' | 'json';
}

export const TARGETS: readonly Target[] = [
  // ─── String PHI columns (mirror PHI_FIELD_MAP in phiEncryption.ts) ───
  // Patient
  { table: 'patients', model: 'Patient', column: 'firstName',  kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'lastName',   kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'dateOfBirth', kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'phone',      kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'email',      kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'mrn',        kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'street',     kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'city',       kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'state',      kind: 'string' },
  { table: 'patients', model: 'Patient', column: 'zipCode',    kind: 'string' },
  // Encounter
  { table: 'encounters', model: 'Encounter', column: 'chiefComplaint',    kind: 'string' },
  { table: 'encounters', model: 'Encounter', column: 'primaryDiagnosis',  kind: 'string' },
  { table: 'encounters', model: 'Encounter', column: 'attendingProvider', kind: 'string' },
  // Observation
  { table: 'observations', model: 'Observation', column: 'valueText',         kind: 'string' },
  { table: 'observations', model: 'Observation', column: 'observationName',   kind: 'string' },
  { table: 'observations', model: 'Observation', column: 'orderingProvider',  kind: 'string' },
  // Order
  { table: 'orders', model: 'Order', column: 'orderName',         kind: 'string' },
  { table: 'orders', model: 'Order', column: 'indication',        kind: 'string' },
  { table: 'orders', model: 'Order', column: 'instructions',      kind: 'string' },
  { table: 'orders', model: 'Order', column: 'orderingProvider',  kind: 'string' },
  // Medication
  { table: 'medications', model: 'Medication', column: 'medicationName', kind: 'string' },
  { table: 'medications', model: 'Medication', column: 'genericName',    kind: 'string' },
  { table: 'medications', model: 'Medication', column: 'prescribedBy',   kind: 'string' },
  // Condition
  { table: 'conditions', model: 'Condition', column: 'conditionName', kind: 'string' },
  { table: 'conditions', model: 'Condition', column: 'recordedBy',    kind: 'string' },
  // Alert
  { table: 'alerts', model: 'Alert', column: 'message', kind: 'string' },
  // DrugTitration
  { table: 'drug_titrations', model: 'DrugTitration', column: 'drugName', kind: 'string' },
  // CrossReferral
  { table: 'cross_referrals', model: 'CrossReferral', column: 'reason', kind: 'string' },
  { table: 'cross_referrals', model: 'CrossReferral', column: 'notes',  kind: 'string' },
  // CarePlan
  { table: 'care_plans', model: 'CarePlan', column: 'title',       kind: 'string' },
  { table: 'care_plans', model: 'CarePlan', column: 'description', kind: 'string' },  // AUDIT-075 D2
  // Recommendation (AUDIT-075 NEW model — clinical recommendation; PAUSE 1 expanded scan)
  { table: 'recommendations', model: 'Recommendation', column: 'title',               kind: 'string' },  // AUDIT-075 D2
  { table: 'recommendations', model: 'Recommendation', column: 'description',         kind: 'string' },  // AUDIT-075 D2
  { table: 'recommendations', model: 'Recommendation', column: 'evidence',            kind: 'string' },  // AUDIT-075 D2
  { table: 'recommendations', model: 'Recommendation', column: 'implementationNotes', kind: 'string' },  // AUDIT-075 D2
  // InterventionTracking
  { table: 'intervention_tracking', model: 'InterventionTracking', column: 'interventionName',   kind: 'string' },
  { table: 'intervention_tracking', model: 'InterventionTracking', column: 'indication',         kind: 'string' },
  { table: 'intervention_tracking', model: 'InterventionTracking', column: 'performingProvider', kind: 'string' },
  { table: 'intervention_tracking', model: 'InterventionTracking', column: 'outcome',            kind: 'string' },
  // BreachIncident
  { table: 'breach_incidents', model: 'BreachIncident', column: 'description', kind: 'string' },
  // PatientDataRequest
  { table: 'patient_data_requests', model: 'PatientDataRequest', column: 'requestedBy',     kind: 'string' },
  { table: 'patient_data_requests', model: 'PatientDataRequest', column: 'requestorEmail',  kind: 'string' },
  { table: 'patient_data_requests', model: 'PatientDataRequest', column: 'notes',           kind: 'string' },  // AUDIT-075 D2
  // UserMFA
  { table: 'user_mfa', model: 'UserMFA', column: 'secret', kind: 'string' },

  // ─── AUDIT-075 D2 — NEW PHI_FIELD_MAP entries (sister to phiEncryption.ts L99-L122) ───
  // Layered defense: sanitize-at-write redaction (Step 4 callsites) + encrypt-residual
  // via this migration script. Per design refinement note §6 + §3 attribution.

  // InternalNote (AUDIT-075 NEW model — CLINICAL noteType holds PHI)
  { table: 'internal_notes', model: 'InternalNote', column: 'title',   kind: 'string' },  // AUDIT-075 D2
  { table: 'internal_notes', model: 'InternalNote', column: 'content', kind: 'string' },  // AUDIT-075 D2
  // Error-tracking + ingest (CONSERVATIVE pattern set per design §4.2)
  { table: 'webhook_events',     model: 'WebhookEvent',     column: 'errorMessage', kind: 'string' },  // AUDIT-075 D2
  { table: 'report_generations', model: 'ReportGeneration', column: 'errorMessage', kind: 'string' },  // AUDIT-075 D2
  { table: 'upload_jobs',        model: 'UploadJob',        column: 'errorMessage', kind: 'string' },  // AUDIT-075 D2
  // AuditLog.description — sanitize-at-write at writeAuditLog wrapper
  { table: 'audit_logs', model: 'AuditLog', column: 'description', kind: 'string' },  // AUDIT-018 sister-bundle
  // FailedFhirBundle — AGGRESSIVE pattern set per design §4.2 (FHIR bundle PHI surface)
  { table: 'failed_fhir_bundles', model: 'FailedFhirBundle', column: 'errorMessage', kind: 'string' },  // AUDIT-019 sister-bundle
  { table: 'failed_fhir_bundles', model: 'FailedFhirBundle', column: 'originalPath', kind: 'string' },  // AUDIT-019 sister-bundle
  // User PII (D4 partial — defense-in-depth posture; not strict PHI per §164.514).
  // User.email DEFERRED to AUDIT-XXX-future (blind-index requirement per design §5).
  { table: 'users', model: 'User', column: 'firstName', kind: 'string' },  // AUDIT-075 D4
  { table: 'users', model: 'User', column: 'lastName',  kind: 'string' },  // AUDIT-075 D4

  // ─── JSON PHI columns (mirror PHI_JSON_FIELDS in phiEncryption.ts) ───
  // The applyPHIEncryption middleware serializes JSON values to encrypted
  // strings on write; the column type in Postgres is json/jsonb but the
  // stored value at PR 3 time is a quoted string (or already-V2-encrypted
  // string). Discovery filter handles this by matching the whole column value.
  { table: 'webhook_events',               model: 'WebhookEvent',               column: 'rawPayload',         kind: 'json' },
  { table: 'risk_score_assessments',       model: 'RiskScoreAssessment',        column: 'inputData',          kind: 'json' },
  { table: 'risk_score_assessments',       model: 'RiskScoreAssessment',        column: 'components',         kind: 'json' },
  { table: 'intervention_tracking',        model: 'InterventionTracking',       column: 'findings',           kind: 'json' },
  { table: 'intervention_tracking',        model: 'InterventionTracking',       column: 'complications',      kind: 'json' },
  { table: 'alerts',                       model: 'Alert',                      column: 'triggerData',        kind: 'json' },
  { table: 'phenotypes',                   model: 'Phenotype',                  column: 'evidence',           kind: 'json' },
  { table: 'contraindication_assessments', model: 'ContraindicationAssessment', column: 'reasons',            kind: 'json' },
  { table: 'contraindication_assessments', model: 'ContraindicationAssessment', column: 'alternatives',       kind: 'json' },
  { table: 'contraindication_assessments', model: 'ContraindicationAssessment', column: 'monitoring',         kind: 'json' },
  { table: 'therapy_gaps',                 model: 'TherapyGap',                 column: 'barriers',           kind: 'json' },
  { table: 'therapy_gaps',                 model: 'TherapyGap',                 column: 'recommendations',    kind: 'json' },
  { table: 'encounters',                   model: 'Encounter',                  column: 'diagnosisCodes',     kind: 'json' },
  { table: 'cds_hooks_sessions',           model: 'CdsHooksSession',            column: 'fhirContext',        kind: 'json' },
  { table: 'cds_hooks_sessions',           model: 'CdsHooksSession',            column: 'cards',              kind: 'json' },
  { table: 'audit_logs',                   model: 'AuditLog',                   column: 'previousValues',     kind: 'json' },
  { table: 'audit_logs',                   model: 'AuditLog',                   column: 'newValues',          kind: 'json' },
  { table: 'audit_logs',                   model: 'AuditLog',                   column: 'metadata',           kind: 'json' },
  { table: 'care_plans',                   model: 'CarePlan',                   column: 'goals',              kind: 'json' },
  { table: 'care_plans',                   model: 'CarePlan',                   column: 'activities',         kind: 'json' },
  { table: 'care_plans',                   model: 'CarePlan',                   column: 'careTeam',           kind: 'json' },
  { table: 'drug_titrations',              model: 'DrugTitration',              column: 'barriers',           kind: 'json' },
  { table: 'drug_titrations',              model: 'DrugTitration',              column: 'monitoringPlan',     kind: 'json' },
  { table: 'device_eligibility',           model: 'DeviceEligibility',          column: 'criteria',           kind: 'json' },
  { table: 'device_eligibility',           model: 'DeviceEligibility',          column: 'barriers',           kind: 'json' },
  { table: 'device_eligibility',           model: 'DeviceEligibility',          column: 'contraindications',  kind: 'json' },
  { table: 'cross_referrals',              model: 'CrossReferral',              column: 'triggerData',        kind: 'json' },
  { table: 'cql_results',                  model: 'CQLResult',                  column: 'result',             kind: 'json' },
];

// ── CLI parsing ─────────────────────────────────────────────────────────────

export interface CliOptions {
  readonly mode: 'dry-run' | 'execute';
  readonly batch: number;
  readonly pauseMs: number;
  readonly target: { table: string; column: string } | null;
}

export function parseArgs(argv: string[]): CliOptions {
  let mode: 'dry-run' | 'execute' = 'dry-run';
  let batch = 50;
  let pauseMs = 100;
  let target: { table: string; column: string } | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      mode = 'dry-run';
    } else if (arg === '--execute') {
      mode = 'execute';
    } else if (arg === '--batch') {
      const next = argv[++i];
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--batch expects a positive integer, got: ${next}`);
      }
      batch = parsed;
    } else if (arg === '--pause-ms') {
      const next = argv[++i];
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`--pause-ms expects a non-negative integer, got: ${next}`);
      }
      pauseMs = parsed;
    } else if (arg === '--target') {
      const next = argv[++i];
      const dot = next?.indexOf('.');
      if (!next || dot === undefined || dot < 1) {
        throw new Error(`--target expects <table>.<column>, got: ${next}`);
      }
      target = { table: next.slice(0, dot), column: next.slice(dot + 1) };
    }
  }

  return { mode, batch, pauseMs, target };
}

// ── Pre-flight + safeguards ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(r => setTimeout(r, ms));
}

export interface PreFlightResult {
  readonly ok: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export function preFlightValidate(env: NodeJS.ProcessEnv = process.env): PreFlightResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set. Cannot connect to Postgres.');
  }
  if (!env.PHI_ENCRYPTION_KEY) {
    errors.push(
      'PHI_ENCRYPTION_KEY is not set. Required for V0/V1 decryption (single-key local AES-256-GCM path).',
    );
  } else if (env.PHI_ENCRYPTION_KEY.length !== 64) {
    warnings.push(
      `PHI_ENCRYPTION_KEY length is ${env.PHI_ENCRYPTION_KEY.length} chars; expected 64 hex (256-bit). ` +
      `keyRotation.validateKeyOrThrow may reject at module init.`,
    );
  }
  if (!env.AWS_KMS_PHI_KEY_ALIAS) {
    errors.push(
      'AWS_KMS_PHI_KEY_ALIAS is not set. Required for V2 envelope emission via kmsService.envelopeEncrypt.',
    );
  }
  if (env.PHI_ENVELOPE_VERSION !== 'v2') {
    errors.push(
      `PHI_ENVELOPE_VERSION must be 'v2' for migration; got '${env.PHI_ENVELOPE_VERSION ?? '(unset)'}'. ` +
      `Without v2, encryptWithCurrent emits V1 instead of V2 — defeats the migration.`,
    );
  }
  if (env.DEMO_MODE === 'true') {
    errors.push(
      'DEMO_MODE=true is incompatible with --execute. Migration script declines to run on demo data.',
    );
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function checkExecuteConfirmation(env: NodeJS.ProcessEnv = process.env): {
  ok: boolean;
  error?: string;
} {
  if (env.AUDIT_016_PR3_EXECUTE_CONFIRMED !== 'yes') {
    return {
      ok: false,
      error:
        'AUDIT-016 PR 3 --execute requires AUDIT_016_PR3_EXECUTE_CONFIRMED=yes in the environment.\n' +
        'See docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md for the full pre-flight checklist.',
    };
  }
  return { ok: true };
}

function printBackupReminder(): void {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('  WARNING: AUDIT-016 PR 3 --execute re-encrypts PHI data in-place.');
  console.error('  Confirm an Aurora cluster snapshot exists before proceeding.');
  console.error('  Migration is idempotent and recoverable via restore-from-snapshot.');
  console.error('  Runbook: docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('');
}

export async function writeSummaryArtifact(
  envelope: object,
  mode: 'dry-run' | 'execute',
): Promise<string> {
  const dir = path.resolve(__dirname, '../../var');
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `audit-016-pr3-${mode}-${ts}.json`);
  await fs.writeFile(file, JSON.stringify(envelope, null, 2), 'utf8');
  return file;
}

// ── SQL helpers ─────────────────────────────────────────────────────────────
// Discovery filter (D2):
//   v0v1Candidates: column LIKE 'enc:%' AND column NOT LIKE 'enc:v2:%'
//   alreadyV2:      column LIKE 'enc:v2:%'
//   plaintext:      column NOT LIKE 'enc:%' (excluded from PR 3 scope; AUDIT-022 owns)

export interface TargetCounts {
  readonly total: number;
  readonly v2: number;
  readonly v0v1: number;
  readonly plaintext: number;
}

async function columnExists(t: Target): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${t.table}' AND column_name = '${t.column}'`,
  );
  return rows.length > 0;
}

export async function countTarget(t: Target): Promise<TargetCounts> {
  const totalRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL`,
  );
  const v2Rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL AND "${t.column}"::text LIKE 'enc:v2:%'`,
  );
  const v0v1Rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL
       AND "${t.column}"::text LIKE 'enc:%'
       AND "${t.column}"::text NOT LIKE 'enc:v2:%'`,
  );
  const plaintextRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL AND "${t.column}"::text NOT LIKE 'enc:%'`,
  );
  return {
    total: Number(totalRows[0].c),
    v2: Number(v2Rows[0].c),
    v0v1: Number(v0v1Rows[0].c),
    plaintext: Number(plaintextRows[0].c),
  };
}

export async function fetchV0V1Rows(
  t: Target,
  limit: number,
): Promise<Array<{ id: string; value: string }>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: string }>>(
    `SELECT id, "${t.column}"::text AS value FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL
       AND "${t.column}"::text LIKE 'enc:%'
       AND "${t.column}"::text NOT LIKE 'enc:v2:%'
     ORDER BY id
     LIMIT ${limit}`,
  );
  return rows;
}

// ── Per-target migration ────────────────────────────────────────────────────

export interface TargetReport {
  table: string;
  column: string;
  model: string;
  beforeCounts: TargetCounts;
  afterCounts: TargetCounts | null;
  rowsAttempted: number;
  rowsMigrated: number;
  rowsRaceSkipped: number;
  rowsFailed: number;
  failures: Array<{ id: string; error: string }>;
}

const ENCRYPT_CONTEXT_BASE = {
  service: 'tailrd-backend',
  purpose: 'phi-migration-v0v1-to-v2',
} as const;

function contextFor(t: Target): EncryptionContext {
  return { ...ENCRYPT_CONTEXT_BASE, model: t.model, field: t.column };
}

export async function migrateTarget(
  t: Target,
  batchSize: number,
  pauseMs: number,
): Promise<TargetReport> {
  const before = await countTarget(t);
  const report: TargetReport = {
    table: t.table,
    column: t.column,
    model: t.model,
    beforeCounts: before,
    afterCounts: null,
    rowsAttempted: 0,
    rowsMigrated: 0,
    rowsRaceSkipped: 0,
    rowsFailed: 0,
    failures: [],
  };

  if (before.v0v1 === 0) {
    report.afterCounts = before;
    return report;
  }

  const context = contextFor(t);

  // Process in batches. SQL filter shrinks candidate set as migrations succeed.
  for (;;) {
    const rows = await fetchV0V1Rows(t, batchSize);
    if (rows.length === 0) break;

    // Per-batch start audit event (best-effort per D5).
    auditLogger.info('audit_event', {
      timestamp: new Date().toISOString(),
      userId: 'system:audit-016-pr3-migration',
      userEmail: 'system@tailrd-heart.com',
      userRole: 'SYSTEM',
      hospitalId: null,
      action: 'PHI_MIGRATION_BATCH_STARTED',
      resourceType: t.table,
      resourceId: null,
      ipAddress: 'cli',
      description: `AUDIT-016 PR 3 batch starting: ${t.table}.${t.column} batchSize=${rows.length}`,
    });

    let batchSucceeded = 0;
    let batchSkipped = 0;
    let batchFailed = 0;

    for (const row of rows) {
      report.rowsAttempted++;
      try {
        const result: MigrationResult = await migrateRecord(
          row.id,
          t.table,
          t.column,
          context,
          prisma,
          row.value,
        );
        if (result.skipped) {
          report.rowsRaceSkipped++;
          batchSkipped++;
          auditLogger.info('audit_event', {
            timestamp: new Date().toISOString(),
            userId: 'system:audit-016-pr3-migration',
            userEmail: 'system@tailrd-heart.com',
            userRole: 'SYSTEM',
            hospitalId: null,
            action: 'PHI_RECORD_SKIPPED_ALREADY_V2',
            resourceType: t.table,
            resourceId: row.id,
            ipAddress: 'cli',
            description: `AUDIT-016 PR 3 race-skip already-V2: ${t.table}.${t.column}`,
          });
        } else {
          report.rowsMigrated++;
          batchSucceeded++;
          auditLogger.info('audit_event', {
            timestamp: new Date().toISOString(),
            userId: 'system:audit-016-pr3-migration',
            userEmail: 'system@tailrd-heart.com',
            userRole: 'SYSTEM',
            hospitalId: null,
            action: 'PHI_RECORD_MIGRATED',
            resourceType: t.table,
            resourceId: row.id,
            ipAddress: 'cli',
            description: `AUDIT-016 PR 3 V${result.fromVersion}→V2: ${t.table}.${t.column}`,
          });
        }
      } catch (err) {
        report.rowsFailed++;
        batchFailed++;
        const message = err instanceof Error ? err.message : String(err);
        report.failures.push({ id: row.id, error: message });
        auditLogger.error('audit_event', {
          timestamp: new Date().toISOString(),
          userId: 'system:audit-016-pr3-migration',
          userEmail: 'system@tailrd-heart.com',
          userRole: 'SYSTEM',
          hospitalId: null,
          action: 'PHI_MIGRATION_FAILURE',
          resourceType: t.table,
          resourceId: row.id,
          ipAddress: 'cli',
          description: `AUDIT-016 PR 3 migration failed: ${t.table}.${t.column}: ${message}`,
        });
      }
    }

    // Per-batch close audit event (best-effort per D5).
    const batchAllFailed =
      rows.length > 0 && batchFailed === rows.length && batchSucceeded === 0 && batchSkipped === 0;
    try {
      await prisma.auditLog.create({
        data: {
          hospitalId: null,
          userId: 'system:audit-016-pr3-migration',
          userEmail: 'system@tailrd-heart.com',
          userRole: 'SYSTEM',
          ipAddress: 'cli',
          action: batchAllFailed ? 'PHI_MIGRATION_BATCH_FAILED' : 'PHI_MIGRATION_BATCH_COMPLETED',
          resourceType: t.table,
          resourceId: null,
          description:
            `AUDIT-016 PR 3 batch: ${t.table}.${t.column} ` +
            `attempted=${rows.length} migrated=${batchSucceeded} ` +
            `raceSkipped=${batchSkipped} failed=${batchFailed}`,
          previousValues: null,
          newValues: {
            target: `${t.table}.${t.column}`,
            batchSize: rows.length,
            ids: rows.map(r => r.id),
            batchMigrated: batchSucceeded,
            batchRaceSkipped: batchSkipped,
            batchFailed,
            runningMigrated: report.rowsMigrated,
            runningRaceSkipped: report.rowsRaceSkipped,
            runningFailed: report.rowsFailed,
          } as any,
        },
        __tenantGuardBypass: true,
      } as any);
    } catch (dbErr) {
      auditLogger.error('audit_db_write_failed', {
        scope: 'PHI_MIGRATION_BATCH',
        target: `${t.table}.${t.column}`,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    // Safety abort (sister to AUDIT-022 :416): if every row in this batch
    // failed, stop the target to avoid an infinite loop on a target where every
    // row hits the same error (e.g., KMS key wrong-aliased; tampered ciphertext
    // run; schema drift).
    if (batchAllFailed) {
      break;
    }

    // Inter-batch pause to bound DB + KMS load.
    await sleep(pauseMs);
  }

  report.afterCounts = await countTarget(t);
  return report;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(opts: CliOptions): Promise<number> {
  // Pre-flight env validation runs both modes — both need DATABASE_URL +
  // PHI_ENCRYPTION_KEY + AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2.
  // Dry-run reports counts but cannot pre-validate that V2 emit would succeed
  // without all four; reporting "would migrate N rows" is misleading if the
  // run can't actually emit V2.
  const preflight = preFlightValidate();
  if (!preflight.ok) {
    for (const err of preflight.errors) {
      console.error(`PREFLIGHT_ERROR: ${err}`);
    }
    return 1;
  }
  for (const w of preflight.warnings) {
    console.error(`PREFLIGHT_WARN: ${w}`);
  }

  // Confirmation gate — execute mode requires explicit env opt-in (D7).
  if (opts.mode === 'execute') {
    const confirm = checkExecuteConfirmation();
    if (!confirm.ok) {
      console.error(`CONFIRMATION_GATE: ${confirm.error}`);
      return 1;
    }
    printBackupReminder();
  }

  const targets = opts.target
    ? TARGETS.filter(t => t.table === opts.target!.table && t.column === opts.target!.column)
    : TARGETS;

  if (opts.target && targets.length === 0) {
    console.error(`--target ${opts.target.table}.${opts.target.column} not found in TARGETS`);
    return 2;
  }

  const startedAt = new Date().toISOString();
  const reports: TargetReport[] = [];
  const skippedTargets: Array<{ table: string; column: string; reason: string }> = [];
  let totalV0V1Before = 0;
  let totalRowsAttempted = 0;
  let totalRowsMigrated = 0;
  let totalRowsRaceSkipped = 0;
  let totalRowsFailed = 0;

  for (const t of targets) {
    const exists = await columnExists(t);
    if (!exists) {
      skippedTargets.push({ table: t.table, column: t.column, reason: 'column not found in schema' });
      console.error(`SKIP   ${t.table}.${t.column} (column not found)`);
      continue;
    }

    if (opts.mode === 'dry-run') {
      const before = await countTarget(t);
      reports.push({
        table: t.table,
        column: t.column,
        model: t.model,
        beforeCounts: before,
        afterCounts: null,
        rowsAttempted: 0,
        rowsMigrated: 0,
        rowsRaceSkipped: 0,
        rowsFailed: 0,
        failures: [],
      });
      totalV0V1Before += before.v0v1;
      console.error(
        `${before.v0v1 > 0 ? 'V0V1  ' : 'CLEAN '} ${t.table}.${t.column}: ` +
        `total=${before.total} v2=${before.v2} v0v1=${before.v0v1} plaintext=${before.plaintext}`,
      );
    } else {
      const r = await migrateTarget(t, opts.batch, opts.pauseMs);
      reports.push(r);
      totalV0V1Before += r.beforeCounts.v0v1;
      totalRowsAttempted += r.rowsAttempted;
      totalRowsMigrated += r.rowsMigrated;
      totalRowsRaceSkipped += r.rowsRaceSkipped;
      totalRowsFailed += r.rowsFailed;
      const after = r.afterCounts!;
      console.error(
        `${r.rowsFailed > 0 ? 'FAILED' : 'DONE  '} ${t.table}.${t.column}: ` +
        `v0v1 ${r.beforeCounts.v0v1}→${after.v0v1} v2 ${r.beforeCounts.v2}→${after.v2} ` +
        `attempted=${r.rowsAttempted} migrated=${r.rowsMigrated} ` +
        `raceSkipped=${r.rowsRaceSkipped} failed=${r.rowsFailed}`,
      );
      await sleep(opts.pauseMs);
    }
  }

  const finishedAt = new Date().toISOString();

  const envelope = {
    audit: 'AUDIT-016-PR-3',
    mode: opts.mode,
    batchSize: opts.batch,
    pauseMs: opts.pauseMs,
    targetFilter: opts.target,
    startedAt,
    finishedAt,
    totalsByTarget: reports,
    skippedTargets,
    summary: {
      targetsScanned: targets.length,
      targetsSkipped: skippedTargets.length,
      totalV0V1Before,
      totalRowsAttempted,
      totalRowsMigrated,
      totalRowsRaceSkipped,
      totalRowsFailed,
      cleanForCloseout: opts.mode === 'execute' && totalRowsFailed === 0,
    },
    artifactPath: '' as string,
  };

  // Summary artifact for compliance archival. Failure non-fatal — stdout
  // envelope remains canonical record.
  try {
    const artifactPath = await writeSummaryArtifact(envelope, opts.mode);
    envelope.artifactPath = artifactPath;
    console.error(`SUMMARY_ARTIFACT: ${artifactPath}`);
  } catch (artifactErr) {
    console.error(
      `SUMMARY_ARTIFACT_WRITE_FAILED: ` +
      `${artifactErr instanceof Error ? artifactErr.message : String(artifactErr)}`,
    );
  }

  console.log('---AUDIT_016_PR3_V0V1_TO_V2---');
  console.log(JSON.stringify(envelope, null, 2));
  console.log('---END---');

  return totalRowsFailed > 0 ? 1 : 0;
}

// Entrypoint guard — run when invoked as script, not when imported by tests.
const invokedAsScript = require.main === module;

if (invokedAsScript) {
  const opts = parseArgs(process.argv.slice(2));
  main(opts)
    .then(async code => {
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch(async err => {
      console.error('FATAL', err);
      console.log('---AUDIT_016_PR3_V0V1_TO_V2---');
      console.log(
        JSON.stringify(
          {
            audit: 'AUDIT-016-PR-3',
            fatalError: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ),
      );
      console.log('---END---');
      await prisma.$disconnect().catch(() => {});
      process.exit(2);
    });
}

export { main };
