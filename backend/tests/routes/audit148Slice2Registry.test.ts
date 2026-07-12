/**
 * AUDIT-148 Slice 2 - registry-case READ endpoint + RegistryCase model structural guards.
 *
 * Source-level + schema-level guards (the codebase's established DB-touching-under-WSL style, matching
 * trials.test.ts): lock the tenant-isolation, read-only, and schema-contract invariants now; a full
 * supertest+DB round-trip runs on CI where prisma db push materializes registry_cases.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROUTE = fs.readFileSync(path.join(__dirname, '../../src/routes/registry.ts'), 'utf8');
const SCHEMA = fs.readFileSync(path.join(__dirname, '../../prisma/schema.prisma'), 'utf8');
const SERVER = fs.readFileSync(path.join(__dirname, '../../src/server.ts'), 'utf8');
const WIPE = fs.readFileSync(path.join(__dirname, '../../scripts/wipePreReseed.ts'), 'utf8');
const MIG = fs.readFileSync(
  path.join(__dirname, '../../prisma/migrations/20260710000000_audit_148_slice2_registry_cases/migration.sql'), 'utf8');

describe('AUDIT-148 Slice 2 registry route: tenant isolation from the JWT', () => {
  it('hospitalId is taken from the verified JWT (req.user.hospitalId), NEVER params/body', () => {
    expect(ROUTE).toMatch(/req\.user!?\.hospitalId/);
    expect(ROUTE).not.toMatch(/req\.body\.hospitalId/);
    expect(ROUTE).not.toMatch(/req\.params\.hospitalId/);
  });
  it('the case query is tenant-scoped (where hospitalId) - another tenant is never returned', () => {
    expect(ROUTE).toMatch(/prisma\.registryCase\.findMany\(\{\s*where:\s*\{\s*hospitalId/);
  });
  it('requires auth + MFA + an allowed role', () => {
    expect(ROUTE).toMatch(/authenticateToken/);
    expect(ROUTE).toMatch(/requireMFA/);
    expect(ROUTE).toMatch(/authorizeRole/);
  });
});

describe('AUDIT-148 Slice 2 registry route: READ-ONLY (mutations are Slice 3)', () => {
  it('exposes only a GET; no POST/PATCH/PUT/DELETE in Slice 2', () => {
    expect(ROUTE).toMatch(/router\.get\(/);
    expect(ROUTE).not.toMatch(/router\.(post|patch|put|delete)\(/);
  });
  it('logs counts only, never PHI', () => {
    const logLines = ROUTE.split('\n').filter(l => /logger\.(info|error|warn)/.test(l));
    for (const l of logLines) expect(l).not.toMatch(/firstName|lastName|\.mrn/);
  });
  it('is mounted at /api/registry in server.ts', () => {
    expect(SERVER).toMatch(/app\.use\(['"]\/api\/registry['"]/);
  });
});

describe('AUDIT-148 Slice 2 RegistryCase schema contract (persists + round-trips the frontend shape)', () => {
  it('model RegistryCase exists with the frontend contract fields', () => {
    const m = SCHEMA.match(/model RegistryCase \{[\s\S]*?\n\}/);
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).toMatch(/patientId\s+String/);
    expect(body).toMatch(/hospitalId\s+String/);
    expect(body).toMatch(/registryType\s+String/);
    expect(body).toMatch(/status\s+RegistryCaseStatus\s+@default\(DRAFT\)/);
    expect(body).toMatch(/fields\s+Json/);
    expect(body).toMatch(/@@unique\(\[patientId, registryType, hospitalId\]\)/);
    expect(body).toMatch(/@@map\("registry_cases"\)/);
  });
  it('RegistryCaseStatus enum has the DRAFT->SUBMITTED->APPROVED (+REJECTED) workflow', () => {
    expect(SCHEMA).toMatch(/enum RegistryCaseStatus \{[\s\S]*?DRAFT[\s\S]*?SUBMITTED[\s\S]*?APPROVED[\s\S]*?REJECTED[\s\S]*?\}/);
  });
  it('patient + hospital FKs are onDelete: Restrict (why it must be wiped before patient)', () => {
    const body = SCHEMA.match(/model RegistryCase \{[\s\S]*?\n\}/)![0];
    expect((body.match(/onDelete: Restrict/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('AUDIT-148 Slice 2 migration + wipe order', () => {
  it('migration creates registry_cases with the enum + both FKs + the unique index', () => {
    expect(MIG).toMatch(/CREATE TYPE "RegistryCaseStatus"/);
    expect(MIG).toMatch(/CREATE TABLE "registry_cases"/);
    expect(MIG).toMatch(/registry_cases_patientId_fkey[\s\S]*ON DELETE RESTRICT/);
    expect(MIG).toMatch(/registry_cases_hospitalId_fkey[\s\S]*ON DELETE RESTRICT/);
    expect(MIG).toMatch(/CREATE UNIQUE INDEX "registry_cases_patientId_registryType_hospitalId_key"/);
    expect(MIG).not.toMatch(/CONCURRENTLY/); // AUDIT-024 transaction-block lesson
  });
  it('registryCase is in the wipePreReseed CHILD_TABLES (before patient, patient-FK Restrict)', () => {
    expect(WIPE).toMatch(/"registryCase"/);
    const childIdx = WIPE.indexOf('"registryCase"');
    const patientLast = WIPE.indexOf('WIPE_ORDER = [...CHILD_TABLES, "patient"]');
    expect(childIdx).toBeGreaterThan(-1);
    expect(patientLast).toBeGreaterThan(childIdx); // registryCase declared in CHILD_TABLES, patient appended last
  });
});
