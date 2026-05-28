import { PrismaClient } from '@prisma/client';
import { applyPrismaTenantGuard } from './prismaTenantGuard';
import { applyPrismaBaaGuard } from './prismaBaaGuard';
import { applyPHIEncryption } from '../middleware/phiEncryption';
import { applyPrismaTracing } from '../middleware/tracing';

// Shared Prisma client - single instance for the entire backend.
// Avoids connection pool exhaustion from multiple `new PrismaClient()` calls.
//
// Layer 3 extension chain (3 stacked extensions, 5-ADM-09 P1.3.3b wire-in
// 2026-05-22 superseded the prior 2-layer order locked at AUDIT-011 Phase b/c
// §8.6 on 2026-05-07; Q-5ADM-B Path (c) defense-in-depth axes):
//   1. tenant guard (AUDIT-011 Phase b/c, 2026-05-07): rejects on structural
//      absence of hospitalId BEFORE downstream layers; PHI plaintext never
//      touched on rejected queries; sister to AUDIT-013 fail-closed pattern.
//   2. BAA guard (5-ADM-09 P1.3.3b, 2026-05-22): cached Hospital.baaExecuted
//      lookup rejects PHI flow for hospitals without executed BAA per HIPAA
//      §164.308(b)(1); HIPAA-grade audit emission on violation.
//   3. PHI encryption (AUDIT-016): field-level AES-256-GCM applied last so
//      encryption work is never wasted on rejected queries.
//
// Wrapper-call order (outermost to innermost; Prisma `$extends` semantics):
//   caller -> tenant guard -> BAA guard -> PHI encryption -> Prisma engine -> DB
//
// Cross-references:
//   - docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md §8.6
//   - backend/src/lib/prismaTenantGuard.ts (Layer 3 tenant guard)
//   - backend/src/lib/prismaBaaGuard.ts (Layer 3 BAA guard; 5-ADM-09 P1.3.3b)
//   - backend/src/middleware/phiEncryption.ts (PHI encryption)
const baseClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Tenant guard first - structural multi-tenancy backstop (AUDIT-011 Phase b/c).
// BAA guard second - cached Hospital.baaExecuted gate (5-ADM-09 P1.3.3b).
// PHI encryption third - field-level AES-256-GCM (AUDIT-016).
//
// Type-erasure cast at the wire-in boundary (11th §17.1 architectural-
// precedent of the 3-day arc, 2026-05-07): `applyPrismaTenantGuard` +
// `applyPHIEncryption` return `ReturnType<TClient['$extends']>` which
// resolves to `DynamicClientExtensionThis<...>` — structurally narrower
// than `PrismaClient` (loses concrete model-accessor inference for the
// 50 downstream consumers). At runtime the extended client retains every
// PrismaClient method ($transaction, $disconnect, $queryRaw, $executeRaw,
// model accessors, etc.) because $extends adds capability, never removes
// the base shape. The cast preserves downstream typing
// (`import prisma from '../lib/prisma'` continues to type as
// PrismaClient) without changing any runtime semantics. Future tightening
// (typed alias mirroring extended client's true shape) is a follow-up
// engineering tightening.
//
// Discovery: Phase A inventory (PAUSE 1) enumerated 50 downstream
// consumers + 16 PrismaClient type imports + $transaction/$disconnect/
// $queryRaw callsites — but didn't anticipate that the generic
// `<TClient extends PrismaClient>` return type would resolve to
// "unknown" model accessors at downstream import sites. Phase C Step 3
// TS verification caught it. Sister to 9th + 10th precedents (Layer 3
// scope/axis reframings caught at design time); 11th catches a
// type-inference gap caught at integration time.
const tenantGuarded = applyPrismaTenantGuard(baseClient) as unknown as PrismaClient;
// 5-ADM-09 P1.3.3b wire-in (Q-5ADM-B Path (c) Layer 3 PHI-flow-gating).
// Chain order: tenant guard (cheapest structural reject) -> BAA guard
// (cached Hospital.baaExecuted lookup, HIPAA §164.308(b)(1)) -> encryption
// (most expensive, never wasted on rejected queries). Sister precedent
// AUDIT-011 prismaTenantGuard wire-in + prismaBaaGuard.ts lines 340-344
// defense-in-depth axes.
const baaGuarded = applyPrismaBaaGuard(tenantGuarded) as unknown as PrismaClient;
const phiEncrypted = applyPHIEncryption(baaGuarded) as unknown as PrismaClient;
// 4-APM-01: X-Ray tracing applied OUTERMOST so each per-operation subsegment
// spans the full Prisma call (tenant guard + BAA guard + PHI encryption +
// engine + DB round trip). Subsegments carry model + operation name only; no
// SQL, no args, no PHI. No-op unless XRAY_ENABLED=true.
const prisma = applyPrismaTracing(phiEncrypted) as unknown as PrismaClient;

export default prisma;
