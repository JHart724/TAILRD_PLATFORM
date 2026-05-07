import { PrismaClient } from '@prisma/client';
import { applyPrismaTenantGuard } from './prismaTenantGuard';
import { applyPHIEncryption } from '../middleware/phiEncryption';

// Shared Prisma client — single instance for the entire backend.
// Avoids connection pool exhaustion from multiple `new PrismaClient()` calls.
//
// 2026-05-07 wire-in (AUDIT-011 Phase b/c §8.6 locked extension order):
//   Layer 3 (tenant guard) registers FIRST → encryption SECOND.
//   - Tenant violations throw / log BEFORE encryption runs (PHI plaintext
//     never touched on rejected queries; defense-in-depth posture).
//   - Encryption work not wasted on tenant-violating queries.
//   - Sister to AUDIT-013 fail-closed pattern (gate before action;
//     structural rejection before content processing).
//
// Wrapper-call order (outermost → innermost — Prisma `$extends` semantics):
//   caller → Layer 3 (tenant guard) → encryption → Prisma engine → DB
//
// Cross-references:
//   - docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md §8.6
//   - backend/src/lib/prismaTenantGuard.ts (Layer 3 extension)
//   - backend/src/middleware/phiEncryption.ts (encryption extension)
const baseClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Layer 3 first — structural multi-tenancy backstop (AUDIT-011 Phase b/c).
// Encryption second — PHI field-level AES-256-GCM (AUDIT-016).
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
const prisma = applyPHIEncryption(tenantGuarded) as unknown as PrismaClient;

export default prisma;
